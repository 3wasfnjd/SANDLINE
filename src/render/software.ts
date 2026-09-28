import {Scene,Mesh,LinesMesh,VertexBuffer,Vector3,Matrix,Color3,StandardMaterial,NullEngine} from './babylon';
import {Simulation} from '../core/simulation';
import {heightAt} from '../core/map';
import {Effects} from './effects';
import {Weather} from './weather';
import {NIGHT_LAMPS} from './night';

const groundDetail=(name:string)=>['road shoulder','compacted earth','old tire impressions','spring water','village paving','garden furrow'].includes(name);

// A compatibility renderer for browsers where graphics acceleration is disabled.
// It projects the actual Babylon environment geometry onto Canvas2D. Gameplay,
// camera, map, input and AI remain identical to the WebGL2/WebGPU game.
export class CompatibilityEngine extends NullEngine{
 constructor(){super({renderWidth:window.innerWidth,renderHeight:window.innerHeight,textureSize:512,deterministicLockstep:false,lockstepMaxSteps:4});}
 override getRenderWidth(){return window.innerWidth;}
 override getRenderHeight(){return window.innerHeight;}
}
interface Face{points:number[];depth:number;color:string;ground:boolean;shadow:number[]|null}
interface Geometry{p:number[];i:number[];c:number[]|null;matrix:Matrix;color:Color3;name:string}
export class SoftwareRenderer{
 private context:CanvasRenderingContext2D;private cached=document.createElement('canvas');private cacheCtx:CanvasRenderingContext2D;private geometry:Geometry[]=[];private lastView='';private width=0;private height=0;private transform=Matrix.Identity();private dynamic:Face[]=[];
 constructor(private scene:Scene,private canvas:HTMLCanvasElement,meshes:Mesh[]){
  this.context=canvas.getContext('2d',{alpha:false})!;this.cacheCtx=this.cached.getContext('2d',{alpha:false})!;
  for(const mesh of meshes){if(mesh.name==='night light pools'||mesh instanceof LinesMesh||mesh.name.includes('control zone')||mesh.name.includes('capture banner'))continue;const p=mesh.getVerticesData(VertexBuffer.PositionKind),i=mesh.getIndices();if(!p||!i)continue;const mat=mesh.material as StandardMaterial;this.geometry.push({p:Array.from(p),i:Array.from(i),c:mesh.getVerticesData(VertexBuffer.ColorKind) as number[]|null,matrix:mesh.computeWorldMatrix(true).clone(),color:mat?.diffuseColor??Color3.White(),name:mesh.name});}
 }
 private project(x:number,y:number,z:number){const m=this.transform.m,rw=1/(x*m[3]+y*m[7]+z*m[11]+m[15]);return[(x*m[0]+y*m[4]+z*m[8]+m[12])*rw*this.width/2+this.width/2,(-(x*m[1]+y*m[5]+z*m[9]+m[13])*rw+1)*this.height/2,(x*m[2]+y*m[6]+z*m[10]+m[14])*rw];}
 private color(r:number,g:number,b:number,shade:number){const f=(v:number)=>Math.round(Math.min(255,Math.max(0,Math.pow(v*shade,.82)*255)));return`rgb(${f(r)},${f(g)},${f(b)})`;}
 private prepare(g:Geometry){
  const vertices:number[][]=[],projected:number[][]=[];for(let j=0;j<g.p.length;j+=3){const v=Vector3.TransformCoordinates(new Vector3(g.p[j],g.p[j+1],g.p[j+2]),g.matrix);vertices.push([v.x,v.y,v.z]);projected.push(this.project(v.x,v.y,v.z));}
  const result:Face[]=[];for(let j=0;j<g.i.length;j+=3){const ia=g.i[j],ib=g.i[j+1],ic=g.i[j+2],a=projected[ia],b=projected[ib],c=projected[ic];if((a[0]<-50&&b[0]<-50&&c[0]<-50)||(a[0]>this.width+50&&b[0]>this.width+50&&c[0]>this.width+50)||(a[1]<-50&&b[1]<-50&&c[1]<-50)||(a[1]>this.height+50&&b[1]>this.height+50&&c[1]>this.height+50))continue;
   const pa=vertices[ia],pb=vertices[ib],pc=vertices[ic],ux=pb[0]-pa[0],uy=pb[1]-pa[1],uz=pb[2]-pa[2],vx=pc[0]-pa[0],vy=pc[1]-pa[1],vz=pc[2]-pa[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;if(ny<0){nx=-nx;ny=-ny;nz=-nz;}
   const light=.58+.5*Math.max(0,nx*.5+ny*.77-nz*.38);let r=g.color.r,gg=g.color.g,bb=g.color.b;if(g.c){r*=(g.c[ia*4]+g.c[ib*4]+g.c[ic*4])/3;gg*=(g.c[ia*4+1]+g.c[ib*4+1]+g.c[ic*4+1])/3;bb*=(g.c[ia*4+2]+g.c[ib*4+2]+g.c[ic*4+2])/3;}
   const ground=g.name==='desert-terrain'||groundDetail(g.name);let shadow:number[]|null=null;
   if(!ground&&j%3===0&&Math.max(...[pa,pb,pc].map(p=>p[1]-heightAt(p[0],p[2])))>1.4){shadow=[];for(const v of [pa,pb,pc]){const h=Math.max(0,v[1]-heightAt(v[0],v[2])),x=v[0]-.65*h,z=v[2]+.5*h,pr=this.project(x,heightAt(x,z)+.1,z);shadow.push(pr[0],pr[1]);}}
   result.push({points:[a[0],a[1],b[0],b[1],c[0],c[1]],depth:(a[2]+b[2]+c[2])/3,color:this.color(r,gg,bb,light),ground,shadow});}
  return result;
 }
 private polygon(ctx:CanvasRenderingContext2D,p:number[]){ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();}
 private drawFaces(ctx:CanvasRenderingContext2D,faces:Face[],stroke=false){faces.sort((a,b)=>b.depth-a.depth);for(const face of faces){ctx.fillStyle=face.color;ctx.beginPath();this.polygon(ctx,face.points);ctx.fill();if(stroke){ctx.strokeStyle=face.color;ctx.lineWidth=.55;ctx.stroke();}}}
 private cache(){
  const prepared=this.geometry.map(g=>({g,faces:this.prepare(g)})),faces=prepared.flatMap(p=>p.faces);const ctx=this.cacheCtx;ctx.fillStyle='#101e30';ctx.fillRect(0,0,this.width,this.height);
  for(const p of prepared.filter(p=>p.g.name==='desert-terrain'))this.drawFaces(ctx,p.faces,true);
  for(const p of prepared.filter(p=>groundDetail(p.g.name)))this.drawFaces(ctx,p.faces,true);
  ctx.beginPath();for(const f of faces)if(f.shadow)this.polygon(ctx,f.shadow);ctx.fillStyle='rgba(4,10,22,.38)';ctx.fill();this.drawFaces(ctx,faces.filter(f=>!f.ground),true);
  const vignette=ctx.createRadialGradient(this.width*.5,this.height*.48,this.width*.14,this.width*.5,this.height*.5,this.width*.8);vignette.addColorStop(0,'rgba(4,10,23,0)');vignette.addColorStop(1,'rgba(4,10,23,.32)');ctx.fillStyle=vignette;ctx.fillRect(0,0,this.width,this.height);
 }
 private box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,pitch=0){
  const corners:number[][]=[];for(let i=0;i<8;i++){let lx=(i&1?w:-w)/2,ly=(i&2?h:-h)/2,lz=(i&4?d:-d)/2;const cy=ly*Math.cos(pitch)-lz*Math.sin(pitch),cz=ly*Math.sin(pitch)+lz*Math.cos(pitch);corners.push(this.project(x+lx*Math.cos(yaw)+cz*Math.sin(yaw),y+cy,z-lx*Math.sin(yaw)+cz*Math.cos(yaw)));}
  const rgb=Color3.FromHexString(color);for(const [indices,shade] of [[[2,3,7,6],1.12],[[0,1,3,2],.76],[[4,6,7,5],.92],[[1,5,7,3],.91],[[0,2,6,4],.65]] as [number[],number][]){const p=indices.flatMap(i=>corners[i].slice(0,2)),depth=indices.reduce((s,i)=>s+corners[i][2],0)/4;this.dynamic.push({points:p,depth,color:this.color(rgb.r,rgb.g,rgb.b,shade),ground:false,shadow:null});}
 }
 draw(sim:Simulation,effects:Effects,time:number,weather:Weather,environmentTime:number){
  const width=window.innerWidth,height=window.innerHeight,cam=this.scene.activeCamera!;
  this.transform=this.scene.getTransformMatrix();const view=`${Math.round(cam.position.x*6)},${Math.round(cam.position.z*6)},${Math.round(cam.orthoRight!*7)},${width},${height}`;
  if(this.width!==width||this.height!==height){this.width=width;this.height=height;this.canvas.width=this.cached.width=width;this.canvas.height=this.cached.height=height;this.lastView='';}
  if(view!==this.lastView){this.cache();this.lastView=view;}
  const ctx=this.context;ctx.drawImage(this.cached,0,0);this.dynamic=[];
  // The denied-GPU path shares weather timing and uses a bounded screen overlay.
  for(let i=0;i<6;i++){
   const x=((i*27+environmentTime*.6)%155)-77,z=Math.sin(i*2.3)*33,p=this.project(x,0,z),edge=this.project(x+16,0,z),r=Math.abs(edge[0]-p[0]);
   ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,.7);const g=ctx.createRadialGradient(0,0,r*.12,0,0,r);g.addColorStop(0,`rgba(29,63,75,${.10+weather.state.cloud*.09})`);g.addColorStop(1,'rgba(29,63,75,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
  }
  // Soft ground illumination, bounded to the same authored lamps as the GPU path.
  for(const lamp of NIGHT_LAMPS){const p=this.project(lamp.x,heightAt(lamp.x,lamp.z)+.1,lamp.z),edge=this.project(lamp.x+lamp.radius,heightAt(lamp.x,lamp.z),lamp.z),r=Math.abs(edge[0]-p[0]);ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,.65);const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(255,178,87,.27)');g.addColorStop(.4,'rgba(249,156,67,.11)');g.addColorStop(1,'rgba(249,156,67,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}
  for(let j=0;j<3;j++){const r=1+((environmentTime*.15+j*.8)%2),p=this.project(-42,heightAt(-42,-14)+.1,-14),edge=this.project(-42+r,heightAt(-42,-14)+.1,-14);ctx.strokeStyle=`rgba(157,201,241,${.15+Math.sin(environmentTime+j)*.08})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p[0],p[1],Math.abs(edge[0]-p[0]),Math.abs(edge[0]-p[0])*.58,0,0,Math.PI*2);ctx.stroke();}
  for(const p of sim.points){const c=this.project(p.x,heightAt(p.x,p.z)+.12,p.z),edge=this.project(p.x+6.3,heightAt(p.x,p.z)+.12,p.z);ctx.strokeStyle=p.owner===0?'#80c9ff':p.owner===1?'#e29162':'#bccada';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(c[0],c[1],Math.abs(edge[0]-c[0]),Math.abs(edge[0]-c[0])*.76,0,0,Math.PI*2);ctx.stroke();const fy=heightAt(p.x,p.z)+4.3+p.progress*.5;this.box(p.x+1,fy,p.z,2,.95,.05,p.owner===0?'#4f97c9':p.owner===1?'#b16d4a':'#8295ac');}
  for(const s of sim.soldiers){const q=sim.squads[s.squad];if(sim.phase!=='intro'&&!sim.visible(q)||s.hp<=0&&s.deadTime>12)continue;const y=heightAt(s.x,s.z),team=s.team===0?'#568fbf':'#a86d48',cloth='#8795a8',dark='#263340',angle=s.angle;
   const p=this.project(s.x,y+.04,s.z),sx=this.project(s.x+.7,y,s.z);ctx.fillStyle='rgba(42,47,35,.26)';ctx.beginPath();ctx.ellipse(p[0]+2,p[1]+1,Math.max(1,Math.abs(sx[0]-p[0]))*(q.role==='vehicle'?2.5:1),Math.max(1,Math.abs(sx[0]-p[0]))*(q.role==='vehicle'?2:.65),0,0,Math.PI*2);ctx.fill();
   if(q.role==='vehicle'){
    const orient=(xx:number,zz:number)=>({x:s.x+xx*Math.cos(angle)+zz*Math.sin(angle),z:s.z-xx*Math.sin(angle)+zz*Math.cos(angle)});
    this.box(s.x,y+1.13,s.z,2.48,1.2,4.7,s.hp>0?(s.team===0?'#526f8c':'#877365'):'#4d4d3d',angle);const nose=orient(0,1.6);this.box(nose.x,y+1.6,nose.z,2.25,.8,1.5,team,angle,-.18);this.box(s.x,y+2.3,s.z,1.35,.55,1.6,team,q.turret);this.box(s.x+Math.sin(q.turret)*1.75,y+2.44,s.z+Math.cos(q.turret)*1.75,.17,.17,2.8,dark,q.turret);
    for(const xx of [-1.27,1.27])for(const zz of [-1.55,0,1.55]){const a=orient(xx,zz);this.box(a.x,y+.58,a.z,.36,.9,.88,'#363c34',angle);}continue;
   }
   if(s.hp<=0){this.box(s.x,y+.23,s.z,.55,.3,1.5,'#716d50',angle);continue;}
   const step=s.speed>.4?Math.sin(s.phase)*.32:0,bob=s.speed>.4?Math.abs(step)*.08:Math.sin(time*2+s.id)*.012;
   for(const side of [-1,1]){const x=s.x+side*.18*Math.cos(angle),z=s.z-side*.18*Math.sin(angle);this.box(x,y+.43,z,.2,.79,.22,cloth,angle,step*side);this.box(x,y+.11,z+step*side,.23,.19,.34,dark,angle);}
   this.box(s.x,y+1.24+bob,s.z,.62,.65,.4,team,angle);this.box(s.x-Math.sin(angle)*.25,y+1.3,s.z-Math.cos(angle)*.25,.45,.49,.21,'#536374',angle);this.box(s.x,y+1.78+bob,s.z,.29,.3,.28,'#b79168',angle);this.box(s.x,y+1.97+bob,s.z,.4,.22,.38,'#617993',angle);
   for(const side of [-1,1]){const x=s.x+side*.36*Math.cos(angle),z=s.z-side*.36*Math.sin(angle);this.box(x,y+1.33+bob,z,.2,.42,.24,team,angle,q.target>=0?-1.2:-.4);}
   const gun=q.role==='at'&&s.slot===0,mg=q.role==='mg'&&s.slot<2;this.box(s.x+Math.sin(angle)*.51,y+1.31+bob,s.z+Math.cos(angle)*.51,gun?.2:.09,gun?.2:.11,gun?1.5:mg?1.3:.95,dark,angle);this.box(s.x+Math.sin(angle)*.2,y+1.15,s.z+Math.cos(angle)*.2,.13,.23,.18,dark,angle);
  }
  this.drawFaces(ctx,this.dynamic);
  for(const id of sim.selected){const q=sim.squads[id];if(q.dead)continue;const p=this.project(q.x,heightAt(q.x,q.z)+.1,q.z),edge=this.project(q.x+3.6,heightAt(q.x,q.z),q.z);ctx.strokeStyle='#b0ddff';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(p[0],p[1],Math.abs(edge[0]-p[0]),Math.abs(edge[0]-p[0])*.75,0,0,6.284);ctx.stroke();}
  for(const t of effects.tracers){const a=this.project(t.a.x,t.a.y,t.a.z),b=this.project(t.b.x,t.b.y,t.b.z),pct=1-t.life/t.max;ctx.strokeStyle=t.team===0?'#fff0b6':'#ffd286';ctx.lineWidth=t.rocket?2.6:1.3;ctx.beginPath();ctx.moveTo(a[0]+(b[0]-a[0])*Math.max(0,pct-.12),a[1]+(b[1]-a[1])*Math.max(0,pct-.12));ctx.lineTo(a[0]+(b[0]-a[0])*pct,a[1]+(b[1]-a[1])*pct);ctx.stroke();}
  for(const f of effects.particles){const p=this.project(f.x,f.y,f.z),edge=this.project(f.x+f.size/2,f.y,f.z),size=Math.max(1,Math.abs(edge[0]-p[0])),alpha=Math.min(1,f.life/f.max)*f.color[3];const g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],size);g.addColorStop(0,f.kind?`rgba(255,237,173,${alpha})`:`rgba(132,115,86,${alpha*.6})`);g.addColorStop(1,'rgba(160,134,84,0)');ctx.fillStyle=g;ctx.fillRect(p[0]-size,p[1]-size,size*2,size*2);}
  ctx.fillStyle=`rgba(76,111,123,${weather.state.rain*.055})`;ctx.fillRect(0,0,this.width,this.height);
  ctx.strokeStyle=`rgba(214,234,227,${.22+weather.state.rain*.18})`;ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<weather.activeDrops;i++){const d=weather.drops[i],a=this.project(d.x,d.y,d.z),b=this.project(d.x-weather.state.wind*.26,d.y+.75+weather.state.rain*.85,d.z);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
 }
}
