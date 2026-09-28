import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {NullEngine,Scene,Mesh,SceneLoader} from '../src/render/babylon';
import {bakeImportedMesh} from '../src/render/imported-mesh';
import '@babylonjs/loaders/glTF/glTFFileLoader';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';

// Checks the actual Babylon glTF import path, not a duplicate JSON-only loader.
// This caught a front-face culling mismatch hidden by the Canvas fallback.
const engine=new NullEngine(),scene=new Scene(engine);
let checked=0;
for(const file of ['sandline-units.glb','motri-basalt.glb']){
 const loaded=await SceneLoader.ImportMeshAsync('','',new Uint8Array(readFileSync('public/assets/'+file)),scene,undefined,'.glb');
 for(const mesh of loaded.meshes){
  if(!(mesh instanceof Mesh)||!mesh.getTotalVertices())continue;
  bakeImportedMesh(mesh);assert.equal(mesh.sideOrientation,1);
  const p=mesh.getVerticesData('position')!,n=mesh.getVerticesData('normal')!,indices=mesh.getIndices()!;
  assert(Array.from(p).every(Number.isFinite),`${mesh.name}: non-finite positions`);
  assert(Array.from(n).every(Number.isFinite),`${mesh.name}: non-finite normals`);
  let agreement=0;
  for(let k=0;k<indices.length;k+=3){
   const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
   const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
   agreement+=(uy*vz-uz*vy)*(n[a]+n[b]+n[c])+(uz*vx-ux*vz)*(n[a+1]+n[b+1]+n[c+1])+(ux*vy-uy*vx)*(n[a+2]+n[b+2]+n[c+2]);
  }
  assert(agreement<0,`${mesh.name}: winding disagrees with outward normals in the left-handed batch`);checked++;
 }
 loaded.meshes.forEach(m=>m.dispose());
}
assert.equal(checked,39);engine.dispose();
console.log(JSON.stringify({importedMeshes:checked,windingAndNormals:'passed'}));
