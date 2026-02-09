# Waterfall Animation Upgrade Plan — Hybrid Canvas (Option B)

## Goal

Upgrade the waterfall/keyboard visual effects to match modern pixel art game aesthetics (Dead Cells, Celeste, Hyper Light Drifter) by adding a canvas overlay for particle effects and post-processing, while keeping the existing DOM rendering for notes and keys.

## Current State

- **Waterfall**: React divs with absolute positioning, bevel `box-shadow`, pixel-snapped coordinates via `Math.round()`. Updated every RAF tick. Binary-search culling renders ~100-300 notes.
- **Keyboard**: 88 DOM `Key` components. Active keys get a 1px `translateY` with 75ms CSS transition. Color overlay at 50-60% opacity. Ambient occlusion bands from adjacent black keys.
- **No effects layer**: No particles, glow, bloom, trails, or impact animations exist today.
- **Performance budget**: Currently lightweight. Room to add a canvas layer.

## Architecture: Hybrid Canvas Overlay

```
┌─────────────────────────────────┐
│  Canvas Layer (effects only)    │  z-index above waterfall
│  - Particle system              │
│  - Bloom/glow post-processing   │
│  - Optional CRT/scanline shader │
├─────────────────────────────────┤
│  Waterfall (DOM, unchanged)     │  Existing note divs
├─────────────────────────────────┤
│  Keyboard (DOM, minor tweaks)   │  Existing Key components
└─────────────────────────────────┘
```

The canvas reads positions from the DOM (key positions from `geometry.ts`, active notes from React state) and paints effects on top. No PixiJS dependency — use the native Canvas 2D API (sufficient for our particle count).

## Planned Effects

### Tier 1: Core Impact (implement first)

1. **Note impact particles**
   - When a note crosses the keyboard line, emit 4-8 small pixel particles (1-2px) spraying upward
   - Particles inherit the note's color, fade out over ~300ms
   - Use theme-aware colors and intensity

2. **Active key glow**
   - Soft radial glow drawn on canvas beneath each active key
   - Color matches the note color, radius ~20-30px, Gaussian falloff
   - Creates the "Hyper Light Drifter overlay" effect — light bleeds from active keys

3. **Note trail/motion blur**
   - Falling notes get a short gradient tail (3-5px) on their leading edge
   - Drawn on canvas as a semi-transparent extension of the note color
   - Conveys velocity and direction

### Tier 2: Polish

4. **Bloom post-processing**
   - Bright-pass filter on the canvas: identify bright pixels, apply a Gaussian blur, composite back with additive blending
   - Makes glows feel more organic and CRT-like
   - Intensity adjustable per theme (stronger for Mono/Cyber, subtle for Warm)

5. **Key press squash/stretch**
   - CSS-only enhancement to existing Key component
   - Active white keys: `scaleX(1.02) scaleY(0.97)` (slight horizontal squash)
   - Active black keys: `scaleX(0.98) scaleY(1.02)` (slight vertical press)
   - Adds to the existing `translateY` transform

6. **Sustained note pulse**
   - Notes currently held have a subtle brightness oscillation on the canvas glow
   - Sine wave on glow intensity, ~2Hz cycle
   - Makes held notes feel "alive"

### Tier 3: Theme-Specific Flair

7. **CRT scanlines** (8-bit, 16-bit, Mono themes)
   - Already partially in CSS; move to canvas for proper compositing
   - Horizontal lines at 2px intervals, 3-5% opacity

8. **Chromatic aberration** (Cyber/Cool theme)
   - 1px RGB channel offset on the glow layer
   - Subtle, only on the effects canvas

9. **Color cycling** (all themes)
   - Palette-shift the particle colors over time for ambient animation
   - Especially effective on sustained notes and idle glow

10. **Phosphor persistence** (Mono theme)
    - Notes that just finished playing leave a brief green afterglow on canvas
    - Fades over ~500ms, simulates CRT phosphor decay

## Implementation Plan

### Step 1: Canvas infrastructure
- Create `src/components/piano/EffectsCanvas.tsx`
- Mount a `<canvas>` element sized to match the waterfall container
- Set up a RAF loop independent of React renders
- Accept props: active notes, key positions, theme, container dimensions
- Handle resize via ResizeObserver (match existing waterfall pattern)

### Step 2: Particle system
- Simple array-based particle pool (pre-allocate ~500 particles)
- Each particle: `{ x, y, vx, vy, life, maxLife, color, size }`
- Emit on note-start events (compare previous vs current active notes)
- Update positions, fade alpha linearly with life, remove when dead
- Draw as filled rectangles (pixel-snapped to integers)

### Step 3: Key glow
- For each active key, draw a radial gradient circle on canvas
- Use `globalCompositeOperation: 'lighter'` for additive blending
- Position derived from `getKeyPosition()` + keyboard scale/offset

### Step 4: Note trails
- For each visible note near the keyboard line, draw a gradient rectangle below the note
- Height proportional to fall speed, opacity fades to transparent

### Step 5: Bloom pass (optional, Tier 2)
- Render effects to an offscreen canvas at half resolution
- Apply horizontal + vertical blur passes
- Composite back onto main canvas with additive blending

### Step 6: Theme-specific effects (Tier 3)
- Read current theme from CSS variables or useTheme hook
- Conditionally enable/configure effects per theme
- Each theme defines: particle count multiplier, glow radius, glow intensity, optional CRT/chromatic/phosphor

## Performance Constraints

- **Target**: 60fps with ~200 visible notes and ~100 active particles
- **Canvas size**: Match waterfall container (typically ~1200x600 at most)
- **Particle budget**: 500 max pooled, ~50-100 active at peak
- **No off-thread rendering needed** — Canvas 2D is fast enough for this scale
- **Pixel snapping**: All canvas draws use integer coordinates (`Math.round()`)
- **Cleanup**: Cancel RAF loop on unmount, clear particle pool on song change

## Files to Create/Modify

### New files
- `src/components/piano/EffectsCanvas.tsx` — Canvas component + RAF loop
- `src/lib/particles.ts` — Particle system (pool, emit, update, draw)
- `tests/unit/particles.test.ts` — Unit tests for particle lifecycle

### Modified files
- `src/app/page.tsx` — Mount `<EffectsCanvas>` in the waterfall container
- `src/components/piano/Key.tsx` — Add squash/stretch transforms (Tier 2)
- `src/app/globals.css` — Any new CSS variables for effect intensities
- `src/hooks/usePianoAudio.ts` — Expose note-start events for particle emission (if not already derivable from activeNotes diff)

## Research Sources

### Game techniques referenced
- **Dead Cells**: 3D-to-2D pipeline with normal maps for real-time lighting; heavy particle saturation
- **Celeste**: 320x180 base resolution, squash/stretch, dust particles, mood-driven palettes
- **Hyper Light Drifter**: Soft light gradient overlays on flat pixel art (blend mode + opacity tuning)
- **Octopath Traveler / HD-2D**: Pixel sprites + real-time lighting, bloom, depth of field, volumetric fog
- **Sea of Stars**: Pure pixel art + dynamically rendered lighting/shadow

### Animation principles applied
- **Sub-pixel animation**: Color tweening for smoother-than-grid motion (glow fades, particle alpha)
- **Squash and stretch**: Key press deformation, note impact compression
- **Anticipation/follow-through**: Note trail = anticipation of impact; particles = follow-through after impact
- **Easing**: Particle velocity with drag (ease-out), glow intensity with sine wave
- **Color cycling**: Palette rotation for sustained notes and ambient life

### Web implementation references
- Canvas 2D API for particle rendering (no PixiJS needed at this scale)
- `globalCompositeOperation: 'lighter'` for additive glow blending
- `image-rendering: pixelated` preserved on canvas via `ctx.imageSmoothingEnabled = false`
- Offscreen canvas for bloom blur passes
