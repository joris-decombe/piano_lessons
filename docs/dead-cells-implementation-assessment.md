# Codebase Assessment: Dead Cells Visual Implementation

This document assesses the "Piano Lessons" codebase against the technical requirements defined in `docs/dead-cells-style-plan.md`.

---

## 1. Animation & Atmosphere
**Target:** `src/components/piano/EffectsCanvas.tsx`, `src/lib/particles.ts`

- **Fluidity:** The React/Canvas bridge needs to ensure zero-jitter 60fps frame updates. We will preserve the current "pixelated" rendering but remove any sub-pixel smoothing.
- **Atmosphere:** 
    - **God Rays:** Add a draw pass to `EffectsCanvas` using skewed additive sprites.
    - **Particulate Matter:** Extend `ParticleSystem` to support depth-sorted emitters (foreground/mid/back).
    - **Fog Sheets:** Implement as localized CSS or Canvas gradient overlays between parallax layers.

## 2. Parallax & Composition
**Target:** `src/components/piano/Waterfall.tsx`, `src/app/page.tsx`

- **Multi-Plane Scrolling:** Refactor `Waterfall.tsx` to handle 4-6 background layers.
- **Foreground Occlusion:** Introduce absolute-positioned silhouetted sprites in `page.tsx` that scroll at high speeds to briefly wipe the viewport.

## 3. Lighting & Materiality
**Target:** `src/components/piano/Key.tsx`, `src/app/globals.css`

- **Dynamic Lighting:** Update `Key.tsx` to react to active neighbor states, rendering a procedural "side-illumination" shadow/highlight to simulate real-time light interaction.
- **Texture:**
    - **Dithering:** Implement checkerboard SVG patterns in `globals.css` for color blending on furniture surfaces.
    - **Specular Highlights:** Add high-contrast pixel clusters to `.waterfall-note` and `.key-face` borders.

## 4. Post-Processing & "The Juice"
**Target:** `src/hooks/usePianoAudio.ts`, `src/components/piano/EffectsCanvas.tsx`

- **Stack:** 
    - **Bloom:** Enhance existing `bloomCanvasRef` logic in `EffectsCanvas`.
    - **Chromatic Aberration/Vignette:** Move from full-screen to edge-focused Canvas/CSS effects.
- **Juice:**
    - **Hitstop:** Modify the `syncLoop` in `usePianoAudio` to support momentary state-freezes.
    - **Screen Shake:** Apply procedural transforms to the main container based on note velocity.
    - **Physics Particles:** Update `particles.ts` to include basic bounce/interaction logic with the keyboard boundary.
