# Asset pipeline

Run `npm run assets` to regenerate the original unit kit at `public/assets/sandline-units.glb`. The source generator builds anatomically proportioned helmets, faces, vests, pouches, limbs, rifles, machine guns, a launcher, and the hull/wheels/turret of a fictional six-wheel armored vehicle. All parts share one vertex-color palette material.

Each part exports as a single glTF primitive. This is validated because a many-primitive export would multiply draws and break name-based batch lookup. On import, the world conversion transform is baked into vertices before detaching the source node for thin instancing.

`bakeImportedMesh` also converts the glTF winding to the native scene convention before shared rendering. `tests/imported-geometry.ts` runs the actual Babylon loader on all 39 unit/environment meshes and checks finite coordinates/normals and agreement between face winding and outward normals. The environment integration exposed an empty-rotation input in the vehicle generator; zero defaults now prevent invalid antenna/turret vertices. The corrected unit GLB is **236,268 bytes**.

LOD1 and LOD2 use color-aware vertex clustering. Clustering cells are bounded by each part's dimensions so narrow limbs cannot collapse into zero-area geometry. `tests/assets.ts` checks the GLB container, primitive counts, nonempty LODs and triangle budgets.

Current rifleman budgets, including both arms/legs and weapon:

| Level | Triangles |
| --- | ---: |
| LOD0 | 2,392 |
| LOD1 | 657 |
| LOD2 geometry | 366 |

The far renderer additionally omits the separate forearms. Vehicle geometry is deliberately under its maximum budget because its forms read at the fixed tactical camera. `public/assets/manifest.json` is the generated per-part count authority.

The terrain, buildings, walls, sandbags, trenches, palms, watchtowers, barriers, storage containers and props are created by the authored modular kit in `world.ts`, then batched by material and map chunk. These are the intended final stylized assets for this release, not debug cubes intended to be swapped later. There are no borrowed military symbols or national faction names.

The small GLB and tiny generated textures do not justify adding a runtime mesh decoder or texture transcoder yet. HTTP compression is sufficient for the current measured payload. KTX2/Basis and Meshopt should be added when authored texture/model size actually warrants their download and decode costs; Draco is not bundled. The asset format is already glTF/GLB, so Blender-authored replacements can be introduced without changing simulation code. Keep the same part names/pivots or update the renderer's rig definition explicitly.

Fonts are local Cairo subsets. All interface icons are original SVG paths. Sounds are generated in the Web Audio graph. No asset depends on an external URL after deployment.

## Motri environment kit

Three basalt meshes are extracted from `3wasfnjd/Motri` at commit `ee7e01dfe848f1bc7e857d51bcee2e687bee21eb`, `static/scenery/scenery.glb`. Their combined runtime GLB is **18,836 bytes**, with 72, 66 and 192 triangles. Only position, normal and index data is retained. Placement, tint and scaling use SANDLINE's tactical obstacle footprints. The original source map, colliders and game systems are not imported.

`scripts/extract-motri-scenery.py /path/to/scenery.glb` reproduces `public/assets/motri-basalt.glb`. It requires Python 3, with no extra packages. The source GLB URL is pinned to that commit; download it from GitHub before running the optional extraction script.

`public/assets/motri-slabs.png` is the original 256 × 256 paving texture from `static/floor/slabs.png` (45,637 bytes), used on small village courtyards. Both assets retain Bruno Simon's MIT notice in `docs/licenses/Motri-MIT.txt`. Combined new authored-source asset transfer is 64,473 bytes before HTTP compression; this excludes new JavaScript.

Motri's fence GLB was inspected but requires Draco. The field rails are authored geometry, avoiding a decoder for a handful of simple rails. Motri's Three.js/TSL shaders are not shipped: terrain layering, vegetation, clouds, rain and wetness are implemented for Babylon's existing material pipeline.
