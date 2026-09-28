import { BASES,POINTS,heightAt,blocked,lineOfSight,coverAt,inside } from './map';
import { Navigation,SpatialGrid } from './navigation';
import { Team,Role,Squad,Soldier,Objective,BattleEvent,Vec,ROLE,Stats,clamp,distance,angleDelta,randomGenerator,Order } from './types';

export class Simulation {
 readonly squads:Squad[]=[]; readonly soldiers:Soldier[]=[]; readonly points:Objective[]=POINTS.map((p,id)=>({...p,id,owner:-1,progress:0,capturing:-1,contested:false}));
 readonly nav=new Navigation(); readonly vehicleNav=new Navigation(true); readonly grid=new SpatialGrid<Soldier>();
 readonly stats:Stats[]=[{lost:0,kills:0,captured:0,reinforced:0},{lost:0,kills:0,captured:0,reinforced:0}];
 tickets=[500,500]; time=0; duration=420; phase:'intro'|'playing'|'ended'='intro'; winner:Team|-1=-1;
 events:BattleEvent[]=[]; commanderTime=0; random:()=>number; aiPlayer=false; selected:number[]=[]; totalShots=0;
 constructor(seed=912,totalCombatants=62){this.random=randomGenerator(seed);for(let t=0;t<2;t++){if(totalCombatants===62)(['rifle','assault','mg','at','rifle','vehicle'] as Role[]).forEach((role,i)=>this.addSquad(t as Team,role,i));else{let remaining=Math.floor(totalCombatants/2)-1,i=0;while(remaining>0){const n=Math.min(6,remaining);this.addSquad(t as Team,(['rifle','assault','mg','at'] as Role[])[i%4],i,n,true);remaining-=n;i++;}this.addSquad(t as Team,'vehicle',i,1,true);}}this.grid.rebuild(this.soldiers);}
 private addSquad(team:Team,role:Role,i:number,count=6,benchmark=false){
  const base=BASES[team],dir=team===0?1:-1,x=role==='vehicle'?17:benchmark?-24+(i%7)*8:(i-2)*7,z=benchmark?dir*(-22+Math.floor(i/7)*3.3):base.z+(role==='vehicle'?-2:1)*dir+(team===0?7:0),id=this.squads.length;
  const names=['صقر','برق','حصن','رمح','رمل','رِمال'];
  const q:Squad={id,team,role,name:names[i%6],x,z,goal:{x,z},members:[],order:'hold',state:'idle',path:[],waypoint:0,angle:team===0?0:Math.PI,turret:team===0?0:Math.PI,speed:0,target:-1,captureTarget:-1,suppression:0,ability:0,dead:false,respawn:0,healTime:0,routeTime:0};
  this.squads.push(q);const n=role==='vehicle'?1:count;
  for(let j=0;j<n;j++){const sid=this.soldiers.length;q.members.push(sid);this.soldiers.push({id:sid,squad:id,team,slot:j,x:x+(j%3-1)*1.25,z:z-Math.floor(j/3)*1.3*dir,hp:ROLE[role].hp,maxHp:ROLE[role].hp,angle:q.angle,speed:0,phase:this.random()*6.28,cooldown:this.random()*1.3,firing:0,hit:0,deadTime:0,suppression:0,ammo:role==='mg'?28:role==='at'&&j===0?1:12,reload:0});}
 }
 start(){this.phase='playing';this.commanderTime=5;this.events.push({type:'order',x:0,z:-32,team:0,value:0});}
 living(q:Squad){return q.members.map(i=>this.soldiers[i]).filter(s=>s.hp>0);}
 strength(q:Squad){return q.members.reduce((n,i)=>n+Math.max(0,this.soldiers[i].hp),0)/(ROLE[q.role].hp*q.members.length);}
 visible(q:Squad){return q.team===0||this.squads.some(f=>f.team===0&&!f.dead&&distance(f,q)<36);}
 issue(ids:number[],order:Order,target?:Vec,targetId=-1){
  ids.forEach((id,k)=>{const q=this.squads[id];if(!q||q.dead)return;
   q.order=order;q.target=targetId;q.captureTarget=-1;q.healTime=0;
   let goal=target?inside(target):{x:q.x,z:q.z};
   if(order==='retreat'){goal={x:BASES[q.team].x+(q.id%5-2)*3,z:BASES[q.team].z};q.state='retreat';}
   else if(order==='hold'){goal={x:q.x,z:q.z};q.state='defend';}
   else if(order==='capture'){const point=this.points.reduce((best,p)=>distance(p,goal)<distance(best,goal)?p:best);q.captureTarget=point.id;goal={x:point.x+(k%3-1)*2,z:point.z+Math.floor(k/3)*2};q.state='capture';}
   else{q.state=order==='attack'?'attack':'move';if(ids.length>1){goal.x+=(k%3-1)*4;goal.z+=Math.floor(k/3)*4;}}
   q.goal=goal;q.path=order==='hold'?[]:(q.role==='vehicle'?this.vehicleNav:this.nav).path(q,goal);q.waypoint=0;q.routeTime=this.time;
  });
 }
 ability(ids:number[]){for(const id of ids){const q=this.squads[id];if(!q||q.dead||q.ability>0)continue;q.ability=35;q.suppression=Math.max(0,q.suppression-.65);for(const s of this.living(q)){s.suppression=0;}this.events.push({type:'order',x:q.x,z:q.z,team:q.team,value:1});}}
 commander(team:Team){
  const own=this.squads.filter(q=>q.team===team&&!q.dead),enemy=this.squads.filter(q=>q.team!==team&&!q.dead);
  for(const q of own){
   if(q.order==='retreat')continue;
   const str=this.strength(q);
   if(str<.28||(q.suppression>.8&&str<.6)){this.issue([q.id],'retreat');continue;}
   if(this.time-q.routeTime<4.5&&q.path.length>q.waypoint)continue;
   let best=this.points[0],score=-1e9;
   for(const p of this.points){
    const threats=enemy.filter(e=>distance(e,p)<23&&own.some(f=>distance(f,e)<36)),friends=own.filter(e=>e.id!==q.id&&e.captureTarget===p.id).length;
    let value=(p.owner===team?16:44)+(p.contested?18:0)-distance(q,p)*.45-friends*19;
    if(p.owner===team&&threats.length)value+=28;
    if(q.role==='mg')value+=(p.owner===team?8:0)+(p.id===1?4:0);
    if(q.role==='vehicle')value+=threats.length*13-(p.owner===team?0:9);
    if(q.role==='at'&&threats.some(e=>e.role==='vehicle'))value+=35;
    // The less defended flank becomes useful; there is no hidden information about distant units.
    if(threats.filter(e=>distance(q,e)<35).length>2&&str<.7)value-=17;
    value+=Math.sin(q.id*7+p.id*2+Math.floor(this.time/25))*.7;
    if(value>score){score=value;best=p;}
   }
   if(q.captureTarget!==best.id||distance(q,best)>9){this.issue([q.id],'capture',best);}
   else if(distance(q,best)<7)q.state=q.target>=0?'attack':'defend';
  }
 }
 update(dt:number){
  if(this.phase!=='playing')return;this.time+=dt;this.commanderTime-=dt;
  if(this.commanderTime<=0){this.commanderTime=1.4;this.commander(1);if(this.aiPlayer)this.commander(0);}
  this.grid.rebuild(this.soldiers.filter(s=>s.hp>0));
  for(const q of this.squads)this.updateSquad(q,dt);
  for(const s of this.soldiers)this.updateSoldier(s,dt);
  this.updatePoints(dt);
  const own=this.points.filter(p=>p.owner===0).length,enemy=this.points.filter(p=>p.owner===1).length;
  if(own>=2)this.tickets[1]-=dt*(own===3?1.75:1.15);
  if(enemy>=2)this.tickets[0]-=dt*(enemy===3?1.75:1.15);
  if(this.time>=this.duration||this.tickets.some(t=>t<=0)){
   this.tickets=this.tickets.map(t=>Math.max(0,t));this.phase='ended';this.winner=Math.abs(this.tickets[0]-this.tickets[1])<.5?-1:this.tickets[0]>this.tickets[1]?0:1;
   this.events.push({type:'end',x:0,z:0,team:this.winner===1?1:0});
  }
 }
 private updateSquad(q:Squad,dt:number){
  q.ability=Math.max(0,q.ability-dt);q.suppression=Math.max(0,q.suppression-dt*.06);
  const live=this.living(q);
  if(!live.length){
   if(!q.dead){q.dead=true;q.respawn=this.time+32;q.speed=0;this.tickets[q.team]-=q.role==='vehicle'?12:3;}
   if(this.time>q.respawn&&this.time<this.duration-30){this.respawn(q);}
   return;
  }
  if(q.order==='retreat'&&distance(q,BASES[q.team])<9){
   q.path=[];q.state='regroup';q.healTime+=dt;
   for(const s of live)s.hp=Math.min(s.maxHp,s.hp+dt*16);
   if(q.healTime>8){for(const i of q.members){const s=this.soldiers[i];if(s.hp<=0){s.hp=s.maxHp;s.x=q.x+(s.slot%3-1)*1.4;s.z=q.z;s.deadTime=0;}}q.suppression=0;this.issue([q.id],'hold');}
  }
  if(q.order==='attack'&&q.target>=0){const target=this.squads[q.target];if(!target||target.dead){this.issue([q.id],'hold');}else if(distance(q,target)>ROLE[q.role].range*.8&&this.time-q.routeTime>2){q.goal={x:target.x,z:target.z};q.path=(q.role==='vehicle'?this.vehicleNav:this.nav).path(q,q.goal);q.waypoint=0;q.routeTime=this.time;}}
  let wantsMove=q.waypoint<q.path.length;
  if(q.order==='attack'&&q.target>=0&&distance(q,this.squads[q.target])<ROLE[q.role].range*.8)wantsMove=false;
  const targetSpeed=wantsMove?ROLE[q.role].speed*(q.order==='retreat'?1.2:1)*(q.suppression>.7?.65:1):0;
  q.speed+=(targetSpeed-q.speed)*Math.min(1,dt*(q.role==='vehicle'?1.1:7));
  if(wantsMove){
   const p=q.path[q.waypoint],d=distance(q,p),a=Math.atan2(p.x-q.x,p.z-q.z);q.angle+=angleDelta(q.angle,a)*Math.min(1,dt*(q.role==='vehicle'?2.3:8));
   const slope=Math.abs(heightAt(q.x,q.z)-heightAt(p.x,p.z))/Math.max(1,d),step=Math.min(d,q.speed*dt/(1+slope*1.1));
   q.x+=Math.sin(a)*step;q.z+=Math.cos(a)*step;if(d<.55)q.waypoint++;
  }else if(q.state==='move')q.state='idle';
  const enemies=this.squads.filter(t=>t.team!==q.team&&!t.dead&&distance(q,t)<ROLE[q.role].range+6&&lineOfSight(q,t));
  if(q.order!=='attack'||q.target<0||this.squads[q.target]?.dead){
   enemies.sort((a,b)=>{const score=(t:Squad)=>distance(q,t)+(q.role==='at'?(t.role==='vehicle'?-22:8):(t.role==='vehicle'?7:0));return score(a)-score(b);});
   q.target=enemies[0]?.id??-1;
  }
  if(q.target>=0){const target=this.squads[q.target];const a=Math.atan2(target.x-q.x,target.z-q.z);q.turret+=angleDelta(q.turret,a)*Math.min(1,dt*3);if(!wantsMove&&q.order!=='retreat'){q.angle+=angleDelta(q.angle,a)*Math.min(1,dt*3);q.state='attack';}}
  else q.turret+=angleDelta(q.turret,q.angle)*Math.min(1,dt*2);
 }
 private updateSoldier(s:Soldier,dt:number){
  const q=this.squads[s.squad],info=ROLE[q.role];s.firing=Math.max(0,s.firing-dt);s.hit=Math.max(0,s.hit-dt);s.suppression=Math.max(0,s.suppression-dt*.1);
  if(s.hp<=0){s.deadTime+=dt;s.speed=0;return;}
  if(q.role==='vehicle'){s.x=q.x;s.z=q.z;s.angle=q.angle;s.speed=q.speed;}
  else{
   const moving=q.speed>.5,combat=q.target>=0&&!moving;
   const narrow=blocked(q.x+Math.cos(q.angle)*2.5,q.z-Math.sin(q.angle)*2.5)||blocked(q.x-Math.cos(q.angle)*2.5,q.z+Math.sin(q.angle)*2.5);
   const side=narrow?((s.slot%2)-.5)*.85:combat?(s.slot-2.5)*1.1:(s.slot%3-1)*1.45;
   const back=narrow?Math.floor(s.slot/2)*-1.45:combat?Math.sin(s.slot*3.1)*.5:-Math.floor(s.slot/3)*1.55;
   let gx=q.x+Math.cos(q.angle)*side+Math.sin(q.angle)*back,gz=q.z-Math.sin(q.angle)*side+Math.cos(q.angle)*back;
   if(blocked(gx,gz)){gx=q.x;gz=q.z;}
   let dx=gx-s.x,dz=gz-s.z;
   for(const other of this.grid.query(s,1.5)){if(other.id===s.id)continue;const ox=s.x-other.x,oz=s.z-other.z,d=Math.hypot(ox,oz);if(d>.01&&d<1.1){dx+=ox/d*(1.1-d)*2;dz+=oz/d*(1.1-d)*2;}}
   const d=Math.hypot(dx,dz),speed=Math.min(info.speed*1.35,d*3),step=Math.min(d,speed*dt);
   if(d>.04){const nx=s.x+dx/d*step,nz=s.z+dz/d*step;if(!blocked(nx,nz)){s.x=nx;s.z=nz;}else if(!blocked(nx,s.z))s.x=nx;else if(!blocked(s.x,nz))s.z=nz;s.speed=speed;s.angle+=angleDelta(s.angle,Math.atan2(dx,dz))*Math.min(1,dt*10);}else s.speed=0;
   s.phase+=dt*s.speed*2.6;
  }
  s.cooldown-=dt;if(s.reload>0){s.reload=Math.max(0,s.reload-dt);if(s.reload===0)s.ammo=q.role==='mg'?28:q.role==='at'&&s.slot===0?1:12;return;}if(q.order==='retreat'||q.state==='regroup')return;
  if(q.target<0)return;
  const enemy=this.squads[q.target];if(!enemy||enemy.dead)return;
  let candidates=this.living(enemy);if(!candidates.length)return;
  const target=candidates[(s.id+Math.floor(this.time*.2))%candidates.length],d=distance(s,target);
  if(d>info.range||!lineOfSight(s,target))return;
  const aim=Math.atan2(target.x-s.x,target.z-s.z);if(q.role!=='vehicle')s.angle+=angleDelta(s.angle,aim)*Math.min(1,dt*12);
  if(s.cooldown>0)return;
  const rocket=q.role==='at'&&s.slot===0;
  s.cooldown=(rocket?5.5:info.interval)*(1+q.suppression*.7)*(s.speed>1?1.3:1)*(q.ability>30?.75:1)*(.85+this.random()*.3);s.firing=rocket?.32:.13;s.ammo--;if(s.ammo<=0)s.reload=rocket?3.2:q.role==='mg'?3:2.1;this.totalShots++;
  const enemyVehicle=enemy.role==='vehicle',highGround=heightAt(s.x,s.z)-heightAt(target.x,target.z)>.8;
  const cover=coverAt(target,s),flank=Math.abs(angleDelta(enemy.angle,Math.atan2(s.x-enemy.x,s.z-enemy.z)))>1.5;
  const accuracy=clamp(.84-d/info.range*.28+Number(highGround)*.12-(s.speed>1?.2:0)-q.suppression*.25,.15,.95);
  let damage=rocket?(enemyVehicle?145:44):info.damage;
  if(enemyVehicle&&!rocket&&q.role!=='vehicle')damage*=.12;
  if(q.role==='vehicle'&&enemyVehicle)damage*=.9;
  damage*=.62*(1-cover);damage*=flank?1.17:1;
  this.events.push({type:'shot',x:s.x,z:s.z,tx:target.x,tz:target.z,team:s.team,role:rocket?'at':q.role,damage});
  enemy.suppression=clamp(enemy.suppression+(q.role==='mg'?.055:.018),0,1);
  if(this.random()<accuracy){target.hp-=damage;target.hit=.18;this.events.push({type:'impact',x:target.x,z:target.z,team:target.team,role:rocket?'at':q.role,damage});if(target.hp<=0)this.kill(target,q.team);}
  if(rocket||q.role==='vehicle')for(const other of this.grid.query(target,rocket?3:1.8)){if(other.team!==s.team&&other.id!==target.id&&other.hp>0){other.hp-=damage*.12;if(other.hp<=0)this.kill(other,q.team);}}
 }
 private kill(s:Soldier,killer:Team){s.hp=0;s.deadTime=0;this.stats[s.team].lost++;this.stats[killer].kills++;this.tickets[s.team]-=this.squads[s.squad].role==='vehicle'?7:1;this.events.push({type:'death',x:s.x,z:s.z,team:s.team,role:this.squads[s.squad].role});}
 private respawn(q:Squad){
  const base=BASES[q.team];q.x=base.x+(q.id%5-2)*3;q.z=base.z;q.dead=false;q.suppression=0;q.target=-1;q.speed=0;q.path=[];
  for(const i of q.members){const s=this.soldiers[i];s.hp=s.maxHp;s.x=q.x+(s.slot%3-1)*1.2;s.z=q.z-Math.floor(s.slot/3);s.deadTime=0;s.cooldown=1;s.reload=0;s.ammo=q.role==='mg'?28:q.role==='at'&&s.slot===0?1:12;}
  this.tickets[q.team]-=8;this.stats[q.team].reinforced++;this.issue([q.id],'hold');this.events.push({type:'reinforce',x:q.x,z:q.z,team:q.team,role:q.role});
 }
 private updatePoints(dt:number){
  for(const p of this.points){
   const counts=[0,0];for(const s of this.grid.query(p,6.7)){const q=this.squads[s.squad];if(q.role!=='vehicle'&&q.order!=='retreat'&&s.hp>0)counts[s.team]++;}
   p.contested=counts[0]>0&&counts[1]>0;
   if(p.contested){p.capturing=-1;continue;}
   const team:Team|-1=counts[0]?0:counts[1]?1:-1;p.capturing=team;
   if(team<0){if(p.owner===-1)p.progress=Math.max(0,p.progress-dt*.01);continue;}
   if(p.owner===team){p.progress=Math.min(1,p.progress+dt*.1);continue;}
   const rate=dt*.047*Math.min(1.6,.75+counts[team]/8);
   if(p.owner!==-1){p.progress-=rate;if(p.progress<=0){p.owner=-1;p.progress=0;}}
   else{p.progress+=rate;if(p.progress>=1){p.owner=team;p.progress=1;this.stats[team].captured++;this.events.push({type:'capture',x:p.x,z:p.z,team:team as Team,value:p.id});}}
  }
 }
 snapshot(){return{phase:this.phase,time:Math.round(this.time),remaining:Math.max(0,Math.ceil(this.duration-this.time)),tickets:this.tickets.map(Math.ceil),winner:this.winner,points:this.points.map(p=>({id:p.id,name:p.name,owner:p.owner,progress:+p.progress.toFixed(2),contested:p.contested})),squads:this.squads.filter(q=>this.visible(q)).map(q=>({id:q.id,team:q.team,role:q.role,name:q.name,x:+q.x.toFixed(1),z:+q.z.toFixed(1),alive:this.living(q).length,strength:+this.strength(q).toFixed(2),order:q.order,state:q.state,dead:q.dead})),stats:this.stats};}
}
