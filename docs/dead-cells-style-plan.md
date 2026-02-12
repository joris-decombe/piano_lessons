# Dead Cells Style Implementation Plan: Piano Lessons

**Objective:** To adapt the modern "Hybrid HD 2D" visual architecture of *Dead Cells* to the Piano Lessons project.

---

## 1. Pseudo-Pixel Animation Pipeline
*Dead Cells* achieves unnatural fluidity by bypassing traditional 2D animation and rendering 3D rigs as low-res sprites without anti-aliasing.
- **Fluid Interpolation:** Ensure high-frame-rate (60fps) interpolation for all unique animation data (Face Shift, note movement, particles).
- **Zero Anti-Aliasing:** Disable anti-aliasing during rendering to force harsh, jagged pixel edges that mimic traditional retro art while retaining 3D-rig-like fluidity.

## 2. Atmosphere: The "Thick Air" Effect
Simulate atmospheric perspective through layered rendering tricks that create a "literal volume of air."
- **Volumetric Light Shafts ("God Rays"):** Implement diagonal, semi-transparent additive sprites that shimmer to simulate light piercing through dust.
- **Suspended Particulate Matter:** Deploy unique, continuous particle emitters at various depths (foreground, midground, background) to simulate airborne dust, bubbles, or ash.
- **Fog Sheets and Gradients:** Place localized fog gradients between parallax layers. Background layers are tinted by this fog to wash out contrast and push them deeper.

## 3. Parallax Composition
Use extreme parallax depth to ground the camera in physical space and establish scale.
- **Extreme Parallax Depth:** Implement 4 to 6 distinct background scrolling planes.
- **Foreground Occlusion:** Place silhouetted, out-of-focus elements (chains, iron bars, hanging moss) in the extreme foreground to briefly wipe the screen during movement.
- **Macro-Scale Backgrounds:** Use massive architectural structures in the furthest layers that move at a glacial pace to emphasize vastness.

## 4. Lighting and Materiality
Ensure 2D sprites react to light as if they were 3D objects.
- **Dynamic Real-Time Lighting:** Simulate light-pixel interaction where impact flashes or active notes illuminate one side of neighboring elements (keys/frame) while casting the other into shadow.
- **Grunge and Texture:**
    - **Dithering:** Use pixel checkerboard patterns (alternating pixel colors) to blend colors manually, creating gritty textures on stone/wood surfaces.
    - **Specular Highlights:** Use high-contrast white pixel clusters on edges to simulate wet or reflective surfaces reflecting ambient light.

## 5. Color Theory and Biome Identity
Prioritize readability amidst chaos through specific color strategies.
- **Complementary Contrast:** Use high-saturation foregrounds (gameplay area) against low-contrast, desaturated, or monochromatic backgrounds.
- **Gameplay Saturation:** Use aggressive, neon colors (cyan, magenta, toxic green, bright amber) for interactables (notes, active keys, and telegraphs).
- **The Alchemic Palette:** Blend cold medieval gothic architecture (blues, greys, cold purples) with vibrant alchemic elements (glowing flasks, magical runes, bright fires).

## 6. Post-Processing Stack
Use a robust modern stack to "glue" disparate elements together.
- **Bloom (Glow):** Push light sources and saturated elements past 100% brightness to bleed color into surrounding pixels, creating a "neon" look.
- **Color Grading / LUTs:** Apply biome-specific color grades to shift shadows toward teal and highlights toward orange (or theme equivalents).
- **Subtle Chromatic Aberration:** Slightly separate red, green, and blue color channels at the edges of the screen to mimic a physical camera lens.
- **Vignetting:** Subtly darken screen corners to draw the eye to the center of the action.

## 7. "The Juice" (Game Feel)
Directly tie visuals to tactile feedback and power.
- **Hitstop:** Briefly freeze animations and particle systems upon critical note impacts to simulate friction.
- **Screen Shake & Frame Distortion:** Physically shake the camera and briefly distort frame rendering during heavy impacts.
- **Physics-Driven Particles:** Treat sparks and debris as physics objects that bounce off floors and walls (keyboard geometry).

---

## Implementation Roadmap

### Phase 1: Atmosphere & Parallax — ✅ COMPLETED
- [x] Volumetric God Rays and Layered Fog Sheets (Additive gradients in `EffectsEngine`).
- [x] Suspended Particulate Matter (Multi-depth physics-based spores in `particles.ts`).
- [x] 6-Plane Parallax Composition with Foreground Occlusion (`Waterfall.tsx`).
- [x] Procedural Hitstop (35ms freeze on high-velocity impacts in `usePianoAudio.ts`).
- [x] `EffectsCanvas` → `EffectsEngine` migration (~70-line thin React wrapper delegates to imperative class).
- [x] Unified `animate-scroll` CSS mechanism with `--scroll-size`/`--scroll-duration` custom properties for all parallax layers.

### Phase 2: Lighting, Texture & Color Identity — ⏳ NEXT
- [ ] Dynamic Real-Time Lighting (Normal-style interaction on keys).
- [ ] Specular Highlights and Pixel Dithering (Furniture textures).
- [ ] Biome-specific Color Grading and LUTs.
- [ ] Color Theory refinement: complementary contrast (saturated foreground vs. desaturated background), gameplay saturation for interactables. (The existing 6-theme system partially covers "Alchemic Palette" via `THEME_ATMOSPHERE` and `THEME_ACCENTS`.)

### Phase 3: Post-Processing & Juice — ⏳ PLANNED
- [ ] Enhanced Bloom (existing bloom pass + stronger bleed, per-theme tuning).
- [ ] Enhanced Chromatic Aberration (existing cool-theme RGB offset → extend to all themes, edge-focused).
- [ ] Enhanced Vignetting (existing fog/atmosphere gradients → dedicated configurable vignette pass).
- [ ] Physics-Driven Particles (Bounce/Geometric interaction with keyboard boundary).
- [ ] Screen Shake and Frame Distortion.

---

## Challenges & Mitigations

### 1. Audio-Visual Desynchronization (Hitstop)
- **Challenge:** Momentary visual freezes causing cumulative lag behind the audio track.
- **Mitigation:** Refined Hitstop to trigger only on high-velocity notes (>0.8) or chords, with a 200ms cooldown and a reduced 35ms duration. This preserves the "tactile snap" without compromising musical synchronization. Worst-case cumulative drift is bounded: 35ms per 200ms cooldown = 17.5% time dilation ceiling, but in practice dense passages rarely sustain continuous high-velocity triggers.

### 2. React Compiler Safety
- **Challenge:** Adding logic to `EffectsCanvas.tsx` caused "dependency array size" runtime crashes due to automatic memoization.
- **Mitigation:** Migrated all complex rendering and state management to the imperative `EffectsEngine` class. `EffectsCanvas.tsx` is now a ~70-line thin wrapper that syncs React props to the engine and delegates all canvas work. This bypasses the compiler's dependency tracking for the render loop entirely.

### 3. Parallax Animation Glitches
- **Challenge:** Background patterns "jumped" when looping because animation keyframes didn't match pattern sizes.
- **Mitigation:** Implemented a unified `animate-scroll` CSS animation driven by `--scroll-size` and `--scroll-duration` custom properties per layer, ensuring keyframes match the 128px/64px/32px pattern sizes exactly. All 4 scrolling layers (macro, mid, grid, occlusion) use this single mechanism.

### 4. Performance Constraints
- **Challenge:** Computationally expensive `filter: blur()` and constant Bloom from ambient spores.
- **Mitigation:** Replaced full-screen blur with optimized linear gradients for occlusion. Added an `activeBurstCount` threshold so ambient spores no longer trigger the bloom pass unnecessarily. Added `_activeCount` tracking to `ParticleSystem` for O(1) early-out in `update()` and `draw()`, skipping the entire 1200-particle loop when nothing is active.

### 5. Particle Pool Saturation
- **Challenge:** Dense MIDI files can emit ~23 particles per note-on (14 burst + 4 foreground + 2 shockwave + debris). A 10-note chord produces ~230 particles in a single frame. Multiple rapid chords can approach the 1200 pool limit.
- **Mitigation:** The system degrades gracefully — `acquire()` silently drops particles when the pool is full, so visual density plateaus rather than crashing. Phase 3 (Physics-Driven Particles) will increase per-note counts further, so pool size or per-note budgets may need revisiting.
