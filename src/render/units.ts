import { Scene,Mesh,MeshBuilder,SceneLoader,StandardMaterial,Color3,Matrix,Quaternion,Vector3,BoundingInfo } from './babylon';
import '@babylonjs/loaders/glTF/glTFFileLoader';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Simulation } from '../core/simulation';
import { heightAt,coverAt } from '../core/map';
import { Soldier,Squad,clamp } from '../core/types';
import {bakeImportedMesh} from './imported-mesh';

class Batch {
 readonly matrices=new Float32Array(1024*16);readonly colors=new Float32Array(1024*4);count=0;
 constructor(readonly mesh:Mesh){mesh.parent=null;mesh.position.setAll(0);mesh.rotation.setAll(0);mesh.rotationQuaternion=null;mesh.scaling.setAll(1);mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;mesh.thinInstanceSetBuffer('matrix',this.matrices,16,false);mesh.thinInstanceSetBuffer('instanceColor',this.colors,4,false);mesh.thinInstanceCount=0;mesh.setBoundingInfo(new BoundingInfo(new Vector3(-100,-5,-100),new Vector3(100,20,100)));}
 add(m:Matrix,c:number[]){if(this.count>=1024)return;m.copyToArray(this.matrices,this.count*16);this.colors.set(c,this.count*4);this.count++;}
 flush(){this.mesh.thinInstanceCount=this.count;this.mesh.setEnabled(this.count>0);if(this.count){this.mesh.thinInstanceBufferUpdated('matrix');this.mesh.thinInstanceBufferUpdated('instanceColor');}this.count=0;}
}
const TINT=[[.4,.67,.64,1],[.82,.46,.31,1]];
const NORMAL=[1,1,1,1],DEAD=[.42,.4,.34,1];
export class UnitRenderer{
 readonly batches=new Map<string,Batch>();readonly rings:Mesh[]=[];private root=Matrix.Identity();private m=Matrix.Identity();private q=Quaternion.Identity();private pos=Vector3.Zero();private scale=new Vector3(1.18,1.18,1.18);private turn=Quaternion.Identity();
 private staticPalette:StandardMaterial;private lod=0;
 constructor(readonly scene:Scene){this.staticPalette=new StandardMaterial('unit vertex palette',scene);this.staticPalette.diffuseColor=Color3.White();this.staticPalette.specularColor=new Color3(.19,.18,.14);}
 async load(){
  const loaded=await SceneLoader.ImportMeshAsync('','/assets/','sandline-units.glb',this.scene);
  for(const node of loaded.meshes){if(!(node instanceof Mesh)||!node.getTotalVertices())continue;bakeImportedMesh(node);node.material=this.staticPalette;node.receiveShadows=false;this.batches.set(node.name,new Batch(node));}
  loaded.meshes.filter(m=>!m.getTotalVertices()).forEach(m=>m.dispose());
  for(const name of ['soldier_torso','soldier_head','soldier_upperarm','soldier_forearm','soldier_thigh','soldier_shin','weapon_rifle','weapon_mg','weapon_at','vehicle_body','vehicle_turret','vehicle_wheel'])if(!this.batches.has(name))throw new Error('Missing authored unit part: '+name);
  const blob=MeshBuilder.CreateDisc('soft-contact-shadows',{radius:.6,tessellation:12},this.scene);blob.rotation.x=Math.PI/2;blob.bakeCurrentTransformIntoVertices();const mat=new StandardMaterial('ground contact',this.scene);mat.diffuseColor=new Color3(.14,.14,.1);mat.alpha=.23;mat.disableLighting=true;mat.backFaceCulling=false;blob.material=mat;this.batches.set('shadow',new Batch(blob));
  for(let i=0;i<12;i++){const ring=MeshBuilder.CreateTorus('squad selection',{diameter:6.9,thickness:.085,tessellation:48},this.scene);const m=new StandardMaterial('selected '+i,this.scene);m.diffuseColor=Color3.FromHexString('#70e0c9');m.emissiveColor=Color3.FromHexString('#61b6a3');m.disableLighting=true;ring.material=m;ring.isPickable=false;ring.setEnabled(false);this.rings.push(ring);}
 }
 private local(name:string,x:number,y:number,z:number,pitch=0,yaw=0,roll=0,color=NORMAL,scale=1){
  this.pos.set(x,y,z);Quaternion.RotationYawPitchRollToRef(yaw,pitch,roll,this.q);Matrix.ComposeToRef(new Vector3(scale,scale,scale),this.q,this.pos,this.m);this.m.multiplyToRef(this.root,this.m);(this.batches.get(this.lod?name+'_lod'+this.lod:name)||this.batches.get(name))?.add(this.m,color);
 }
 private soldier(s:Soldier,q:Squad,time:number,lod:number){
  if(s.hp<=0&&s.deadTime>16)return;
  const moving=s.speed>.35,combat=q.target>=0&&q.order!=='retreat',crouch=!moving&&combat&&coverAt(s)>.1? .24:0;
  const cycle=s.phase,walk=moving?Math.sin(cycle)*Math.min(.64,s.speed*.14):0,bob=moving?Math.abs(Math.sin(cycle))*.05:Math.sin(time*2+s.id)*.012;
  const death=clamp(s.deadTime*2.8,0,1),hit=s.hit>0?Math.sin(s.hit*20)*.06:0;
  this.pos.set(s.x,heightAt(s.x,s.z)+.025,s.z);Quaternion.RotationYawPitchRollToRef(s.angle,s.hp<=0?death*1.49:hit,0,this.turn);Matrix.ComposeToRef(this.scale,this.turn,this.pos,this.root);
  const tint=s.hp<=0?DEAD:TINT[s.team],neutral=s.hp<=0?DEAD:NORMAL;
  const hip=1.02+bob-crouch;
  this.local('soldier_torso',0,hip,0,combat?-.065:0,0,0,tint);
  this.local('soldier_head',0,hip+.79,combat?.035:0,0,0,0,neutral);
  for(const side of [-1,1]){
   const thigh=walk*side+(crouch?-.5:0),knee=Math.max(0,-walk*side)*.85+(crouch?.95:.04);
   this.local('soldier_thigh',side*.155,hip,.005,thigh,0,0,neutral);
   const ky=hip-.44*Math.cos(thigh),kz=-.44*Math.sin(thigh);
   this.local('soldier_shin',side*.155,ky,kz,thigh+knee,0,0,neutral);
   const arm=s.reload>0?-.8+Math.sin(s.reload*8)*.17:combat?-1.18:-.45-walk*side*.45,az=combat?.08:0,ax=side*.33;
   this.local('soldier_upperarm',ax,hip+.53,az,arm,0,-side*.12,tint);
   if(lod<2)this.local('soldier_forearm',ax,hip+.53-.33*Math.cos(arm),az-.33*Math.sin(arm),combat?-1.2:arm-.65,0,0,neutral);
  }
  const weapon=q.role==='at'&&s.slot===0?'weapon_at':q.role==='mg'&&s.slot<2?'weapon_mg':'weapon_rifle';
  const recoil=s.firing>0?Math.sin(s.firing*38)*.05:0;
  this.local(weapon,.13,hip+(combat?.43:.22),combat?.48-recoil:.26,s.reload>0?.55:combat?0:.55,0,s.reload>0?.25:0,neutral);
  this.pos.set(s.x,heightAt(s.x,s.z)+.05,s.z);Quaternion.RotationYawPitchRollToRef(s.angle,0,0,this.q);Matrix.ComposeToRef(new Vector3(1,1,1.3),this.q,this.pos,this.m);this.batches.get('shadow')?.add(this.m,NORMAL);
 }
 private vehicle(s:Soldier,q:Squad,time:number){
  if(s.hp<=0&&s.deadTime>24)return;
  const y=heightAt(q.x,q.z),pitch=(heightAt(q.x+Math.sin(q.angle)*2,q.z+Math.cos(q.angle)*2)-heightAt(q.x-Math.sin(q.angle)*2,q.z-Math.cos(q.angle)*2))/-4;
  this.pos.set(q.x,y+.08+Math.sin(time*13)*q.speed*.005,q.z);Quaternion.RotationYawPitchRollToRef(q.angle,pitch,Math.sin(time*9)*q.speed*.002,this.q);Matrix.ComposeToRef(Vector3.One(),this.q,this.pos,this.root);
  this.local('vehicle_body',0,0,0,0,0,0,s.hp>0?(q.team===0?[.76,.95,.87,1]:[1,.74,.56,1]):DEAD);
  this.local('vehicle_turret',0,2.37,.1-(s.firing>.02?.12:0),0,q.turret-q.angle,0,s.hp>0?(q.team===0?[.65,.93,.86,1]:[1,.68,.49,1]):DEAD);
  for(const x of [-1.15,1.15])for(const z of [-1.5,0,1.5])this.local('vehicle_wheel',x,.54,z,q.speed>.1?-time*q.speed*1.6:0,0,0,s.hp>0?NORMAL:DEAD);
  this.pos.set(q.x,y+.06,q.z);Quaternion.RotationYawPitchRollToRef(q.angle,0,0,this.q);Matrix.ComposeToRef(new Vector3(2.6,1,4.6),this.q,this.pos,this.m);this.batches.get('shadow')?.add(this.m,NORMAL);
 }
 update(sim:Simulation,time:number,lod=0){
  this.lod=lod;for(const s of sim.soldiers){const q=sim.squads[s.squad];if(sim.phase!=='intro'&&!sim.visible(q))continue;if(q.role==='vehicle')this.vehicle(s,q,time);else this.soldier(s,q,time,lod);}
  for(const [i,ring]of this.rings.entries()){const q=sim.squads[i];const selected=q&&sim.selected.includes(i)&&!q.dead&&sim.phase==='playing';ring.setEnabled(Boolean(selected));if(selected){ring.position.set(q.x,heightAt(q.x,q.z)+.11,q.z);ring.scaling.setAll(1+Math.sin(time*3)*.015);}}
  for(const b of this.batches.values())b.flush();
 }
}
