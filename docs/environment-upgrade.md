# Motri environment adaptation — 28 September 2026

## Implemented

- Warm continuous sand, stony soil and olive vegetation masks, inspired by Motri's terrain layering.
- The existing tactical height field, objective layout, navigation, squad balance and match rules remain unchanged.
- Three real basalt models extracted from Motri, fitted to the existing blocking rock footprints. Additional large decorative outcrops sit outside the playable boundary.
- A shallow oasis with colored shoreline, small shoreline stones and animated ripples; grass, sparse sidr trees and irrigated planting strips.
- Original Motri stone-paving texture on village courtyard patches.
- Authored low farm rails; the original fence asset would require adding a Draco decoder, so it is not shipped.
- Cool sky fill, warm sun, moving cloud shadows, gradual cloud/rain transitions, wet ground response, and wind-swaying grass on GPU renderers.
- Bounded rain geometry, synthesized rain/wind ambience, quality scaling and pause-aware weather.

## Sources and size

Motri source snapshot: `ee7e01dfe848f1bc7e857d51bcee2e687bee21eb`.

- `static/scenery/scenery.glb` → `public/assets/motri-basalt.glb`: **18,836 bytes**, three meshes.
- `static/floor/slabs.png` → `public/assets/motri-slabs.png`: **45,637 bytes**.
- Source notice: Bruno Simon, MIT, retained in `licenses/Motri-MIT.txt`.

The terrain map and shaders are rebuilt for this game's camera and Babylon.js. Importing Motri's driving world, Three.js renderer, car physics or multiplayer would add unrelated systems and alter the tactical map.

## Validation boundary

The actual Babylon glTF importer was exercised for all 39 meshes. A winding mismatch and invalid vehicle-rotation defaults were found during this pass and corrected. Finite vertex/normal checks and outward-normal agreement now pass. The shared simulation was not changed by the environment update.

The available browser still denies WebGL. The compatibility renderer displays the shared terrain, imported geometry, vegetation, animated spring ripples, cloud shadows and rain with simpler shading. GPU grass sway, texture appearance, wet specular response and real-device frame rates require an actual WebGL/WebGPU device. No iPhone/Android certification is implied by the responsive browser checks.
