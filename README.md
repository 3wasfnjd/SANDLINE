# SANDLINE — خط الرمل

A complete, single-map, player-versus-AI tactical battle for the browser. Command the fictional **Oasis Guard / حرس الواحة** against the **Copper Legion / الفيلق النحاسي** in Wadi al-Sidr. No account, base construction, store, or backend service is required.

## Run and build

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
npm run build
```

`dist/` is a self-contained static deployment. Serve over HTTPS with normal Brotli/gzip compression. There are no required environment variables, third-party asset hosts, or external font calls. The renderer selects desktop WebGPU when supported, with WebGL2 as the mobile baseline. If the browser denies graphics contexts entirely, a reduced-detail Canvas compatibility renderer projects the same Babylon environment geometry and runs the same simulation.

```sh
npm run assets
npm run typecheck
npm run test:simulation
node --import tsx tests/assets.ts
node --import tsx tests/benchmark.ts
```

The authored GLB is checked into `public/assets`; asset generation is not needed for a normal build. Babylon.js is pinned through the lockfile (8.56.2). The source is TypeScript with Vite.

## Play

- Press **إلى الجبهة** to start and enable audio.
- Tap a friendly formation or its card. Tap ground to move, a flag to capture, or a visible enemy to attack.
- Drag the battlefield to pan. Pinch, wheel, or use the +/− buttons to zoom.
- **متعدد** toggles multiple selection; Shift-click also adds or removes a squad.
- **ثبّت / F:** hold ground. **انسحب / R:** return to base, recover, and replace fallen squad members after regrouping.
- **تماسك:** remove suppression and increase fire rate for five seconds; 35-second recharge.
- **1–6:** select a squad. **A:** select all. Arrow keys pan. Space/Escape pauses.
- The top A/B/C indicators center the camera. World flag labels issue capture orders when squads are selected.
- The sound button remembers its setting. Backgrounding the tab automatically pauses the match.

You start with 500 tickets. Holding two of three locations drains the enemy's tickets; holding all three increases the drain. Casualties and replacement squads also cost tickets. At seven minutes the higher ticket count wins. Decisive matches can finish earlier. A tie is displayed explicitly. The ending stays in the battlefield and offers an immediate new match.

## Forces

Both factions use the same unit statistics. Each side has five six-person squads plus one kinematic armored vehicle, for **30 infantry + 1 vehicle per faction**.

| Unit | Role |
| --- | --- |
| Rifle × 2 | Balanced maneuver and capture |
| Assault | Fast flanking and close engagement |
| Machine gun | Long-range suppression and lane defense |
| Anti-armor | One rocket specialist with supporting riflemen |
| Rimal light armored vehicle | Mobile fire support; cannot capture |

Directional cover, elevation, movement accuracy, suppression, reloads, and flanking affect combat. Bullets use hit calculations plus visible tracers. Vehicles accelerate, steer, align to slopes, turn turrets, recoil, and emit dust. Elimination triggers a replacement after 32 seconds for eight tickets; no paid or external economy exists.

## Project layout

| Location | Responsibility |
| --- | --- |
| `src/core/` | Pure simulation, unit data, map, A*, spatial grid, commander and squad AI |
| `src/render/` | Babylon scene, modular environment, GLB instancing, LOD, pose animation, VFX, audio, compatibility rendering |
| `src/ui/` | Arabic HUD, start/end/pause/help overlays, squad selection and orders |
| `src/input.ts` | Pointer gestures, terrain ray projection, camera and keyboard controls |
| `src/main.ts` | Application lifecycle, fixed simulation step, presentation, adaptive quality |
| `scripts/generate-assets.ts` | Reproducible, original GLB authoring and LOD generation |
| `tests/` | Full-match simulation tests, asset validation, CPU benchmarks and responsive preview frames |
| `docs/` | Architecture, performance decisions, validation evidence and limitations |

See [architecture](docs/architecture.md), [asset pipeline](docs/assets.md), and [validation](docs/validation.md). All game models, environment geometry, interface symbols and synthesized sounds were authored for this project. Cairo is bundled under its SIL Open Font License; dependency licenses remain with their respective authors.

## Scope

This release is one reusable match with full start → command → capture/combat → result → restart flow. It deliberately excludes multiplayer, accounts, campaign maps, monetization, destructive terrain, heavy armor and artillery. Those systems are not partially exposed in the interface.

Actual iPhone Safari and Android hardware performance has not been certified in the development environment. See the validation report before treating the 30 FPS mobile target or the 500-unit experiment as a measured device result.
