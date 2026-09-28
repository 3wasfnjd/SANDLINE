import {Scene,Mesh,VertexData,VertexBuffer,StandardMaterial,Color3} from './babylon';
import {heightAt,blocked,POINTS,COVERS} from '../core/map';
import {randomGenerator} from '../core/types';
import {vegetationAt} from './landscape';

/** One shared meadow mesh, with CPU vertex sway at 15 Hz, no per-blade actors. */
export class Vegetation {
 readonly mesh:Mesh;
 private base:Float32Array;
 private posed:Float32Array;
 private weight:Float32Array;
 private next=0;
 constructor(scene:Scene){
  const random=randomGenerator(628),p:number[]=[],c:number[]=[],indices:number[]=[],weight:number[]=[];
  for(let attempt=0,tufts=0;attempt<12000&&tufts<900;attempt++){
   const x=(random()-.5)*102,z=(random()-.5)*78,density=vegetationAt(x,z);
   if(density<.25||random()>density||blocked(x,z,true)||POINTS.some(a=>Math.hypot(a.x-x,a.z-z)<8)||COVERS.some(a=>Math.hypot(a.x-x,a.z-z)<a.length/2+1.5))continue;
   // Open river ford and footpaths stay readable and free of tall grass.
   if(x>-41&&x<-38&&z>-30&&z<16||x>38&&x<43&&z>-20&&z<18)continue;
   if(Math.hypot((x+42)/3.8,(z+14)/3)<1)continue;
   tufts++;
   const green=density>.5,shade=.88+random()*.22;
   for(let blade=0;blade<4;blade++){
    const yaw=random()*Math.PI*2,h=.28+random()*.65,w=.06+random()*.075;
    const bx=x+(random()-.5)*.5,bz=z+(random()-.5)*.5,y=heightAt(bx,bz)+.025;
    const bend=(random()-.5)*.35,dx=Math.cos(yaw),dz=Math.sin(yaw),at=p.length/3;
    p.push(bx-dx*w,y,bz-dz*w,bx+dx*w,y,bz+dz*w,bx+bend,y+h,bz+.13);
    indices.push(at,at+1,at+2);weight.push(0,0,h);
    for(let k=0;k<3;k++){const tip=k===2?1.18:1;c.push((green?.39:.56)*shade*tip,(green?.48:.49)*shade*tip,(green?.16:.25)*shade*tip,1);}
   }
  }
  const normals:number[]=[];VertexData.ComputeNormals(p,indices,normals);
  const data=new VertexData();data.positions=p;data.indices=indices;data.normals=normals;data.colors=c;
  this.mesh=new Mesh('oasis grass',scene);data.applyToMesh(this.mesh,true);
  const material=new StandardMaterial('olive grass tips',scene);material.diffuseColor=Color3.White();material.specularColor=Color3.Black();material.backFaceCulling=false;this.mesh.material=material;
  this.mesh.isPickable=false;this.mesh.receiveShadows=true;this.mesh.freezeWorldMatrix();
  this.base=new Float32Array(p);this.posed=new Float32Array(p);this.weight=new Float32Array(weight);
 }
 update(time:number,wind:number){
  if(time<this.next)return;this.next=time+1/15;
  for(let i=0;i<this.weight.length;i++){
   if(!this.weight[i])continue;const j=i*3,w=this.weight[i];
   this.posed[j]=this.base[j]+Math.sin(time*2.2+this.base[j]*.8+this.base[j+2]*.3)*w*.17*(.5+wind);
   this.posed[j+2]=this.base[j+2]+Math.cos(time*1.8+this.base[j]*.4)*w*.11;
  }
  this.mesh.updateVerticesData(VertexBuffer.PositionKind,this.posed,false,false);
 }
}
