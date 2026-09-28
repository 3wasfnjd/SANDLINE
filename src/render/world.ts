import { Scene,Mesh,MeshBuilder,VertexData,VertexBuffer,StandardMaterial,Color3,Color4,Vector3,DirectionalLight,HemisphericLight,ShadowGenerator,DynamicTexture,Texture,SceneLoader } from './babylon';
import { OBSTACLES,COVERS,POINTS,BASES,heightAt } from '../core/map';
import { randomGenerator } from '../core/types';
import {surfaceColor} from './landscape';
import {bakeImportedMesh} from './imported-mesh';

export const PALETTE={sand:'#ba9c71',sun:'#ffe2ac',rock:'#8d6c50',mud:'#b69470',teal:'#60c3b5',copper:'#dc7854',ink:'#14272b'};
export class World {
 readonly materials=new Map<string,StandardMaterial>();readonly points:Mesh[]=[];readonly flags:Mesh[]=[];readonly shadows:ShadowGenerator;readonly sun:DirectionalLight;readonly sky:HemisphericLight;
 ground!:Mesh;groundMaterial!:StandardMaterial;private water:Mesh[]=[];
 private batches=new Map<string,Mesh[]>();private rnd=randomGenerator(537);private animatedFlags:Mesh[]=[];
 constructor(readonly scene:Scene){
  scene.clearColor=Color4.FromHexString('#b3c7c4ff');scene.ambientColor=new Color3(.32,.37,.41);
  scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.0028;scene.fogColor=Color3.FromHexString('#b4c3ba');
  const hemi=this.sky=new HemisphericLight('sky',new Vector3(.2,1,0),scene);hemi.intensity=.82;hemi.diffuse=Color3.FromHexString('#b6d3d9');hemi.groundColor=Color3.FromHexString('#a77852');
  this.sun=new DirectionalLight('late desert sun',new Vector3(-.65,-1,.5),scene);this.sun.position=new Vector3(40,70,-35);this.sun.intensity=1.9;this.sun.diffuse=Color3.FromHexString('#ffe6be');this.sun.shadowMinZ=1;this.sun.shadowMaxZ=180;this.sun.autoCalcShadowZBounds=true;
  this.shadows=new ShadowGenerator(1024,this.sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.filteringQuality=ShadowGenerator.QUALITY_LOW;this.shadows.bias=.001;this.shadows.normalBias=.04;this.shadows.darkness=.32;
  this.terrain();this.roads();this.cliffs();
  OBSTACLES.forEach((o,i)=>{if(o.kind==='building')this.building(o.x,o.z,o.w,o.d,o.h,i);});
  for(const c of COVERS)this.cover(c.x,c.z,c.length,c.angle,c.kind);
  this.objectives();this.bases();this.details();this.oasis();this.finishBatches();
 }
 mat(hex:string,emissive=false){const key=hex+(emissive?'e':'');let m=this.materials.get(key);if(m)return m;m=new StandardMaterial(key,this.scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.07,.065,.05);if(emissive){m.emissiveColor=m.diffuseColor.scale(.8);m.disableLighting=true;}this.materials.set(key,m);return m;}
 add(m:Mesh,hex:string,pos:Vector3,rot?:Vector3,batch=true){m.material=this.mat(hex);m.position.copyFrom(pos);if(rot)m.rotation.copyFrom(rot);m.isPickable=false;m.receiveShadows=true;if(batch){const key=hex+':'+Math.floor(pos.x/22)+':'+Math.floor(pos.z/22);const list=this.batches.get(key)||[];list.push(m);this.batches.set(key,list);}return m;}
 box(w:number,h:number,d:number,x:number,y:number,z:number,hex:string,rot?:Vector3,batch=true){return this.add(MeshBuilder.CreateBox('architecture',{width:w,height:h,depth:d},this.scene),hex,new Vector3(x,y,z),rot,batch);}
 cyl(top:number,bottom:number,h:number,x:number,y:number,z:number,hex:string,tess=12,rot?:Vector3,batch=true){return this.add(MeshBuilder.CreateCylinder('detail',{diameterTop:top,diameterBottom:bottom,height:h,tessellation:tess},this.scene),hex,new Vector3(x,y,z),rot,batch);}
 private terrain(){
  const vertices:number[]=[],indices:number[]=[],colors:number[]=[],uv:number[]=[],n=128,size=152;
  for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){const x=(ix/n-.5)*size,z=(iz/n-.5)*size,h=heightAt(x,z);vertices.push(x,h,z);uv.push(ix/n,iz/n);colors.push(...surfaceColor(x,z),1);}
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x;indices.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
  const normals:number[]=[];VertexData.ComputeNormals(vertices,indices,normals);const v=new VertexData();v.positions=vertices;v.indices=indices;v.normals=normals;v.colors=colors;v.uvs=uv;
  const m=this.ground=new Mesh('desert-terrain',this.scene);v.applyToMesh(m);this.groundMaterial=new StandardMaterial('layered sand and soil',this.scene);this.groundMaterial.diffuseColor=Color3.White();this.groundMaterial.specularColor=new Color3(.04,.05,.05);m.material=this.groundMaterial;m.receiveShadows=true;m.isPickable=true;m.metadata={ground:true};m.freezeWorldMatrix();
  // A tiny repeating sand grain breaks up surfaces without large texture downloads.
  const tex=new DynamicTexture('sand-grain',{width:128,height:128},this.scene,false);const ctx=tex.getContext();ctx.fillStyle='#fff8e9';ctx.fillRect(0,0,128,128);for(let i=0;i<5000;i++){const a=this.rnd()*.1;ctx.fillStyle=`rgba(81,58,32,${a})`;ctx.fillRect(this.rnd()*128,this.rnd()*128,1,1);}tex.update();tex.uScale=42;tex.vScale=42;this.groundMaterial.diffuseTexture=tex;
 }
 ribbon(name:string,points:{x:number;z:number}[],width:number,color:string,offset=.03){
  const p:number[]=[],idx:number[]=[],col:number[]=[];
  for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=(b.z-a.z)/len,nz=-(b.x-a.x)/len;
   for(const side of [-1,1]){const x=points[i].x+nx*width/2*side,z=points[i].z+nz*width/2*side;p.push(x,heightAt(x,z)+offset,z);const c=Color3.FromHexString(color);col.push(c.r,c.g,c.b,1);}if(i<points.length-1){let j=i*2;idx.push(j,j+2,j+1,j+1,j+2,j+3);}}
  const n:number[]=[];VertexData.ComputeNormals(p,idx,n);const data=new VertexData();data.positions=p;data.indices=idx;data.normals=n;data.colors=col;const m=new Mesh(name,this.scene);data.applyToMesh(m);m.material=this.mat('#fefdfb');m.receiveShadows=true;m.isPickable=false;m.freezeWorldMatrix();return m;
 }
 path(points:number[][],width:number){const interpolated:{x:number;z:number}[]=[];for(let k=0;k<points.length-1;k++){const a=points[k],b=points[k+1],steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/1.4);for(let j=0;j<steps;j++)interpolated.push({x:a[0]+(b[0]-a[0])*j/steps,z:a[1]+(b[1]-a[1])*j/steps});}const end=points.at(-1)!;interpolated.push({x:end[0],z:end[1]});this.ribbon('road shoulder',interpolated,width+1.2,'#ac9068',.025);this.ribbon('compacted earth',interpolated,width,'#a08965',.045);for(const side of [-1,1]){this.ribbon('old tire impressions',interpolated.map(p=>({x:p.x+side*width*.22,z:p.z})),.13,'#917b57',.065);}}
 private roads(){
  this.path([[0,-49],[0,-30],[-7,-21],[-19,-15],[-26,-4],[-26,3],[-21,14],[-11,28],[0,35],[0,51]],4.9);
  this.path([[0,-31],[13,-24],[24,-13],[26,-2],[29,13],[18,27],[0,35]],5.5);
  this.path([[-26,-1],[-12,0],[-4,8],[0,15],[11,12],[26,-2]],2.7);
  this.path([[-45,-29],[-39,-20],[-40,-9],[-43,6],[-38,20],[-21,31]],1.8);
  this.path([[23,-22],[39,-18],[43,-2],[40,13],[32,26]],2.5);
 }
 private rock(x:number,z:number,w:number,h:number,d:number,seed:number){
  const m=new Mesh('layered sandstone',this.scene),positions:number[]=[],indices:number[]=[],normals:number[]=[],colors:number[]=[],rings=[[-.04,.83],[.12,1],[.3,.93],[.49,.82],[.64,.73],[.8,.52],[.85,.3]],segments=14;
  for(let j=0;j<rings.length;j++)for(let i=0;i<segments;i++){const angle=i/segments*Math.PI*2,shape=.94+.12*Math.sin(angle*3+seed)+.07*Math.cos(angle*5+seed*.7),radius=rings[j][1]*shape;positions.push(Math.cos(angle)*w*.5*radius+(j/7)*w*.06, rings[j][0]*h,Math.sin(angle)*d*.5*radius);const band=j%2?.87:.81,shade=band+j*.016;colors.push(shade,shade*.945,shade*.86,1);}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=a+segments,e=b+segments;indices.push(a,b,c,b,e,c);}
  const top=positions.length/3;positions.push(w*.06,.85*h,0);colors.push(.94,.9,.81,1);for(let i=0;i<segments;i++)indices.push(top,(rings.length-1)*segments+i,(rings.length-1)*segments+(i+1)%segments);
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.colors=colors;data.applyToMesh(m);return this.add(m,'#997958',new Vector3(x,heightAt(x,z)-.1,z));
 }
 private cliffs(){
  for(let i=0;i<75;i++){const side=i%4,t=(i/4)/19,x=side<2?(side===0?-59:59)+(this.rnd()-.5)*7:-62+t*124,z=side<2?-58+t*116:(side===2?-54:53)+(this.rnd()-.5)*8;const h=6+this.rnd()*11;this.rock(x,z,9+this.rnd()*9,h,8+this.rnd()*9,i*19);if(i%2===0)this.rock(x+(this.rnd()-.5)*7,z-2,5,3+this.rnd()*4,6,i);}
 }
 private building(x:number,z:number,w:number,d:number,h:number,i:number){
  const y=heightAt(x,z),wall=i%3===0?'#a98461':i%3===1?'#b89a77':'#b29470',roof='#847052',trim='#ccb18a';
  this.box(w+.2,.35,d+.2,x,y+.12,z,'#8b7054');
  this.box(w,h,d,x,y+h/2,z,wall);this.box(w-.35,.12,d-.35,x,y+h+.015,z,roof);
  this.box(w+.2,.17,d+.2,x,y+h-.17,z,trim);
  for(const xx of [x-w/2+.12,x+w/2-.12])this.box(.25,.63,d+.18,xx,y+h+.2,z,wall);
  for(const zz of [z-d/2+.12,z+d/2-.12])this.box(w,.63,.24,x,y+h+.2,zz,wall);
  // Dark recesses, layered sills and lintels are visible from the real camera.
  for(const xx of [-w*.27,w*.27]){this.box(.7,.92,.04,x+xx,y+h*.59,z-d/2-.022,'#4c4539');this.box(.9,.13,.25,x+xx,y+h*.59-.5,z-d/2-.06,trim);for(const bar of [-.18,0,.18])this.box(.035,.93,.045,x+xx+bar,y+h*.59,z-d/2-.055,'#7d6b52');}
  this.box(1.05,1.36,.04,x,y+.69,z-d/2-.025,'#433e32');const arch=MeshBuilder.CreateSphere('arched doorway',{diameterX:1.06,diameterY:1.05,diameterZ:.04,segments:6},this.scene);this.add(arch,'#433e32',new Vector3(x,y+1.34,z-d/2-.045));this.box(1.27,.2,.25,x,y+1.94,z-d/2-.06,trim);this.box(1.2,.18,.62,x,y+.09,z-d/2-.24,'#907658');
  for(let k=0;k<3;k++)this.box(.09,.1,d+.24,x-w*.25+k*w*.25,y+h-.32,z,'#544934');
  if(i%2===0){const ax=x+w*.2,az=z-d/2-1.7;this.box(w*.75,.1,2.35,ax,y+2.16,az,'#877355',new Vector3(.08,0,0));for(const dx of [-w*.32,w*.32])this.cyl(.09,.12,2.2,ax+dx,y+1.1,az-.9,'#67533e',7);for(let j=0;j<9;j++)this.box(.045,.06,2.35,ax-w*.34+j*w*.085,y+2.25,az,'#baa579',new Vector3(.08,0,0));}
  if(i%3===0){for(let k=0;k<9;k++)this.box(.8,(k+1)*.27,.43,x+w/2+.55,y+(k+1)*.135,z-d/2+.4+k*.42,wall);this.cyl(1.1,1.25,.7,x-.8,y+h+.45,z+.7,'#978563',12);}
  if(i===4){this.box(2.2,1.6,2.2,x,y+h+.8,z,wall);for(const xx of [-.6,.6])this.box(.55,.85,.04,x+xx,y+h+1,z-1.12,'#4b4436');this.box(2.45,.2,2.45,x,y+h+1.65,z,trim);}
  this.cyl(.34,.53,.64,x-w*.42,y+.32,z-d*.6,'#876646',10);this.cyl(.29,.46,.45,x-w*.42-.55,y+.225,z-d*.58,'#a47950',10);
 }
 private cover(x:number,z:number,length:number,angle:number,kind:string){
  const y=heightAt(x,z);if(kind==='trench'){this.box(length,.05,1.55,x,y+.045,z,'#5f5848',new Vector3(0,-angle,0));}
  const count=Math.floor(length/.85);
  for(let layer=0;layer<(kind==='wall'?2:2);layer++)for(let i=0;i<count;i++){
   const t=(i-(count-1)/2)*.83+(layer%2)*.27,px=x+t*Math.cos(angle),pz=z+t*Math.sin(angle),py=heightAt(px,pz);
   if(kind==='wall')this.box(.8,.38,.44,px,py+.2+layer*.35,pz,layer?'#b7a184':'#a48d70',new Vector3(0,-angle,0));
   else{const m=MeshBuilder.CreateSphere('sandbag',{diameterX:.95,diameterY:.4,diameterZ:.59,segments:4},this.scene);this.add(m,layer?'#a39972':'#90845f',new Vector3(px,py+.18+layer*.3,pz),new Vector3(0,-angle,0));}
  }
 }
 private objectives(){
  for(const [i,p] of POINTS.entries()){
   const y=heightAt(p.x,p.z);this.cyl(2.15,2.4,.2,p.x,y+.07,p.z,'#8f8065',24);this.cyl(.1,.15,5.9,p.x,y+2.98,p.z,'#605e4f',8);
   const ring=MeshBuilder.CreateTorus('control zone '+i,{diameter:12.4,thickness:.1,tessellation:64},this.scene);ring.position.set(p.x,y+.12,p.z);ring.material=this.mat('#d4c094',true);ring.isPickable=false;this.points.push(ring);
   const flag=MeshBuilder.CreateGround('capture banner '+i,{width:2,height:1.2,subdivisions:8},this.scene);flag.position.set(p.x+.95,y+4.9,p.z);flag.rotation.x=-Math.PI/2;flag.material=this.mat('#b9a987');flag.material.backFaceCulling=false;flag.isPickable=false;this.flags.push(flag);this.animatedFlags.push(flag);
  }
 }
 private palm(x:number,z:number,scale=1){
  const y=heightAt(x,z);this.cyl(.23*scale,.58*scale,6*scale,x,y+3*scale,z,'#706047',9,new Vector3(0,0,.055));
  for(let i=0;i<9;i++){
   const a=i*Math.PI*2/9+.3,dir=new Vector3(Math.cos(a),0,Math.sin(a)),side=new Vector3(-Math.sin(a),0,Math.cos(a));
   const spine=(t:number)=>new Vector3(x,y+6.15*scale+Math.sin(t*Math.PI)*.7*scale-t*t*.8*scale,z).add(dir.scale(t*3.4*scale));
   const left:Vector3[]=[],right:Vector3[]=[];for(let j=0;j<=7;j++){const t=j/7,p=spine(t),width=Math.sin(t*Math.PI)*.11*scale+.015;left.push(p.add(side.scale(width)));right.push(p.add(side.scale(-width)));}
   const stem=MeshBuilder.CreateRibbon('palm frond spine',{pathArray:[left,right],sideOrientation:Mesh.DOUBLESIDE},this.scene);this.add(stem,'#69784e',Vector3.Zero());
   for(let j=1;j<8;j++)for(const sign of [-1,1]){const t=j/9,base=spine(t),end=base.add(dir.scale(.32*scale)).add(side.scale(sign*Math.sin(t*Math.PI)*.57*scale));end.y-=.22*scale;
    const leaf=MeshBuilder.CreateRibbon('palm leaflets',{pathArray:[[base,base.add(dir.scale(.19*scale))],[end,end.add(dir.scale(.035*scale))]],sideOrientation:Mesh.DOUBLESIDE},this.scene);this.add(leaf,j%2?'#68784b':'#7b8653',Vector3.Zero());}
  }
 }
 private bases(){for(let t=0;t<2;t++){const b=BASES[t],y=heightAt(b.x,b.z),color=t?'#965941':'#466e69';this.cyl(4.8,5,.12,b.x,y+.02,b.z,'#8e7e61',32);for(const x of [-23,23]){const z=b.z+(t?4:-4);this.box(5,1.8,3,x,heightAt(x,z)+.9,z,color);for(let j=0;j<9;j++)this.box(.1,1.85,3.05,x-2.3+j*.57,heightAt(x,z)+.93,z,t?'#82513f':'#405c57');this.box(5.12,.12,3.12,x,heightAt(x,z)+1.86,z,'#8b8768');}this.cyl(.1,.14,7,-8,y+3.5,b.z,'#555947',8);const flag=this.box(2.6,1.25,.035,-6.7,y+6,b.z,color,undefined,false);this.animatedFlags.push(flag);}}
 private details(){
  for(const [x,z,s] of [[-42,-15,1],[-38,-18,.85],[-45,-8,.95],[-36,9,.8],[-20,10,.9],[37,4,.86],[33,11,.9],[-7,25,.72]])this.palm(x,z,s);
  for(let i=0;i<170;i++){const x=(this.rnd()-.5)*102,z=(this.rnd()-.5)*87;if(OBSTACLES.some(o=>Math.abs(x-o.x)<o.w&&Math.abs(z-o.z)<o.d)||POINTS.some(p=>Math.hypot(x-p.x,z-p.z)<7))continue;const y=heightAt(x,z),size=.12+this.rnd()*.4;
   if(i%3===0)this.rock(x,z,size*2,size,size*1.5,i+300);else{for(let j=0;j<3;j++)this.box(.055,size*1.7,.05,x+(j-1)*.12,y+size*.75,z,'#827d50',new Vector3((this.rnd()-.5)*.9,0,(this.rnd()-.5)*1.4));}}
  // Checkpoint at the eastern crossing, with guard towers and concrete roadblocks.
  for(const z of [-11,8]){const x=30,y=heightAt(x,z);for(const dx of [-.8,.8])for(const dz of [-.8,.8])this.box(.14,4,.14,x+dx,y+2,z+dz,'#766a50');this.box(2.1,.18,2.1,x,y+3.7,z,'#797253');this.box(2.35,.16,2.35,x,y+5.2,z,'#948565');for(const dx of [-.92,.92])this.box(.1,1.4,.1,x+dx,y+4.5,z-.92,'#776c53');this.box(2,.72,.14,x,y+4.1,z-.92,'#a4916d');}
  for(const x of [20,32]){const z=-11,y=heightAt(x,z);this.box(3,.85,.7,x,y+.425,z,'#b7ac8d');for(const dx of [-.8,.8])this.box(.35,.87,.715,x+dx,y+.44,z,'#6e6c55',new Vector3(0,0,-.3));}
  for(let i=0;i<13;i++){const x=-37+(i%4)*.75,z=-10-Math.floor(i/4)*.7,y=heightAt(x,z);this.box(.62,.63,.58,x,y+.315,z,i%2?'#827859':'#716b50');this.box(.65,.04,.61,x,y+.53,z,'#9c8c67');}
 }
 private oasis(){
  // A shallow spring uses the same ground height as soldiers: no hidden collision surface.
  const p:number[]=[],c:number[]=[],idx:number[]=[],segments=64;
  for(let ring=0;ring<=4;ring++)for(let i=0;i<segments;i++){
   const angle=i/segments*Math.PI*2,r=ring/4*(1+.065*Math.sin(angle*5)+.035*Math.cos(angle*3));
   const x=-42+Math.cos(angle)*4.3*r,z=-14+Math.sin(angle)*3.15*r;
   p.push(x,heightAt(x,z)+.07,z);const t=ring/4;c.push(.2+t*.21,.4+t*.2,.41+t*.11,1);
   if(ring<4){const a=ring*segments+i,b=ring*segments+(i+1)%segments;idx.push(a,b,a+segments,b,b+segments,a+segments);}
  }
  const normals:number[]=[];VertexData.ComputeNormals(p,idx,normals);const data=new VertexData();data.positions=p;data.indices=idx;data.colors=c;data.normals=normals;
  const pond=new Mesh('spring water',this.scene);data.applyToMesh(pond);pond.material=this.mat('#ffffff');pond.isPickable=false;pond.freezeWorldMatrix();
  for(let j=0;j<3;j++){const points=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,r=1+j*.85,x=-42+Math.cos(a)*r,z=-14+Math.sin(a)*r*.65;points.push(new Vector3(x,heightAt(x,z)+.09,z));}const ripple=MeshBuilder.CreateLines('spring ripple',{points},this.scene);ripple.color=Color3.FromHexString('#94c0ad');ripple.alpha=.24;ripple.isPickable=false;this.water.push(ripple);}
  // Small paving patches reuse Motri's actual stone atlas, not its driving map.
  const paving=new StandardMaterial('Motri stone paving',this.scene);paving.diffuseColor=Color3.FromHexString('#cfb691');paving.specularColor=Color3.Black();
  const slabs=new Texture(`${import.meta.env.BASE_URL}assets/motri-slabs.png`,this.scene);slabs.uScale=2;slabs.vScale=1.5;paving.diffuseTexture=slabs;
  for(const [x,z,w,d] of [[-31,-3,5,4],[-32,7,4,3],[4,21,4,3]]){
   const tile=MeshBuilder.CreateGround('village paving',{width:w,height:d,subdivisions:5},this.scene);const v=tile.getVerticesData(VertexBuffer.PositionKind)!;
   for(let i=0;i<v.length;i+=3)v[i+1]=heightAt(v[i]+x,v[i+2]+z)+.055;tile.setVerticesData(VertexBuffer.PositionKind,v);tile.position.set(x,0,z);tile.material=paving;tile.receiveShadows=true;tile.isPickable=false;tile.freezeWorldMatrix();
  }
  // Irrigated strips and low farm rails at the village edge, leaving the flanking lane open.
  for(let row=0;row<5;row++)this.ribbon('garden furrow',[{x:-45,z:17+row*.9},{x:-38.5,z:17+row*.9}],.32,row%2?'#747b43':'#8d8251',.07);
  for(const z of [16,22])for(let j=0;j<4;j++){const x=-46+j*2.2,y=heightAt(x,z);this.box(.12,1.1,.12,x,y+.55,z,'#927d5d');if(j<3)for(const h of [.38,.78])this.box(2.1,.09,.08,x+1.1,y+h,z,'#b39b72');}
  for(const [x,z]of [[-46,17],[-47,-21],[45,14],[44,-13]]){
   const y=heightAt(x,z);this.cyl(.18,.45,3.2,x,y+1.6,z,'#665c44',8);
   for(let i=0;i<5;i++){const a=i*2.4,m=MeshBuilder.CreateSphere('sidr canopy',{diameterX:3.1,diameterY:1.8,diameterZ:2.6,segments:7},this.scene);this.add(m,i%2?'#617643':'#7b884c',new Vector3(x+Math.cos(a)*.8,y+3.1+(i%2)*.5,z+Math.sin(a)*.7));}
  }
 }
 async loadScenery(){
  const loaded=await SceneLoader.ImportMeshAsync('',`${import.meta.env.BASE_URL}assets/`,'motri-basalt.glb',this.scene);
  const templates=loaded.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
  if(templates.length!==3)throw new Error('Incomplete Motri rock kit');
  for(const mesh of templates){
   bakeImportedMesh(mesh);mesh.parent=null;mesh.position.setAll(0);mesh.scaling.setAll(1);mesh.rotationQuaternion=null;mesh.rotation.setAll(0);
   const vertices=mesh.getVerticesData(VertexBuffer.PositionKind)!,indices=mesh.getIndices()!;
   const b=mesh.getBoundingInfo().boundingBox,min=b.minimum,max=b.maximum;
   for(let i=0;i<vertices.length;i+=3){vertices[i]=(vertices[i]-(min.x+max.x)/2)/Math.max(.01,max.x-min.x);vertices[i+1]=(vertices[i+1]-min.y)/Math.max(.01,max.y-min.y);vertices[i+2]=(vertices[i+2]-(min.z+max.z)/2)/Math.max(.01,max.z-min.z);}
   const normals:number[]=[];VertexData.ComputeNormals(vertices,indices,normals);mesh.setVerticesData(VertexBuffer.PositionKind,vertices);mesh.setVerticesData(VertexBuffer.NormalKind,normals);mesh.overrideMaterialSideOrientation=1;mesh.isVisible=false;
  }
  let n=0;
  const place=(x:number,z:number,w:number,h:number,d:number,angle=0)=>{
   const mesh=templates[n++%templates.length].clone('Motri basalt outcrop')!;mesh.isVisible=true;mesh.scaling.set(w,h,d);
   this.add(mesh,n%2?'#707463':'#82826b',new Vector3(x,heightAt(x,z)-.06,z),new Vector3(0,angle,0));
  };
  for(const o of OBSTACLES)if(o.kind==='rock')place(o.x,o.z,o.w,o.h,o.d);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;place(-42+Math.cos(a)*4.65,-14+Math.sin(a)*3.55,.45+this.rnd()*.7,.2+this.rnd()*.3,.4+this.rnd()*.4,a);}
  for(const [x,z] of [[-56,-27],[56,-28],[-56,31],[56,33]])place(x,z,5,2.5,4,.3);
  this.finishBatches();templates.forEach(m=>m.dispose());loaded.meshes.filter(m=>!m.isDisposed()).forEach(m=>m.dispose());
 }
 private finishBatches(){for(const list of this.batches.values()){if(!list.length)continue;const merged=Mesh.MergeMeshes(list,true,true,undefined,false,false);if(merged){merged.isPickable=false;merged.receiveShadows=true;merged.freezeWorldMatrix();this.shadows.addShadowCaster(merged);}}this.batches.clear();}
 update(time:number){for(let i=0;i<this.animatedFlags.length;i++){const f=this.animatedFlags[i];f.rotation.y=Math.sin(time*2.5+i)*.075;f.scaling.x=1+Math.sin(time*3+i)*.06;}for(let i=0;i<this.water.length;i++)(this.water[i] as Mesh&{alpha:number}).alpha=.15+Math.sin(time*1.2+i*2)*.1;}
 setPoint(id:number,owner:number,progress:number,contested:boolean){const hex=contested?'#efc272':owner===0?PALETTE.teal:owner===1?PALETTE.copper:'#d4c094';this.points[id].material=this.mat(hex,true);this.flags[id].material=this.mat(owner===0?'#367f76':owner===1?'#9b4d35':'#9d9179');this.flags[id].material!.backFaceCulling=false;this.flags[id].position.y=heightAt(POINTS[id].x,POINTS[id].z)+3.3+progress*1.6;}
 freezeShadows(){const map=this.shadows.getShadowMap();if(map)map.refreshRate=0;}
}
