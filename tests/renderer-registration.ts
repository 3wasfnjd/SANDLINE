import assert from 'node:assert/strict';
import {Engine,WebGPUEngine} from '../src/render/babylon';
// Import precisely the game's pruned entrypoint, not Babylon's barrel export.
// NullEngine and Canvas can otherwise conceal missing GPU extensions.
for(const Backend of [Engine,WebGPUEngine]) {
 for(const name of ['createDynamicTexture','updateDynamicTexture','updateDynamicVertexBuffer','createRenderTargetTexture']) {
  assert.equal(typeof (Backend.prototype as unknown as Record<string,unknown>)[name],'function',`${Backend.name}: missing ${name}`);
 }
}
console.log('WebGL and WebGPU runtime registrations pass (not a hardware rendering test).');
