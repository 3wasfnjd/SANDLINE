import { NullEngine,Scene,Mesh,MeshBuilder,VertexBuffer,VertexData,StandardMaterial,Color3,Vector3 } from '@babylonjs/core';
import { GLTF2Export } from '@babylonjs/serializers/glTF';
import { writeFile,mkdir } from 'node:fs/promises';

// Authored modular assets. Every part shares one vertex-color material, and each
// articulated part is reused by the crowd renderer instead of cloning skeletons.
const engine=new NullEngine({renderWidth:64,renderHeight:64,textureSize:64,deterministicLockstep:false,lockstepMaxSteps:4});
const scene=new Scene(engine);scene.useRightHandedSystem=true;
const material=new StandardMaterial('sandline-palette',scene);material.diffuseColor=Color3.White();material.specularColor=new Color3(.12,.12,.12);
const C={cloth:'#c6c9bd',dark:'#384449',armor:'#7c8b82',leather:'#736a51',skin:'#b78661',steel:'#333d40',edge:'#626a65',sand:'#a49d79',glass:'#294346'};
let parts:Mesh[]=[];
function add(m:Mesh,color:string,pos:number[],rot=[0,0,0]){m.position.set(...pos as [number,number,number]);m.rotation.set(...rot as [number,number,number]);m.bakeCurrentTransformIntoVertices();const c=Color3.FromHexString(color),colors:number[]=[];for(let i=0;i<m.getTotalVertices();i++)colors.push(c.r,c.g,c.b,1);m.setVerticesData(VertexBuffer.ColorKind,colors);m.material=material;parts.push(m);return m;}
function box(w:number,h:number,d:number,pos:number[],c:string,rot=[0,0,0]){return add(MeshBuilder.CreateBox('p',{width:w,height:h,depth:d},scene),c,pos,rot);}
function ellipsoid(x:number,y:number,z:number,pos:number[],c:string,segments=12){return add(MeshBuilder.CreateSphere('p',{diameterX:x,diameterY:y,diameterZ:z,segments:segments>=12?5:segments>=8?3:segments},scene),c,pos);}
function cylinder(top:number,bottom:number,h:number,pos:number[],c:string,rot=[0,0,0],tess=12){return add(MeshBuilder.CreateCylinder('p',{diameterTop:top,diameterBottom:bottom,height:h,tessellation:tess},scene),c,pos,rot);}
function finish(name:string){const m=Mesh.MergeMeshes(parts,true,true,undefined,false,false)!;m.name=name;m.id=name;m.material=material;parts=[];return m;}
// Torso, tactical vest, belt and individually modeled ammunition pouches.
ellipsoid(.58,.64,.34,[0,.3,0],C.cloth,12);box(.52,.49,.35,[0,.3,.035],C.armor);box(.38,.43,.2,[0,.34,-.24],C.leather);
box(.57,.09,.34,[0,.015,0],C.dark);for(const x of [-.18,0,.18])box(.135,.17,.12,[x,.24,.235],C.leather);for(const x of [-.19,.19])box(.065,.52,.045,[x,.33,.23],C.dark);
cylinder(.17,.15,.12,[0,.68,0],C.skin);box(.12,.07,.018,[.13,.49,.225],'#e0cda4');finish('soldier_torso');
// Helmet rim, face, chinstrap, headset, compact night-optics silhouette.
ellipsoid(.29,.35,.28,[0,.035,.012],C.skin);ellipsoid(.38,.27,.36,[0,.185,-.01],C.armor);cylinder(.395,.37,.047,[0,.12,0],C.dark);box(.18,.052,.035,[0,.098,.16],C.dark);box(.14,.043,.018,[0,.108,.183],C.glass);
for(const x of [-.166,.166])box(.05,.16,.105,[x,.035,0],C.dark);box(.07,.07,.1,[0,.25,.145],C.dark);finish('soldier_head');
ellipsoid(.22,.38,.24,[0,-.17,0],C.cloth,8);ellipsoid(.25,.15,.26,[0,-.04,0],C.armor,8);finish('soldier_upperarm');
ellipsoid(.17,.30,.18,[0,-.14,0],C.cloth,8);ellipsoid(.15,.12,.16,[0,-.32,0],C.dark,8);finish('soldier_forearm');
ellipsoid(.245,.49,.26,[0,-.21,0],C.cloth,8);box(.14,.19,.055,[.075,-.16,.015],C.leather);finish('soldier_thigh');
ellipsoid(.19,.39,.2,[0,-.18,0],C.cloth,8);ellipsoid(.2,.16,.07,[0,-.025,.095],C.dark,8);box(.21,.17,.34,[0,-.405,.075],C.dark);finish('soldier_shin');
// Rifle forward is +Z. Distinct barrels and magazines read from the battle camera.
for(const role of ['rifle','mg','at']){
 if(role==='at'){cylinder(.18,.18,1.13,[0,0,.22],C.dark,[Math.PI/2,0,0],10);cylinder(.25,.12,.32,[0,0,.88],C.armor,[Math.PI/2,0,0],8);box(.06,.13,.12,[0,-.12,.2],C.steel);box(.05,.15,.05,[.03,.13,.22],C.dark);}
 else{const length=role==='mg'?.83:.62;box(.11,.15,.41,[0,0,.15],C.steel);box(.09,.12,.27,[0,-.005,-.17],C.dark);cylinder(.05,.06,length,[0,.015,.47],C.steel,[Math.PI/2,0,0],8);box(.09,.19,.12,[0,-.15,.17],C.dark,[.17,0,0]);box(.07,.06,.1,[0,.12,.19],C.dark);box(.1,.1,.25,[0,0,.36],C.edge);if(role==='mg'){box(.21,.2,.22,[-.1,-.1,.1],C.leather);for(const x of [-.1,.1])cylinder(.025,.025,.3,[x,-.14,.81],C.dark,[0,0,x>0?-.4:.4],6);}}
 finish('weapon_'+role);
}
// Six-wheeled fictional reconnaissance carrier: a sloped monocoque hull.
box(2.3,.43,4.45,[0,.84,0],C.dark);box(2.32,.79,3.75,[0,1.3,-.2],C.sand);box(2.05,.61,1.24,[0,1.3,1.85],C.sand,[-.22,0,0]);box(1.82,.62,1.5,[0,1.96,.4],C.armor);
box(1.82,.1,1.66,[0,2.3,.3],C.sand);box(1.45,.32,.025,[0,2.05,1.15],C.glass,[-.15,0,0]);box(.12,.36,.06,[0,2.05,1.17],C.dark);
for(const x of [-1.18,1.18]){box(.16,.32,4.15,[x,1.23,-.1],C.armor);for(const z of [-1.55,0,1.55]){box(.26,.11,.98,[x,1.2,z],C.sand);box(.16,.08,.44,[x*1.09,.73,z+.5],C.dark);}}
for(const x of [-.82,.82]){box(.32,.14,.06,[x,1.47,2.52],'#d8c997');box(.18,.1,.06,[x,1.03,-2.48],'#9c4334');}box(2.48,.18,.14,[0,.84,2.51],C.dark);
box(.63,.16,.75,[.52,1.83,-1.23],C.leather);box(.49,.37,.6,[-.5,1.89,-1.2],C.dark);cylinder(.027,.027,1.8,[-.82,2.6,-1.65],C.dark,[],6);finish('vehicle_body');
cylinder(1.09,1.32,.3,[0,.08,0],C.dark,[],12);box(1.2,.48,1.32,[0,.37,0],C.armor);box(.88,.24,1.1,[0,.71,0],C.sand);cylinder(.115,.17,2.15,[0,.45,1.1],C.steel,[Math.PI/2,0,0],10);box(.22,.18,.28,[0,.45,2.18],C.dark);box(.21,.18,.25,[-.32,.92,.05],C.glass);finish('vehicle_turret');
cylinder(.94,.94,.42,[0,0,0],C.dark,[0,0,Math.PI/2],16);cylinder(.52,.52,.46,[0,0,0],C.edge,[0,0,Math.PI/2],12);cylinder(.19,.19,.49,[0,0,0],C.dark,[0,0,Math.PI/2],8);finish('vehicle_wheel');
const originals=[...scene.meshes] as Mesh[];
for(const source of originals)for(const level of [1,2]){
 const cell=source.name.startsWith('vehicle')?(level===1?.26:.54):(level===1?.14:.245),p=source.getVerticesData(VertexBuffer.PositionKind)!,c=source.getVerticesData(VertexBuffer.ColorKind)!,ix=source.getIndices()!;
 const groups=new Map<string,number>(),remap:number[]=[],sums:{x:number;y:number;z:number;r:number;g:number;b:number;n:number}[]=[],bounds=source.getBoundingInfo().boundingBox,extent=bounds.maximum.subtract(bounds.minimum),cells=[Math.min(cell,extent.x*.6),Math.min(cell,extent.y*.6),Math.min(cell,extent.z*.6)];
 for(let i=0;i<p.length;i+=3){const ci=i/3*4,key=[Math.round(p[i]/cells[0]),Math.round(p[i+1]/cells[1]),Math.round(p[i+2]/cells[2]),Math.round(c[ci]*8),Math.round(c[ci+1]*8),Math.round(c[ci+2]*8)].join(',');let id=groups.get(key);if(id===undefined){id=sums.length;groups.set(key,id);sums.push({x:0,y:0,z:0,r:0,g:0,b:0,n:0});}const s=sums[id];s.x+=p[i];s.y+=p[i+1];s.z+=p[i+2];s.r+=c[ci];s.g+=c[ci+1];s.b+=c[ci+2];s.n++;remap.push(id);}
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],normals:number[]=[],seen=new Set<string>();for(const s of sums){positions.push(s.x/s.n,s.y/s.n,s.z/s.n);colors.push(s.r/s.n,s.g/s.n,s.b/s.n,1);}for(let i=0;i<ix.length;i+=3){const a=remap[ix[i]],b=remap[ix[i+1]],c=remap[ix[i+2]],key=[a,b,c].sort((x,y)=>x-y).join(',');if(a===b||b===c||a===c||seen.has(key))continue;seen.add(key);indices.push(a,b,c);}VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.colors=colors;const lod=new Mesh(source.name+'_lod'+level,scene);data.applyToMesh(lod);lod.material=material;
}
const output=await GLTF2Export.GLBAsync(scene,'sandline-units',{exportWithoutWaitingForScene:true});
await mkdir('public/assets',{recursive:true});
for(const [name,blob] of Object.entries(output.glTFFiles))await writeFile('public/assets/'+name,Buffer.from(await (blob as Blob).arrayBuffer()));
const stats=scene.meshes.map(m=>({name:m.name,triangles:m.getTotalIndices()/3}));await writeFile('public/assets/manifest.json',JSON.stringify({generator:'Sandline original modular assets',meshes:stats},null,2));
console.log(JSON.stringify({meshes:scene.meshes.length,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),files:Object.keys(output.glTFFiles)}));engine.dispose();
