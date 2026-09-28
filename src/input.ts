import {ArcRotateCamera,Scene,Vector3,Matrix,Plane} from './render/babylon';
import {Simulation} from './core/simulation';
import {heightAt,POINTS} from './core/map';
import {clamp,distance,Vec} from './core/types';
export class BattlefieldInput{
 center={x:0,z:-5};span=111;desiredSpan=111;private points=new Map<number,{x:number;y:number}>();private start={x:0,y:0};private previous={x:0,y:0};private dragged=false;private wasPinch=false;private lastPinch=0;
 constructor(private canvas:HTMLCanvasElement,private scene:Scene,readonly camera:ArcRotateCamera,private sim:()=>Simulation,private select:(id:number,multi:boolean)=>void,private onOrder:(position:Vec,kind:string)=>void,private multi:()=>boolean,private togglePause:()=>void,private blocked:()=>boolean){
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(this.blocked())return;canvas.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===1){this.start=this.previous={x:e.clientX,y:e.clientY};this.dragged=false;this.wasPinch=false;}else{this.wasPinch=true;const [a,b]=[...this.points.values()];this.lastPinch=Math.hypot(a.x-b.x,a.y-b.y);}});
  canvas.addEventListener('pointermove',e=>{if(!this.points.has(e.pointerId)||this.blocked())return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===2){const [a,b]=[...this.points.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.lastPinch)this.zoom((this.lastPinch-d)*.15);this.lastPinch=d;return;}const dx=e.clientX-this.previous.x,dy=e.clientY-this.previous.y;if(Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>7)this.dragged=true;if(this.dragged){const scale=this.span*(window.innerWidth<window.innerHeight?.62:1)/window.innerWidth,yaw=this.camera.alpha+Math.PI/2,px=-dx*scale,pz=dy*scale/Math.cos(this.camera.beta);this.center.x+=px*Math.cos(yaw)+pz*Math.sin(yaw);this.center.z+=-px*Math.sin(yaw)+pz*Math.cos(yaw);this.constrain();}this.previous={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{const had=this.points.has(e.pointerId);this.points.delete(e.pointerId);if(had&&!this.dragged&&!this.wasPinch&&!this.blocked())this.tap(e.clientX,e.clientY,e.shiftKey||this.multi());if(!this.points.size){this.lastPinch=0;this.wasPinch=false;}canvas.releasePointerCapture(e.pointerId);});
  canvas.addEventListener('pointercancel',()=>{this.points.clear();this.wasPinch=false;this.dragged=false;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(!this.blocked())this.zoom(e.deltaY*.055);},{passive:false});
  window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;const s=this.sim();if(e.code==='Space'||e.code==='Escape'){e.preventDefault();if(s.phase==='playing')this.togglePause();return;}if(this.blocked()||s.phase!=='playing')return;const key=e.key.toLowerCase();if(key==='a'){s.selected=s.squads.filter(q=>q.team===0&&!q.dead).map(q=>q.id);e.preventDefault();}else if(key==='r'){s.issue(s.selected,'retreat');this.onOrder({x:0,z:-35},'retreat');}else if(key==='f'){s.issue(s.selected,'hold');}else if(/^[1-6]$/.test(key)){this.select(Number(key)-1,e.shiftKey);}else if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowLeft')this.center.x-=5;if(e.key==='ArrowRight')this.center.x+=5;if(e.key==='ArrowUp')this.center.z+=5;if(e.key==='ArrowDown')this.center.z-=5;this.constrain();}});
 }
 private constrain(){this.center.x=clamp(this.center.x,-32,32);this.center.z=clamp(this.center.z,-28,28);}
 focus(p:Vec){this.center.x=p.x;this.center.z=p.z;this.constrain();}
 zoom(delta:number){this.desiredSpan=clamp(this.desiredSpan+delta,62,150);}
 world(x:number,y:number){const engine=this.scene.getEngine(),rx=x*engine.getRenderWidth()/window.innerWidth,ry=y*engine.getRenderHeight()/window.innerHeight,ray=this.scene.createPickingRay(rx,ry,Matrix.Identity(),this.camera);let h=0,p=Vector3.Zero();for(let i=0;i<3;i++){const dist=ray.intersectsPlane(new Plane(0,1,0,-h));if(dist===null)return null;p=ray.origin.add(ray.direction.scale(dist));h=heightAt(p.x,p.z);}return{x:p.x,z:p.z};}
 private tap(x:number,y:number,multi:boolean){const sim=this.sim();if(sim.phase!=='playing')return;const p=this.world(x,y);if(!p)return;const q=sim.squads.filter(q=>!q.dead&&sim.visible(q)&&distance(q,p)<4).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if(q?.team===0){this.select(q.id,multi);return;}
  if(!sim.selected.length)return;
  if(q?.team===1){sim.issue(sim.selected,'attack',q,q.id);this.onOrder(q,'attack');return;}
  const point=POINTS.find(t=>distance(t,p)<7);if(point){sim.issue(sim.selected,'capture',point);this.onOrder(point,'capture');}else{sim.issue(sim.selected,'move',p);this.onOrder(p,'move');}
 }
 update(dt:number){this.span+=(this.desiredSpan-this.span)*Math.min(1,dt*7);const target=this.camera.target;target.x+=(this.center.x-target.x)*Math.min(1,dt*8);target.z+=(this.center.z-target.z)*Math.min(1,dt*8);target.y=1.2;this.camera.setTarget(target);const aspect=window.innerWidth/window.innerHeight;const width=aspect<1?this.span*.62:this.span;this.camera.orthoLeft=-width/2;this.camera.orthoRight=width/2;this.camera.orthoTop=width/2/aspect;this.camera.orthoBottom=-width/2/aspect;}
}
