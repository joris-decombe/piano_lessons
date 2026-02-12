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
- **Suspended Particulate Matter:** Each biome has unique, continuous particle emitters at multiple depths (foreground, midground, background). Dust drifts in the *Prisoners' Quarters*, bubbles rise in the *Toxic Sewers*, ash blows across the *Ramparts*. This creates a literal volume of air between layers. In our adaptation, each theme should produce distinct particle behavior — not just different colors.
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
- **Dynamic Side-Illumination:** When a note impacts, neighboring keys and frame elements should brighten on the side facing the impact and darken on the opposite side. This simulates the light-pixel interaction that makes *Dead Cells*' 2D surfaces feel three-dimensional.
- **Grunge and Texture:**
    - **Dithering:** Checkerboard pixel patterns to blend colors manually, creating gritty textures on furniture surfaces. Avoids the "flat Flash-game" look.
    - **Specular Highlights:** High-contrast white pixel clusters on edges to simulate wet or reflective surfaces catching ambient light.

## 5. Color Theory and Biome Identity

**Why:** *Dead Cells*' combat is fast and chaotic. The player must instantly distinguish threats from background. The art direction solves this through aggressive color separation.

- **Complementary Contrast:** High-saturation, high-contrast foreground (gameplay area) against low-contrast, desaturated, often monochromatic backgrounds. Our parallax layers already achieve this — they're low-opacity grids and gradients, while notes use full theme saturation.
- **Gameplay Saturation:** Interactables (notes, active keys, telegraphs) use aggressive, neon colors. The existing theme accent system provides this per-theme.
- **The Alchemic Palette:** *Dead Cells* blends cold medieval gothic (blues, greys, cold purples) with vibrant alchemy (glowing flasks, magical runes). Our equivalent is the per-theme atmosphere color paired with the theme accent — cold structure with hot interaction.

## 6. Post-Processing Stack

**Why:** The post-processing stack glues disparate elements — sprites, tilesets, particles, lighting — into a cohesive image. Without it, individual techniques look like layers stacked on top of each other rather than a unified scene.

- **Bloom (Glow):** The most dominant effect in *Dead Cells*. Light sources and saturated elements are pushed past 100% brightness, bleeding color into surrounding pixels. This creates the signature "neon against dark stone" look. Bloom already exists in our effects pipeline but needs stronger bleed and per-theme tuning.
- **Color Grading / LUTs:** Each biome is painted with a specific color grade — shadows shifted toward teal, highlights toward orange (or biome equivalents). We don't have this yet.
- **Chromatic Aberration:** At the very edges of the screen, RGB channels are slightly separated, mimicking physical lens imperfection. We have a basic version (cool theme only, uniform) that needs to become edge-focused and available across all themes.
- **Vignetting:** Subtly darkened screen corners draw the eye to center. Our fog and atmosphere gradients provide partial vignetting, but a dedicated pass would be more controllable.

## 7. "The Juice" (Game Feel)

**Why:** In *Dead Cells*, visuals are tied directly to tactile feedback. The post-processing and animation systems are constantly hijacked to emphasize power and impact. Without juice, the same action feels weak.

- **Hitstop:** Landing a critical hit freezes *all* visual systems — animation, particles, everything — for a fraction of a second. The momentary stillness simulates immense friction and makes the impact register. Audio continues uninterrupted, creating contrast between the frozen image and the ongoing sound.
- **Screen Shake & Frame Distortion:** Heavy impacts physically shake the camera and briefly distort frame rendering. This breaks the fourth wall — the impact was so hard it shook the "camera."
- **Physics-Driven Particles:** Sparks and debris are not animations — they are physics objects that bounce off floors and walls. Anchoring particles to the physical geometry of the keyboard makes the chaos feel grounded rather than decorative.

---

## Implementation Roadmap

### Phase 1: Atmosphere & Parallax — ✅ COMPLETED
- [x] Volumetric God Rays with per-theme atmosphere colors and animated shimmer.
- [x] Multi-depth suspended particulate matter (spores) with parallax-scaled physics.
- [x] 6-plane parallax composition with fog sheets and foreground occlusion.
- [x] Procedural hitstop — 35ms visual freeze (including particles) on high-velocity impacts.
- [x] Fake normal mapping on waterfall notes (static 135-degree directional gradient + specular cluster).
- [x] Migrated rendering to imperative engine class to bypass React Compiler instability.
- [x] Unified CSS scroll animation mechanism for all parallax layers.

### Phase 2: Lighting, Texture & Color Identity — ⏳ NEXT
- [ ] Dynamic side-illumination on keys from active note impacts.
- [ ] Pixel dithering and specular highlights on piano furniture surfaces.
- [ ] Biome-specific color grading (LUT-style shadow/highlight shifts per theme).
- [ ] Theme-specific particle behaviors (not just colors — e.g. rising embers for warm, falling pixel debris for 8bit, phosphor flicker for mono).

### Phase 3: Post-Processing & Juice — ⏳ PLANNED
- [ ] Stronger bloom with per-theme intensity tuning (currently uniform).
- [ ] Edge-focused chromatic aberration across all themes (currently cool-only, uniform).
- [ ] Dedicated vignette pass (currently approximated by fog gradients).
- [ ] Physics-driven particles that collide with keyboard geometry.
- [ ] Screen shake and frame distortion on heavy impacts.

---

## Challenges & Mitigations

### 1. Audio-Visual Desynchronization (Hitstop)
- **Challenge:** Freezing the visual timeline while audio continues creates cumulative drift. If hitstop fires too often, the waterfall falls behind the music permanently.
- **Mitigation:** Gated triggers — hitstop only fires on high-velocity notes (>0.8) or chords, with a 200ms cooldown and 35ms duration. This bounds worst-case time dilation to 17.5% (35ms per 200ms), but in practice dense passages rarely sustain continuous high-velocity triggers. The hitstop freezes the audio hook's sync loop, the particle system, and ambient spore emission simultaneously, ensuring all visual systems stay in lockstep.

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
