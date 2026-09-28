# Night battlefield loading screen

The initial HTML contains the poster and loading shell before the 3D bundle loads. A small entry module loads the game asynchronously. Progress reflects completed startup stages (engine, environment, units, effects and first frame), not a fictitious download-byte percentage. It reaches 100 only when the battle is ready. The poster remains until the player presses Start, then hands directly to the match and unlocks audio.

The hidden game renderer pauses while the ready poster is displayed. Quote changes stop when entering the match. Responsive layouts support portrait and short landscape screens; motion respects reduced-motion preferences. Startup errors still reveal the diagnostic screen, and the WebGPU-to-WebGL retry is preserved.

Artwork: generated with the built-in image generation tool for this project, then encoded as WebP (1672 × 941, 218,066 bytes). Runtime asset: `public/assets/night-battle-poster.webp`. This is illustrated promotional key art, not a claim about in-game tank content or gameplay graphics.

## Generation prompt

Use case: stylized-concept. Asset type: final full-screen loading poster for SANDLINE, a fictional Arabian desert squad tactical war game. Create a cinematic high-end military key art illustration, wide 16:9 composition. A rain-soaked desert village battlefield at night, layered dark rocky escarpments and mud-brick silhouettes. Three realistically proportioned fictional helmeted soldiers in charcoal tactical uniforms advancing in foreground, one slightly right of center, readable rifles, no real national insignia. Two heavy fictional tanks behind them, large gun turrets, dark wet armor, one toward left middle and one further right. Dramatic restrained icy blue rim lighting, storm clouds, angled rain, fog, wet road reflections, a few distant warm amber flashes and tiny embers. Palette dominated by near-black, gunmetal grey, midnight navy, silver blue. Tense, serious, sophisticated cinematic concept art, realistic materials with art-directed silhouettes, not chibi, not primitive low poly. Subjects concentrated in central horizontal band so portrait center cropping still shows soldier and tank. Reserve relatively uncluttered dark sky across top third for live UI title, and dark lower fifth for live loading bar and Arabic copy. No text, no letters, no logos, no watermark, no UI, no gore.

## Validation

Production build and type checking pass. The static HTML loads the poster, local Arabic font and readable controls before the async game bundle. In remote Chrome, desktop and 390 × 844 portrait layouts reached 100%, displayed the enabled Start button, and entered a fresh match with 500/500 tickets. The portrait crop was adjusted to retain a tank and soldiers; the completed bar fills immediately at 100%. This is layout/pointer validation, not physical-phone or GPU certification.
