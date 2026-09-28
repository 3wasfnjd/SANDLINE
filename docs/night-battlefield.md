# Storm-night battlefield

The loading poster's cold blue/charcoal palette now continues into the playable map. Terrain vertex colors, roads, vegetation, buildings, soldiers, vehicles and the HUD share the night palette. Friendly cues are cyan-blue; enemy cues remain warm orange.

Continuous light rain, restrained fog and cool directional/hemisphere lighting establish the atmosphere. Ground specular response suggests wetness without reflection passes. Small emissive lamps and a single vertex-alpha light-pool mesh provide warm landmarks without additional dynamic lights. The Canvas compatibility renderer draws equivalent bounded radial pools. Existing adaptive rain limits remain in effect. Weather does not change simulation, targeting, navigation or AI.

Validation: production TypeScript/Vite build and renderer-registration check; Chrome browser visual inspection at desktop size and in the 390x844 mobile-layout harness; start, squad selection and capture-point movement command checked. This environment uses the Canvas compatibility renderer because hardware graphics are unavailable. WebGL/WebGPU lighting and physical iPhone/Android performance still require device validation.
