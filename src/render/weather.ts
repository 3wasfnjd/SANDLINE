import {Scene,Mesh,MeshBuilder,LinesMesh,DynamicTexture,StandardMaterial,Color3,Vector3} from './babylon';
import {heightAt} from '../core/map';
import {randomGenerator,Vec} from '../core/types';
import {weatherAt,WeatherState} from './landscape';
import {World} from './world';

export interface RainDrop {x:number;y:number;z:number;seed:number;speed:number}
/** Shared weather controller: a single rain draw, one cloud layer, no rigid bodies. */
export class Weather {
 state:WeatherState=weatherAt(0);
 readonly drops:RainDrop[]=[];
 activeDrops=0;
 private lines:Vector3[][]=[];
 private rain:LinesMesh;
 private clouds:Mesh;
 private cloudTexture:DynamicTexture;
 private cloudMaterial:StandardMaterial;
 private nextLight=0;
 private quality=1;
 private random=randomGenerator(724);
 constructor(private scene:Scene,private world:World,private software:boolean){
  for(let i=0;i<260;i++){
   this.drops.push({x:0,y:this.random()*18,z:0,seed:this.random(),speed:18+this.random()*10});
   this.lines.push([Vector3.Zero(),Vector3.Zero()]);
  }
  this.rain=MeshBuilder.CreateLineSystem('soft rain',{lines:this.lines,updatable:true},scene);this.rain.color=Color3.FromHexString('#bed7f2');this.rain.alpha=.23;this.rain.isPickable=false;this.rain.alwaysSelectAsActiveMesh=true;
  this.clouds=world.ground.clone('moving cloud shadows')!;this.clouds.position.y=.045;this.clouds.unfreezeWorldMatrix();this.clouds.isPickable=false;this.clouds.receiveShadows=false;this.clouds.metadata=null;
  this.cloudTexture=new DynamicTexture('soft cloud cover',{width:256,height:256},scene,false);const ctx=this.cloudTexture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0,0,256,256);
  for(let i=0;i<20;i++){const x=30+this.random()*195,y=30+this.random()*195,r=20+this.random()*38;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(32,55,65,.6)');g.addColorStop(.48,'rgba(32,55,65,.38)');g.addColorStop(1,'rgba(32,55,65,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  this.cloudTexture.hasAlpha=true;this.cloudTexture.update();this.cloudTexture.uScale=1.8;this.cloudTexture.vScale=1.8;
  this.cloudMaterial=new StandardMaterial('cloud shadow veil',scene);this.cloudMaterial.diffuseTexture=this.cloudTexture;this.cloudMaterial.useAlphaFromDiffuseTexture=true;this.cloudMaterial.diffuseColor=Color3.White();this.cloudMaterial.emissiveColor=Color3.White();this.cloudMaterial.disableLighting=true;this.cloudMaterial.alpha=.2;this.cloudMaterial.backFaceCulling=false;this.clouds.material=this.cloudMaterial;
  if(software){this.clouds.setEnabled(false);this.rain.setEnabled(false);}
 }
 setQuality(value:number){this.quality=value;}
 update(time:number,dt:number,center:Vec,span:number){
  this.state=weatherAt(time);const {cloud,rain,wind,wetness}=this.state;
  this.activeDrops=Math.floor(this.drops.length*this.quality*rain);
  const half=Math.min(65,span*.65);
  for(let i=0;i<this.drops.length;i++){
   const d=this.drops[i],line=this.lines[i];
   if(i>=this.activeDrops){line[0].setAll(0);line[1].setAll(0);continue;}
   d.y-=d.speed*dt;d.x+=dt*wind*3;
   const floor=heightAt(d.x,d.z);
   if(d.y<floor||Math.abs(d.x-center.x)>half||Math.abs(d.z-center.z)>half||d.x===0&&d.z===0){d.x=center.x+(this.random()-.5)*half*2;d.z=center.z+(this.random()-.5)*half*2;d.y=heightAt(d.x,d.z)+8+this.random()*15;}
   const length=.75+rain*.85;line[0].set(d.x,d.y,d.z);line[1].set(d.x-wind*.26,d.y+length,d.z);
  }
  if(!this.software){MeshBuilder.CreateLineSystem('soft rain',{lines:this.lines,instance:this.rain},this.scene);this.rain.setEnabled(this.activeDrops>0);this.cloudTexture.uOffset=time*.0015;this.cloudTexture.vOffset=-time*.0006;this.cloudMaterial.alpha=.14+cloud*.15;}
  if(time>=this.nextLight){
   this.nextLight=time+.25;this.world.sun.intensity=1.3-cloud*.35;this.world.sky.intensity=.70+cloud*.08;
   this.world.groundMaterial.diffuseColor.set(1-wetness*.08,1-wetness*.06,1-wetness*.035);
   this.world.groundMaterial.specularColor.set(.12+wetness*.18,.18+wetness*.2,.25+wetness*.22);
   this.scene.fogDensity=.0034+rain*.001;
   this.world.shadows.darkness=.45+cloud*.13;
  }
 }
}
