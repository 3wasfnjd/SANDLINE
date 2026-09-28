# Validation record — 28 September 2026

## Actually exercised

The development browser is remote desktop **Chrome**. Its environment refuses WebGL contexts (`GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`). The game therefore uses its explicit Canvas compatibility renderer during these browser checks. This report does not call that a Safari, Android or WebGPU test.

Completed through the visible interface:

- Opening battlefield, local fonts, faction identities, single-button start.
- Start button switches to the match HUD and initializes 500/500 tickets and a seven-minute clock.
- Selection using world markers and squad cards, issuing capture orders across multiple sites, and selecting three squads together.
- Active enemy attacks, friendly casualties, timed replacement squads and objective ownership changes.
- Rally action/cooldown and retreat command.
- Pause panel, resume, and preserved state.
- A complete natural match ending in **Defeat at 05:37**, with 37 individual losses, 31 current survivors and no controlled sites. The ending screenshot is in `qa/ending.jpg`.
- **New Battle** resets the tickets to 500/500, the clock to 07:00, all six friendly cards, and neutral capture sites without reloading the page or rebuilding the world.
- Portrait layout in an actual **390 × 844 iframe viewport**, including starting, selecting a squad, viewing its command bar, and tapping the ground to move. The squad marker moved from approximately (125, 451) to (136, 353) in the frame. This verifies layout and pointer behavior in Chrome; it is not real mobile touch hardware.
- Landscape layout in an **844 × 390 iframe viewport**, including start, roster selection and a capture order. The opening camera framing is shifted toward the deployment line on short landscape screens so troops remain above the command bar.

## Automated gates

`tests/assets.ts` checks the GLB binary header/length, all 36 named source/LOD parts, a single primitive per part, nonempty geometric LODs, and soldier triangle budgets. Measured GLB size after the imported-geometry correction: 236,268 bytes. Rifleman geometry: 2,392 / 657 / 366 triangles.

`tests/simulation.ts` validates building-safe A* routes, directional cover, reaching/capturing a point, retreat recovery, active combat/deaths/replacements, match termination, victory/defeat, time-limit draw and reset. It runs full matches with fixed seeds. See `match-tests.json` for exact outcomes.

The tactical regression uses equal starting forces: a distributed two-flank plan wins; overconcentration on one flank loses despite inflicting heavy losses. This guards the intended emphasis on territory rather than kill count alone.

`tests/benchmark.ts` exercises 30–500 combatants with movement, shooting, commander decisions and vehicles. See `benchmark-cpu.json`. These are host CPU simulation timings, not device rendering FPS.

The development rendering stress scenes were also opened at 30, 60, 100, 200, 300 and 500 combatants, with live shots, dust and periodic explosion effects. `benchmark-browser.json` contains the observed short samples. The Canvas compatibility renderer slowed severely at 300–500 combatants. Samples differ in simulated duration and load and must not be treated as a controlled comparative benchmark. The released match remains 62 total combatants.

## Visual pass

Reviewed at the actual gameplay camera: start composition, Arabic text hierarchy, restrained HUD, faction colors, terrain elevations, road contrast, layered rock silhouettes, palm fronds, mud-building facades and world labels. Corrected road overdraw in the compatibility renderer, a glTF multi-primitive export error, collapsed distant limb geometry, intro marker/title overlap, and restart tutorial state. Direct mobile ground-tap testing caught a missing Babylon ray-picking side-effect import after bundle pruning; it was restored and the movement command was retested successfully.

## Limitations to preserve in release communication

- No physical iPhone, Android phone, Safari or WebGPU desktop was available for certification. The GPU rendering path uses Babylon APIs and passes build/asset checks, but hardware visuals and shader behavior still require device testing.
- The compatibility renderer intentionally has simpler units, lighting and transitions. Screenshots captured in this environment show that path.
- No claim of sustained 30/60 FPS on target phones, thermal endurance, browser memory limits or cellular load time is made.
- Pinch gestures, interrupted mobile audio and device rotation have not been exercised on real touch hardware.
- No recorded voice acting or licensed animation library is included. Sounds are authored synthesis; animation uses a shared procedural articulated rig.
- The optional WebMCP registry was unavailable in the browser; agent tools were not validated by invocation. Ordinary game controls were used for acceptance.
- The match is self-contained; refresh begins a fresh session. There are no accounts, campaign save files or multiplayer services.

The release is a complete playable first game build, with the device-certification limits above, rather than a claim that all target hardware has passed a commercial release matrix.

## Motri environment update

The environment update was reviewed again in the same remote Chrome compatibility renderer, including the imported basalt geometry, terrain layers, oasis and planting, cloud shadows, rainfall and the 390 × 844 portrait layout. Desktop and portrait capture commands still work. A further naturally ending desktop match reached Defeat at 04:54 (12 individual losses, 31 remaining); restarting reset both ticket counters to 500 and the seven-minute clock, and capture orders were issued again. This is a sparse-orders UI acceptance run, not a balance benchmark.

A short development stress scene with 60 combatants was observed during rain at about 36 simulated seconds: 651 shots, 88 live effect particles and approximately 31 FPS in the Canvas compatibility renderer. This is one uncontrolled remote-browser sample, not a measured phone target or a comparison with the baseline.

The new `tests/imported-geometry.ts` exercises the actual Babylon glTF importer for all 39 unit and scenery meshes. It verifies finite positions/normals and front-face winding after transform baking. This caught and corrected both the imported-mesh orientation mismatch and an undefined vehicle rotation default in the asset generator. Asset checks and the TypeScript build pass. The continuous weather function was sampled every 0.1 second across three full cycles to check bounds and transition continuity. Shared simulation and navigation files were not changed.

New reference captures: `qa/motri-environment.jpg` and `qa/motri-portrait.jpg`. They show the compatibility renderer. The GPU effects and real-device limitations above still apply.
