# Performance engineering

## Shipping match

The playable match contains 60 infantry and two vehicles. It targets a steady 30 FPS on mid-range mobile devices and up to 60 FPS on stronger hardware. These are engineering targets, not measured iPhone/Android results.

The 500-combatant test is explicitly experimental. Raising population is not a gameplay quality setting and is not required to win or complete the released match.

## Implemented costs and limits

- Fixed 30 Hz simulation, shared squad paths, 1.4-second commander decisions, one spatial hash rebuilt per simulation step.
- Articulated geometry is submitted through thin-instance batches; matrices and colors use preallocated typed arrays. Capacity is 1,024 instances per part, sufficient for both limbs of a 500-person stress case.
- Static objects batch by material and map chunk, allowing normal frustum culling. No hardware occlusion queries or per-building dynamic LOD work is scheduled on the CPU.
- Three authored unit LODs; 2,392 / 657 / 366 triangles per rifleman before the far-detail forearm omission.
- One cached 1,024-pixel environment shadow map, reduced to 512 at low quality. Unit contact shadows replace expensive per-soldier shadows.
- Particle counts are bounded, sound concurrency is limited to 14 one-shots, and individual projectiles are never rigid bodies.
- High pixel density is capped at 1.5. Sustained frame times above 37 ms reduce render scale and visual effects in stages. This changes presentation only. The system avoids repeated up/down quality oscillation.
- Initial content is the only map, unit GLB, local font subsets and generated essential effects. Audio buffers are synthesized on the start interaction. Babylon loads shader/material chunks as needed; there are no large secondary asset sets to preload.

The main JavaScript bundle after import pruning is approximately 1.82 MB raw / 455 KB gzip at the measured build. Shader/material chunks load separately. The authored GLB is 234,152 bytes. These are build byte counts, not a measured time-to-interactive over cellular networks.

## Benchmarks

`tests/benchmark.ts` executes 90 seconds of moving, firing squads, commander AI, capture and vehicles at 30, 60, 100, 200, 300 and 500 total combatants. The exact latest CPU results are stored in `benchmark-cpu.json`; raw match runs are stored in `match-tests.json`.

The development server also supports `/?stress=30`, `60`, `100`, `200`, `300` and `500`. These scenes run the commander on both sides, render moving/firing formations and add periodic vehicle-explosion VFX loads. A visible internal readout reports the renderer, shots, live particles and recent frame rate. This branch and its readout are guarded by `import.meta.env.DEV` and are removed from production output. The normal game never exposes population or test controls.

These timings come from Node.js on the execution host. They exclude rendering, DOM, sound mixing, real network transfer, browser memory pressure, phone thermal throttling and battery behavior. They must never be presented as browser/mobile FPS.

## Remaining hardware acceptance work

Use actual iPhone Safari and mid-range Android Chrome to measure a full match, including artillery-free but effect-heavy vehicle destruction, repeated retreat/reinforcement and several restarts. Record 95th-percentile frame time, cold load transfer/time, peak memory and performance after ten minutes of thermal load. Check actual pinch gestures, audio interruptions, tab suspension and rotation. Validate both a WebGL2 phone and a WebGPU desktop before certifying those device tiers.

The development cloud browser exposes no WebGL context. Its completed gameplay test uses the compatibility renderer. This limitation is not treated as a failure of the phone GPU path, nor as proof that that path is correct on every device.
