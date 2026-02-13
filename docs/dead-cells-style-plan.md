# Dead Cells Style Implementation Plan: Piano Lessons

**Objective:** Adapt the visual architecture of *Dead Cells* to the Piano Lessons waterfall. The goal is not pixel-accurate recreation but capturing the same perceptual qualities: depth, weight, atmosphere, and tactile impact.

**Reference:** `docs/Dead Cells Visual Architecture_ A Deep Dive.md`

---

## 1. Pseudo-Pixel Rendering

**Why:** *Dead Cells* looks hand-drawn yet impossibly fluid because it renders 3D skeletal rigs as low-res sprites with anti-aliasing disabled. The result is 60fps animation with hard pixel edges — the viewer reads "retro" while the motion reads "modern."

**Our adaptation:** We have no 3D rigs, but we share the same output goal. All canvas rendering disables image smoothing, all CSS elements use `image-rendering: pixelated`, and the animation loop targets 60fps via `requestAnimationFrame`. The result is fluid motion on pixel-snapped geometry.

## 2. Atmosphere: The "Thick Air" Effect

**Why:** The world of *Dead Cells* feels heavy and humid because the developers simulate a literal volume of air between the camera and the action. Without this, 2D art looks flat — elements exist on the same plane regardless of their intended depth.

Three techniques create this illusion:

- **Volumetric Light Shafts ("God Rays"):** Diagonal, semi-transparent additive shapes that shimmer over time, simulating light piercing through dust or grates. They anchor the eye and break up horizontal monotony.
- **Suspended Particulate Matter:** Each biome has unique, continuous particle emitters at multiple depths (foreground, midground, background). Dust drifts in the *Prisoners' Quarters*, bubbles rise in the *Toxic Sewers*, ash blows across the *Ramparts*. This creates a literal volume of air between layers. In our adaptation, each theme produces distinct particle behavior via `THEME_PARTICLE_BEHAVIORS` — rising embers (warm), heavy pixel debris (8bit), phosphor flicker (mono), tuned bursts (others).
- **Fog Sheets and Gradients:** Semi-transparent gradients placed *between* parallax layers. The further back a layer is, the more fog washes out its contrast, pushing it into the distance. This is the cheapest and most effective depth cue.

## 3. Parallax Composition

**Why:** Extreme parallax depth grounds the camera in physical space and establishes scale. Without it, the waterfall is a flat scrolling surface. With it, the notes fall through a space that feels like a room.

- **Extreme Parallax Depth:** 4 to 6 distinct scrolling planes at different speeds. The speed differential is what creates the perception of depth — a 20:1 ratio between the fastest and slowest layers is not unusual in *Dead Cells*.
- **Foreground Occlusion:** Silhouetted, out-of-focus elements placed between the camera and the action. As the scene scrolls, these objects briefly wipe the viewport, reminding the viewer that they're looking *through* something — grounding the camera in the physical space.
- **Macro-Scale Backgrounds:** Massive architectural structures in the furthest layers that move at glacial speed. Their sheer size, revealed slowly, emphasizes the vastness of the space behind the play area.

## 4. Lighting and Materiality

**Why:** *Dead Cells* looks expensive because its 2D sprites react to light as if they were 3D objects. When a fireball explodes to the player's right, the right side of the character illuminates while the left falls into shadow. This is achieved through normal maps generated from the original 3D models.

We can't generate true normal maps, but we can approximate the perceptual result:

- **Fake Normal Mapping:** Static directional gradients on note surfaces that simulate a consistent top-left light source. This creates the illusion of volume on flat rectangles.
- **Dynamic Side-Illumination:** Active keys bleed colored light to inactive neighbors via gradient overlay divs (3-4px wide, 20-25% opacity). Active keys also emit self-illumination on edges where no neighbor is active. Black key AO overlays tint to the active key's color.
- **Grunge and Texture:**
    - Pixel dithering on UI panels via `background-image` checkerboard layers with per-theme tinting (mono green, warm amber, 8bit stronger white).
    - Specular highlights on black keys (3x1px glint at top-left on idle keys) and panel top edges (inset `box-shadow`).
    - ~~Keyboard cavity dithering~~ — removed, invisible at rendered scale (cavity hidden behind keys).

## 5. Color Theory and Biome Identity

**Why:** *Dead Cells*' combat is fast and chaotic. The player must instantly distinguish threats from background. The art direction solves this through aggressive color separation.

- **Complementary Contrast:** High-saturation, high-contrast foreground (gameplay area) against low-contrast, desaturated, often monochromatic backgrounds. Our parallax layers already achieve this — they're low-opacity grids and gradients, while notes use full theme saturation.
- **Gameplay Saturation:** Interactables (notes, active keys, telegraphs) use aggressive, neon colors. The existing theme accent system provides this per-theme.
- **The Alchemic Palette:** *Dead Cells* blends cold medieval gothic (blues, greys, cold purples) with vibrant alchemy (glowing flasks, magical runes). Our equivalent is the per-theme atmosphere color paired with the theme accent — cold structure with hot interaction.

## 6. Post-Processing Stack

**Why:** The post-processing stack glues disparate elements — sprites, tilesets, particles, lighting — into a cohesive image. Without it, individual techniques look like layers stacked on top of each other rather than a unified scene.

- **Bloom (Glow):** The most dominant effect in *Dead Cells*. Light sources and saturated elements are pushed past 100% brightness, bleeding color into surrounding pixels. This creates the signature "neon against dark stone" look. Bloom runs on all themes with per-theme intensity via `THEME_VFX_PROFILES.bloomAlpha` (0.35 for 8-Bit to 0.70 for Hi-Bit). Quarter-resolution offscreen canvas with additive compositing.
- **Color Grading / LUTs:** Each theme applies biome-specific color grading via `THEME_COLOR_GRADES` — multiply compositing for shadow tints (teal-blue, deep brown, dark green, etc.) and screen compositing for highlight tints. Applied after bloom, before scanlines.
- **Chromatic Aberration:** Per-theme RGB channel offset on the bloom layer. Cool, Warm, 16-Bit, and Hi-Bit get 1px offset at varying alpha. Mono and 8-Bit have no chromatic offset (matches their aesthetic). Configured via `THEME_VFX_PROFILES`.
- **Vignetting:** Cinematic radial gradient overlay (`radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0, alpha) 100%)`) with per-theme intensity via `--vignette-alpha` CSS custom property. Placed at `z-index: 9990`, `pointer-events: none`. Mono strongest (0.5), 8bit lightest (0.3).

## 7. "The Juice" (Game Feel)

**Why:** In *Dead Cells*, visuals are tied directly to tactile feedback. The post-processing and animation systems are constantly hijacked to emphasize power and impact. Without juice, the same action feels weak.

- ~~**Hitstop:**~~ Implemented (35ms procedural freeze) but removed — freezing the visual timeline in a music game created audio-visual desynchronization that conflicted with the core gameplay feel.
- ~~**Screen Shake & Frame Distortion:**~~ Implemented (decaying sinusoidal displacement triggered after hitstop) but removed — shaking the falling notes and keyboard was too distracting for a piano practice tool.
- **Physics-Driven Particles:** Sparks and debris are not animations — they are physics objects that bounce off floors and walls. Burst, debris, and pixel_debris particles collide with the keyboard line (`floorY`), bouncing with 40% energy retention and 80% friction. Micro-bounces (velocity < 10px/s) expire immediately to prevent infinite settling.

---

## Implementation Roadmap

### Phase 1: Atmosphere & Parallax — ✅ COMPLETED
- [x] Volumetric God Rays with per-theme atmosphere colors and animated shimmer.
- [x] Multi-depth suspended particulate matter (spores) with parallax-scaled physics.
- [x] 6-plane parallax composition with fog sheets and foreground occlusion.
- [x] Fake normal mapping on waterfall notes (static 135-degree directional gradient + specular cluster).
- [x] Migrated rendering to imperative engine class to bypass React Compiler instability.
- [x] Unified CSS scroll animation mechanism for all parallax layers.

### Phase 2: Lighting, Texture & Color Identity — ✅ COMPLETED
- [x] Dynamic side-illumination on keys from active note impacts (gradient overlay divs, not box-shadow — CSS `var()` colors don't support hex opacity suffixes).
- [x] Biome-specific color grading (multiply/screen shadow/highlight tinting per theme via `THEME_COLOR_GRADES`).
- [x] Theme-specific particle behaviors: rising embers (warm), heavy pixel debris (8bit), phosphor flicker (mono), tuned bursts (others) via `THEME_PARTICLE_BEHAVIORS`.
- [x] All VFX enabled on all themes with per-theme tuning via `THEME_VFX_PROFILES` (bloom, chromatic aberration, scanlines, phosphor persistence).
- [x] Black key AO tinted by active neighbor color.
- [x] White key cutout depth aligned with black key bottom edge (98px).
- [x] Pixel dithering on UI panels (background-image checkerboard, per-theme tinting).
- [x] Specular highlights on black keys (3x1px glint) and panel top edges (box-shadow).

### Phase 3: Post-Processing & Juice — ✅ COMPLETED
- [x] Stronger bloom with per-theme intensity tuning (via `THEME_VFX_PROFILES.bloomAlpha`).
- [x] Chromatic aberration across all applicable themes (Cool, Warm, 16-Bit, Hi-Bit — per-theme offset/alpha).
- [x] CRT scanlines on all themes (per-theme alpha via `THEME_VFX_PROFILES.scanlineAlpha`).
- [x] Phosphor persistence on all themes (accent-colored, per-theme duration).
- [x] Dedicated vignette overlay with per-theme intensity (`--vignette-alpha` CSS variable).
- [x] Physics-driven particles that collide with keyboard geometry (bounce with energy loss).
- ~~Screen shake~~ — removed, too distracting for piano practice.
- ~~Hitstop~~ — removed, audio-visual desync conflicts with musical game feel.

---

## Challenges & Mitigations

### 1. Audio-Visual Desynchronization (Hitstop) — RESOLVED
- **Challenge:** Freezing the visual timeline while audio continues creates cumulative drift. In dense musical passages, the waterfall falls behind the music.
- **Resolution:** Hitstop was removed entirely. The technique works well in combat games where pauses emphasize impact, but in a music game, even small audio-visual drift degrades the core experience.

### 2. React Compiler Instability
- **Challenge:** The React Compiler generates internal dependency arrays at compile time. Adding new variables, control flow, or hook references inside effect/callback bodies changes the array size, causing a runtime crash: *"The final argument passed to useEffect changed size between renders."*
- **Mitigation:** All complex rendering logic lives in an imperative class that owns its own rAF loop. The React component is a thin wrapper (~70 lines) that syncs props to the engine via `useEffect`. This cleanly separates the compiler's memoization scope from the frame-by-frame rendering.

### 3. Parallax Animation Continuity
- **Challenge:** CSS `background-position` animations "jump" when looping if the keyframe endpoint doesn't match the pattern's repeat size.
- **Mitigation:** A single `animate-scroll` keyframe scrolls to `var(--scroll-size)`. Each layer sets its own `--scroll-size` to match its `background-size` (128px, 64px, 32px, etc.), guaranteeing seamless loops. All 4 scrolling layers use this one mechanism, with `--scroll-duration` controlling relative speed.

### 4. Performance Constraints
- **Challenge:** Full-screen `filter: blur()` is GPU-expensive. Ambient particles continuously accumulating trigger the bloom composite pass even when no notes are playing.
- **Mitigation:** Replaced blur with pre-baked CSS gradients for occlusion. Bloom pass is gated by an `activeBurstCount` threshold so ambient spores don't trigger it. Particle pool uses `_activeCount` tracking for O(1) early-out — when nothing is active, the entire 1200-particle loop is skipped.

### 5. Particle Pool Saturation
- **Challenge:** Each note-on emits ~23 particles (burst, foreground, shockwave, debris). A 10-note chord produces ~230 in one frame. Multiple rapid chords can approach the 1200 pool limit.
- **Mitigation:** Graceful degradation — the pool silently drops emissions when full, so visual density plateaus rather than crashing or allocating. Phase 3 will add physics-driven particles, increasing per-note counts, so pool budgeting may need revisiting.

### 6. CSS `var()` Colors in Dynamic Styles
- **Challenge:** Active note colors are CSS variable strings (e.g. `var(--color-note-left)`). Appending hex opacity suffixes like `${color}80` produces invalid CSS (`var(--color-note-left)80`), silently breaking `box-shadow` and `backgroundColor` styles.
- **Mitigation:** Use gradient overlay `<div>` elements with opacity classes instead of `box-shadow` for color effects that reference CSS variable colors. This pattern is used for key side-illumination.

### 7. Sub-Pixel-Scale Effects — PARTIALLY RESOLVED
- **Challenge:** Some effects designed on paper are invisible at the rendered scale because the target surfaces are too small or the contrast is too low.
- **Resolution:** Keyboard cavity dithering was removed (hidden behind keys). But dithering on `.pixel-panel` (dark mid-tone surfaces) and specular highlights on black keys (dark surface = good contrast) are visible and effective. The lesson: target surfaces with adequate contrast.
