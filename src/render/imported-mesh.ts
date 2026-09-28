import {Mesh} from './babylon';

/** Normalize glTF winding before mixing imported geometry with native batches. */
export function bakeImportedMesh(mesh:Mesh){
 mesh.bakeCurrentTransformIntoVertices(true,true);
 const nativeOrientation=mesh.getScene().useRightHandedSystem?0:1;
 // The glTF loader uses the opposite winding. Baking the mirrored root does
 // not convert this setting; switching the setting alone would cull front faces.
 if(mesh.sideOrientation!==nativeOrientation)mesh.flipFaces();
 mesh.sideOrientation=nativeOrientation;
}
