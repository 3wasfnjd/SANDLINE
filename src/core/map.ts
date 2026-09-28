import { Vec, clamp } from './types';
export const MAP={minX:-53,maxX:53,minZ:-43,maxZ:43,cell:2};
export const BASES:Vec[]=[{x:0,z:-35},{x:0,z:35}];
export const POINTS=[{x:-26,z:-1,name:'قرية السدر',label:'A'},{x:0,z:15,name:'مرصد الصخر',label:'B'},{x:26,z:-2,name:'معبر الوادي',label:'C'}];
export interface Obstacle extends Vec { w:number; d:number; h:number; kind:'building'|'wall'|'rock'; rotation?:number }
export const OBSTACLES:Obstacle[]=[
 {x:-35,z:4,w:6,d:5,h:4.1,kind:'building'}, {x:-33,z:-8,w:5.6,d:6,h:3.3,kind:'building'},
 {x:-23,z:-10,w:5,d:4.8,h:4.2,kind:'building'}, {x:-18,z:5,w:6,d:5.6,h:3.7,kind:'building'},
 {x:-28,z:10,w:4.5,d:5,h:5.5,kind:'building'}, {x:-40,z:-3,w:3.7,d:4.2,h:2.9,kind:'building'},
 {x:-34,z:14,w:5,d:3.5,h:3.2,kind:'building'}, {x:-16,z:-5,w:3.2,d:3.2,h:2.6,kind:'building'},
 {x:8,z:23,w:5,d:4,h:3.4,kind:'building'}, {x:-8,z:22,w:4,d:3.5,h:2.8,kind:'building'},
 {x:35,z:7,w:4,d:5,h:3,kind:'building'}, {x:35,z:-10,w:3.5,d:4,h:3,kind:'building'},
 {x:-11,z:-20,w:6,d:2.8,h:2.3,kind:'rock'}, {x:13,z:-18,w:6,d:3,h:2.5,kind:'rock'},
 {x:-14,z:16,w:4.2,d:5,h:3.3,kind:'rock'}, {x:15,z:15,w:5,d:6,h:3.4,kind:'rock'},
 {x:41,z:22,w:5,d:7,h:3.4,kind:'rock'}, {x:-44,z:25,w:5,d:8,h:3.7,kind:'rock'}
];
export interface Cover extends Vec{length:number;angle:number;kind:'sandbag'|'wall'|'trench'}
export const COVERS:Cover[]=[
 {x:-26,z:-5.3,length:7,angle:0,kind:'wall'}, {x:-24,z:3.5,length:5,angle:0,kind:'sandbag'},
 {x:-30,z:-0.5,length:4,angle:Math.PI/2,kind:'wall'},
 {x:0,z:10,length:9,angle:0,kind:'sandbag'}, {x:4.7,z:15,length:6,angle:Math.PI/2,kind:'sandbag'},
 {x:-4.9,z:16,length:6,angle:Math.PI/2,kind:'trench'},
 {x:26,z:-7,length:8,angle:0,kind:'sandbag'}, {x:25,z:3,length:8,angle:0,kind:'wall'},
 {x:31,z:-2,length:6,angle:Math.PI/2,kind:'sandbag'},
 {x:-5,z:-13,length:7,angle:-0.22,kind:'trench'}, {x:7,z:0,length:5,angle:0.2,kind:'trench'},
 {x:0,z:29,length:13,angle:0,kind:'sandbag'}, {x:0,z:-29,length:13,angle:0,kind:'sandbag'}
];
export function heightAt(x:number,z:number){
 const hill=3.65*Math.exp(-(x*x/245+(z-16)**2/180));
 const dunes=.52*Math.sin(x*.083+z*.055)+.26*Math.sin(z*.21-x*.075)+.14*Math.sin(x*.39+z*.17);
 const wadi=-.58*Math.exp(-((x-24-3*Math.sin(z*.1))**2)/32);
 return hill+dunes+wadi;
}
export function blocked(x:number,z:number,vehicle=false){
 if(x<MAP.minX||x>MAP.maxX||z<MAP.minZ||z>MAP.maxZ)return true;
 const r=vehicle?1.4:.45;
 return OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
}
export function lineOfSight(a:Vec,b:Vec){
 const d=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(d/2);
 for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
  if(OBSTACLES.some(o=>o.kind==='building'&&Math.abs(x-o.x)<o.w*.45&&Math.abs(z-o.z)<o.d*.45))return false;
 }
 return true;
}
export function coverAt(p:Vec,threat?:Vec){
 let value=0;
 for(const c of COVERS){
  const dx=p.x-c.x,dz=p.z-c.z,along=dx*Math.cos(c.angle)+dz*Math.sin(c.angle),across=-dx*Math.sin(c.angle)+dz*Math.cos(c.angle);
  if(Math.abs(along)<c.length/2+1&&Math.abs(across)<2.9){
   let protection=c.kind==='trench'?.48:.4;
   if(threat){const side=-(threat.x-c.x)*Math.sin(c.angle)+(threat.z-c.z)*Math.cos(c.angle); if(side*across>0&&c.kind!=='trench')protection*=.3;}
   value=Math.max(value,protection);
  }
 }
 return value;
}
export const inside=(p:Vec):Vec=>({x:clamp(p.x,MAP.minX+1,MAP.maxX-1),z:clamp(p.z,MAP.minZ+1,MAP.maxZ-1)});
