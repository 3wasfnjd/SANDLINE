# Architecture and gameplay decisions

## Simulation owns truth

`Simulation` has no Babylon or DOM dependency. It stores teams, squads, individual health and formation positions, objective progress, tickets, orders, cooldowns, statistics and match phase. The fixed step is 1/30 second. Rendering frequency and quality never alter damage, navigation, visibility, objective rules or commander decisions. A seeded PRNG makes headless match tests repeatable.

The application caps accumulated work after a long frame instead of trying to simulate minutes in one frame. A background tab pauses automatically. The renderer consumes snapshots of objects and a short-lived event queue; it does not decide hits or captures. Events are consumed and cleared each frame.

## Navigation and formations

- Two precomputed 2-unit grids: infantry clearance and wider vehicle clearance.
- Eight-connected A* without diagonal corner-cutting. A line-of-sight pass smooths the resulting squad path.
- One anchor and one path per squad; soldiers never execute A*.
- Travel formation uses two rows, tight passages use columns, stationary combat uses a wide line.
- Local soldier separation queries a spatial hash. Obstacle checks keep soldiers outside the authored building/rock footprints.
- Cover is a tactical region associated with actual sandbags, walls or trenches. Walls and sandbags protect mainly against fire arriving across the cover; trenches protect more uniformly.
- Buildings block firing rays. Height advantage increases accuracy. Enemy markers disappear outside friendly reconnaissance range; this is local visibility, not a full terrain fog-of-war texture.

## AI hierarchy

The commander evaluates objectives every 1.4 seconds using ownership, contesting enemies, distance, existing friendly assignments and role. Distant enemy threat information is filtered through friendly reconnaissance. Understrength squads retreat and regroup; the commander redistributes surviving forces rather than simply walking every squad toward the player's base.

Squads have idle, move, capture, attack, defend, retreat and regroup states. Attack commands can chase a moving visible target; hold commands preserve position. Each soldier follows its formation slot, steers away from nearby soldiers, aims, fires, reloads and reacts to injury. No behavior tree or pathfinder runs independently on each soldier.

The capture condition requires infantry. Both teams inside a capture region contest and freeze progress. An owned site must first be neutralized. A replacement squad arrives at its base after elimination; retreat instead preserves surviving strength and restores it at base.

## Rendering

The scene uses one sun, one ambient hemisphere, a terrain heightfield and chunked static batches. Modular buildings have roof parapets, arched entrances, shutters, awnings, roof steps and small props. Layered sandstone and feathered palm fronds establish the desert identity. Vertex colors supply the unified palette, with a tiny procedural sand texture for close views.

Environment shadow maps are rendered once and reused. Units receive cheap contact shadows; dozens of fully dynamic shadow casters are avoided. Mild ACES tone mapping and distance fog unify the scene. There is no expensive SSAO, depth of field, bloom stack, full screen blur or full rigid-body physics.

Soldiers use shared articulated parts and a common procedural rig. All instances of a part at a given LOD are one thin-instance batch. Per-instance matrix/color data specifies world pose and faction. Independent phases avoid synchronized marching. Walk/run, breathing idle, aim/fire, reload, hit, crouch and death are produced from the shared pose functions. This is an articulated mesh rig, not a licensed humanoid animation package or hundreds of cloned skeletons.

The GLB contains three geometric LODs per part. LOD changes with camera span. The farthest presentation also omits small forearm detail. No soldier owns a Babylon transform hierarchy or a physics body. Vehicles use the same part batches for hull, wheels and turret.

Dust, muzzle flashes, sparks and explosion plumes use bounded pools and shared buffers. Visible tracers are independent of damage. The effect manager caps visual counts and reduces those counts under adaptive quality. It never drops simulation events or damage to improve FPS.

## Sound

The Web Audio mixer synthesizes weapon transients, heavy shots, explosions, engines, wind, radio acknowledgement and a sparse tonal bed. Panner nodes attenuate and position weapon sounds, and distance lowers the low-pass cutoff. Concurrent one-shot sounds are limited and repeated identical shots are coalesced. Audio is unlocked by the start interaction; mute persists locally. There are no external audio downloads or unlicensed samples.

## Compatibility renderer

If the browser refuses both graphics APIs, the game can use Canvas2D with a Babylon NullEngine. It caches a projection of the same authored environment and draws lighter articulated units, tracers, dust and objective feedback. Camera transitions become direct in this mode to avoid repeatedly rasterizing the static terrain. This path preserves gameplay but is visually less detailed than the GPU renderer. It is a graceful compatibility path, not evidence of GPU performance on a phone.

## Optional browser agent interface

The game feature-detects the proposed `document.modelContext` registry and offers read state, start, friendly squad orders, pause and restart. Coordinates, ownership, life state and enum values are validated. Unsupported browsers run normally. All mutations call the same game functions used by the UI. The development browser did not expose a usable registry, so tool invocation validation was unavailable; actual gameplay was exercised through the interface instead.

## Extension boundaries

New content should be data-driven through `ROLE`, map definitions, GLB parts and event-driven presentation. Flow fields, skinned animation baking, physics engines, networking and additional maps have no runtime dependency in this release. The renderer can be replaced while preserving the pure simulation. A future native packaging effort would still require platform-specific performance work, input adaptation and distribution integration; native/console portability is not claimed as completed.
