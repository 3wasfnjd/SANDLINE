# Asset pipeline

Run `npm run assets` to regenerate the original unit kit at `public/assets/sandline-units.glb`. The source generator builds anatomically proportioned helmets, faces, vests, pouches, limbs, rifles, machine guns, a launcher, and the hull/wheels/turret of a fictional six-wheel armored vehicle. All parts share one vertex-color palette material.

Each part exports as a single glTF primitive. This is validated because a many-primitive export would multiply draws and break name-based batch lookup. On import, the world conversion transform is baked into vertices before detaching the source node for thin instancing.

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
