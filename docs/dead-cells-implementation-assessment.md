# Codebase Assessment & Implementation Strategy: Dead Cells Style

This document provides a technical assessment of the existing "Piano Lessons" codebase and outlines specific strategies for implementing the aesthetic enhancements defined in `docs/dead-cells-style-plan.md`.

---

## 1. Atmospheric Density & VFX
**Target File:** `src/components/piano/EffectsCanvas.tsx` & `src/lib/particles.ts`

- **Volumetric God Rays:** The `EffectsCanvas` already uses an additive rendering pass (`globalCompositeOperation = "lighter"`). We can introduce a `drawGodRays` function that renders skewed linear gradients. These rays will shimmer using a `Math.sin(time)` oscillation on their alpha channel.
- **Depth-Tiered Particles:** The `Particle` interface in `particles.ts` should be updated to include a `z` (depth) property. 
    - **Foreground (z > 1):** Larger size, higher velocity, lower opacity, and `ctx.filter = 'blur(2px)'` to simulate bokeh.
    - **Background (z < 1):** Smaller size, very slow drift, tinted to match the biome's fog color.
- **Enhanced Post-Processing:** The existing `bloomCanvasRef` logic can be extended. We will add a "Vignette" draw pass and refine the chromatic aberration to increase in intensity toward the edges of the canvas.

## 2. Parallax Architecture
**Target File:** `src/components/piano/Waterfall.tsx` & `src/app/page.tsx`

- **Multi-Plane Voids:** Currently, `Waterfall.tsx` renders a single `.waterfall-grid-bg`. This should be refactored into a `ParallaxBackground` component that renders 3-4 layers of grid/architectural silhouettes. Each layer will use a CSS variable `--parallax-speed` to control its `animation-duration`.
- **Foreground Occlusion:** New silhouetted sprites (e.g., chains, bars, or moss) will be added as high `z-index` absolute elements in `page.tsx`. These will use a faster parallax scroll rate than the notes to create the "window" effect.

## 3. Lighting & Materiality
**Target File:** `src/components/piano/Key.tsx` & `src/app/globals.css`

- **Normal Mapping Simulation:** 
    - **Note Shading:** The `.waterfall-note` class in `globals.css` will be updated with a 135-degree gradient: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)`.
    - **Dynamic Key Reflections:** White keys will be updated to react to their neighbors. If a neighboring black key or white key is active, the `Key` component will render a subtle "side-glow" overlay, simulating real-time light spill onto the furniture.
- **Dithering:** We will introduce a 1px checkerboard SVG mask pattern in `globals.css` to be used for all large gradients, replacing soft CSS blurs with gritty, pixel-perfect transitions.

## 4. Kinetic Feedback ("The Juice")
**Target File:** `src/hooks/usePianoAudio.ts` & `src/components/piano/Key.tsx`

- **Hitstop Logic:** We will modify the `syncLoop` in `usePianoAudio.ts`. When a high-velocity note-on event is detected, we will set a `freezeTimer`. The loop will skip state updates (notes moving/particles updating) for the next 50-100ms, creating the "impact friction" sensation.
- **Squash & Stretch:** 
    - **Keys:** Update the `:active` state in `Key.tsx` or `globals.css` to include `transform: scaleX(1.03) scaleY(0.96)`.
    - **Notes:** Add a brief CSS animation to `.waterfall-note[data-active]` that compresses its height for 2 frames upon impact.

## 5. Color Theory & Grading
**Target File:** `src/app/globals.css` (Theme Variables)

- **Biome LUTs:** Each theme (Cool, Warm, Mono, etc.) will define specific "Atmospheric" colors. We will use a full-screen `backdrop-filter: saturate(1.2) hue-rotate(...)` overlay that shifts based on the active theme, acting as a procedural Look-Up Table (LUT).
- **Saturation Strategy:** Refine the palette variables to ensure the `--color-note-*` variables are significantly more saturated than the `--color-bg` and `--color-surface` variables.
