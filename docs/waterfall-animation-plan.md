# Waterfall Animation Upgrade — Hybrid Canvas (Option B)

## Goal

Upgrade the waterfall/keyboard visual effects to match **Dead Cells** aesthetic — textured pixel art sprites with atmospheric colored glow, layered particles, and bloom post-processing. Canvas overlay for effects, DOM rendering for notes and keys.

## Architecture

```
┌─────────────────────────────────┐
│  Canvas Layer (effects only)    │  z-index above waterfall
│  - Particle system              │
│  - Bloom/glow post-processing   │
│  - Key glow, trails, beams      │
│  - Impact flash + rail          │
├─────────────────────────────────┤
│  Waterfall (DOM)                │  Note divs — Dead Cells style CSS
├─────────────────────────────────┤
│  Keyboard (DOM)                 │  Existing Key components
└─────────────────────────────────┘
```

The canvas reads positions from the DOM (key positions from `geometry.ts`, active notes from React state) and paints effects on top. No PixiJS dependency — native Canvas 2D API.

## Visual Style — Dead Cells

The entire app follows the Dead Cells aesthetic: pixel art with rich textures, beveled depth, rounded UI frames, and atmospheric colored lighting.

### Notes (Waterfall)
- **Bevel:** Soft blurred `inset 0 1px 2px` highlight + shadow — organic lit depth (not hard 1px pixel bevels)
- **Border:** `1px solid rgba(0,0,0,0.25)` — defines edges without being harsh
- **Radius:** `3px` — soft but not pill-shaped, matches Dead Cells sprite rounding
- **Glass highlight:** `::before` with smooth top-to-bottom gradient (light top, dark bottom)
- **Caps:** Structural top/bottom end-pieces (2px, highlight/shadow)
- **Proximity:** Bevel blur widens (2px → 3-4px) + themed outer glow bleeds in as notes approach keyboard
- **Active:** Bevel blur at 3px + strong outer glow (12-24px) + vibrate animation
- **Containment:** `contain: layout style` only — `paint` must NOT be added (clips `box-shadow`, see CLAUDE.md)

### UI Components (Buttons, Panels)
- **Rounded frames:** `border-radius: 6px` on panels/buttons — matches Dead Cells HUD/inventory UI
- **Pixel bevels:** `inset 1px 1px` highlight + shadow for depth
- **Solid borders:** 2px theme-colored borders
- **Hover:** Translate pop (-1px, -1px) with deeper drop shadow

### Atmospheric Backgrounds (CSS)
- **Saturated void colors:** Every theme's void/bg/surface/elevated has distinct hue (navy, sienna, green phosphor, cobalt, violet) — no flat grays
- **Vignette:** `radial-gradient` darkening edges, clear center — per theme
- **Keyboard warmth glow:** Accent-colored radial gradient rising from bottom (keyboard = light source)
- **Upper haze:** Cool/16bit/HiBit get a distant secondary-colored haze at top
- **Theme-tinted grid:** `--color-grid-line` CSS variable per theme; grid uses saturated theme color instead of neutral border
- **Noise/grain:** SVG feTurbulence texture extended to all themes with per-theme opacity (mono strongest at 0.04, 8bit lightest at 0.01)
- **Grid mask:** Aggressive fade toward top (`0% → 30% → 65% → 100%` opacity curve) for atmospheric depth

### Canvas Effects
- **Impact particles:** 14-particle upward burst (3px, additive blending) + glow halo per particle
- **Dual shockwave rings:** Primary (size 6, 0.35s) and secondary (size 8, 0.5s)
- **Sustained-note debris:** Random 2px downward particles while notes are held
- **Active key glow:** Radial gradient with color cycling and sustained-note pulse
- **Note trails + light beams:** Gradient tails and upward beams for active notes
- **Impact flash:** Color-tinted bright rectangle on note-on, quadratic ease-out
- **Impact rail:** Single 1px theme-colored position marker at 25% opacity
- **Bloom pass:** Quarter-res offscreen canvas, additive compositing, per-theme intensity via `THEME_VFX_PROFILES`
- **Chromatic aberration:** Per-theme RGB channel offset on bloom layer (Cool, Warm, 16-Bit, Hi-Bit)
- **Phosphor persistence:** Theme-colored afterglow on note-off (all themes, accent-colored, per-theme duration)
- **Color grading:** Post-bloom multiply/screen compositing for biome-specific shadow/highlight tinting
- **Theme-specific particles:** Embers (Warm), pixel debris (8-Bit), phosphor flicker (Mono), tuned bursts (others)
- **Key side-illumination:** Active keys bleed colored light to inactive neighbors via inset shadows

## Planned Effects — Implementation Status

### Tier 1: Core Impact — DONE

1. **Note impact particles** ✅
2. **Active key glow** ✅
3. **Note trail / motion blur** ✅

### Tier 2: Polish — DONE

4. **Bloom post-processing** ✅ (all themes, per-theme intensity via `THEME_VFX_PROFILES`)
5. **Key press squash/stretch** ✅ (CSS transform on active keys)
6. **Sustained note pulse** ✅

### Tier 3: Theme-Specific Flair — DONE

7. **CRT scanlines** ✅ (all themes, per-theme intensity via `THEME_VFX_PROFILES`)
8. **Chromatic aberration** ✅ (Cool, Warm, 16-Bit, Hi-Bit — per-theme offset/alpha)
9. **Color cycling** ✅ (slow hue rotation on active key glow)
10. **Phosphor persistence** ✅ (all themes, accent-colored, per-theme duration)
11. **Theme-specific particles** ✅ (embers/pixel debris/phosphor flicker per theme)
12. **Biome color grading** ✅ (multiply/screen shadow/highlight tinting)
13. **Key side-illumination** ✅ (active keys bleed light to neighbors)

### Tier 4: Note Styles — FUTURE

Selectable note styles independent of color theme.

## Theme-Specific Effects

All VFX run on every theme with per-theme tuning via `THEME_VFX_PROFILES` and `THEME_PARTICLE_BEHAVIORS` in `src/lib/vfx-constants.ts`.

| Theme | Particles | Bloom | Chromatic | Scanlines | Phosphor | Color Grade |
|-------|-----------|-------|-----------|-----------|----------|-------------|
| Cool | Burst + spore | 0.50 | 1px, 0.35α | 0.02 | Indigo, 350ms | Teal-blue shadows |
| Warm | Ember (rising) | 0.45 | 1px, 0.20α | 0.02 | Amber, 400ms | Deep brown shadows |
| Mono | Burst + phosphor flicker | 0.50 | — | 0.04 | Green, 500ms | Dark green shadows |
| 8-Bit | Pixel debris (heavy) | 0.35 | — | 0.04 | Red, 250ms | Deep blue shadows |
| 16-Bit | Burst + spore | 0.45 | 1px, 0.15α | 0.04 | Orange, 300ms | Purple shadows |
| Hi-Bit | Burst + spore (floaty) | 0.70 | 1px, 0.25α | 0.02 | Pink, 400ms | Deep violet shadows |

## Note Styles (Future)

**Concept:** Note visual style selectable independently of color theme. Each "note style" defines CSS shape, texture, and effects. Theme still controls palette.

### Proposed Styles

#### 1. Dead Cells (current default)
- Textured beveled sprites with atmospheric glow
- `border-radius: 3px`, 1px bevel, scanline texture, visible caps
- Proximity: bevel + outer glow | Active: bright bevel + strong glow

#### 2. Neon Pill
- Hyper Light Drifter inspired — smooth, clean, glow-only
- `border-radius: 5px`, no border, no bevel, glass highlight gradient
- Caps hidden | Proximity: pure glow | Active: triple-layer glow halo

#### 3. Minimal
- Ultra-clean, zero distraction
- No glow, no proximity effects, no texture
- Thin 1px border, flat color

### Implementation Approach

**Storage:** `localStorage` key `'piano_lessons_note_style'`

**Hook:** `useNoteStyle()` — same `useSyncExternalStore` pattern as `useTheme()`

**DOM:** `data-note-style="dead-cells" | "neon-pill" | "minimal"` on root. CSS scopes note styles under this attribute.

**UI:** "Note Style" selector in Settings panel alongside Theme selector.

**Canvas:** Note style may affect EffectsCanvas (e.g., heavier particles for Dead Cells, disabled for Minimal). Pass `noteStyle` as prop.

## Files

### Created (across PRs)
- `src/components/piano/EffectsCanvas.tsx` — Canvas component + RAF loop + all effect draw functions
- `src/lib/particles.ts` — Pool-based particle system with theme-specific types (burst, ember, pixel_debris, phosphor_flicker, spore, debris, shockwave)
- `src/lib/effects-engine.ts` — Imperative effects engine (bypasses React Compiler) with theme-aware emission, color grading, bloom, scanlines, phosphor
- `src/lib/vfx-constants.ts` — VFX config tables: `THEME_PARTICLE_BEHAVIORS`, `THEME_COLOR_GRADES`, `THEME_VFX_PROFILES`
- `tests/unit/particles.test.ts` — Unit tests for particle lifecycle

### Modified (across PRs)
- `src/app/page.tsx` — Mounts `<EffectsCanvas>` and `<div class="waterfall-atmosphere">` in waterfall container
- `src/app/globals.css` — Dead Cells note styling, rounded UI components, proximity glow, theme-specific overrides, scrolling grid, atmospheric backgrounds
- `src/components/piano/Waterfall.tsx` — Theme-tinted octave guidelines via `--color-grid-line`
- `src/components/piano/Key.tsx` — Side-illumination overlays, tinted AO overlays
- `src/components/piano/Keyboard.tsx` — Passes neighbor colors to Key
- `CLAUDE.md` — Added `contain: paint` warning

### Future (Note Styles feature)
- `src/hooks/useNoteStyle.ts` — Hook for note style selection + persistence
- `src/app/globals.css` — Additional `[data-note-style="..."]` rule blocks
- `src/components/piano/Controls.tsx` — Note style selector UI

## Performance Constraints

- **Target**: 60fps with ~200 visible notes and ~100 active particles
- **Particle budget**: 800 max pooled, ~50-100 active at peak
- **Bloom**: Quarter-resolution offscreen canvas
- **Pixel snapping**: All canvas draws use `Math.round()`
- **Containment**: `contain: layout style` on notes (NO `paint`)
- **Cleanup**: Cancel RAF on unmount, clear particles on song change

## Research Sources

### Game techniques referenced
- **Dead Cells**: 3D-to-2D pipeline with normal maps for real-time lighting; heavy particle saturation; beveled textured sprites with atmospheric colored glow. Primary visual reference for the entire app.
- **Celeste**: 320x180 base resolution, squash/stretch, dust particles, mood-driven palettes
- **Hyper Light Drifter**: Soft light gradient overlays on flat pixel art. Inspiration for the "Neon Pill" note style (future).
- **Octopath Traveler / HD-2D**: Pixel sprites + real-time lighting, bloom, depth of field
- **Sea of Stars**: Pure pixel art + dynamically rendered lighting/shadow

### Animation principles applied
- **Sub-pixel animation**: Color tweening for smoother-than-grid motion (glow fades, particle alpha)
- **Squash and stretch**: Note vibrate animation, key press deformation
- **Anticipation/follow-through**: Note trail = anticipation of impact; particles = follow-through after impact
- **Easing**: Particle velocity with gravity (ease-out), glow intensity with sine wave
- **Color cycling**: Palette rotation for sustained notes and ambient life

### Web implementation references
- Canvas 2D API for particle rendering (no PixiJS needed at this scale)
- `globalCompositeOperation: 'lighter'` for additive glow blending
- `image-rendering: pixelated` preserved on canvas via `ctx.imageSmoothingEnabled = false`
- Offscreen canvas for bloom blur passes
- `contain: layout style` for DOM note isolation (NOT `paint` — clips `box-shadow`)
