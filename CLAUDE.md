# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Piano Lessons is an interactive web app for learning piano via a "Guitar Hero" style falling-notes waterfall synchronized with audio playback. It uses Next.js 16 with static export, deployed to GitHub Pages.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000/piano_lessons
npm run build        # Production build (static export to ./out)
npm run lint         # ESLint
npm test             # Vitest unit tests (runs in watch mode)
npm test -- --run    # Vitest unit tests (single run, no watch)
npx vitest tests/unit/validation.test.ts        # Run a single unit test file
npx playwright test                              # All E2E tests (starts dev server automatically)
npx playwright test tests/e2e/navigation.spec.ts # Single E2E test
npm run screenshots  # Generate UI screenshots (requires dev server running)
```

## Architecture

### Core Data Flow

`page.tsx` (landing + lesson) → `usePianoAudio` hook (audio engine) → visual components (`Waterfall`, `Keyboard`, `Controls`)

- **usePianoAudio** (`src/hooks/usePianoAudio.ts`): Central hook managing Tone.js transport, MIDI parsing, note scheduling, loop state, and seeking. Pre-computes a timeline for O(1) active note lookups. Uses `requestAnimationFrame` for visual sync.
- **Waterfall** (`src/components/piano/Waterfall.tsx`): Renders falling notes with pixel-snapped positioning. Uses `useMemo` for visible-note calculations.
- **Keyboard** (`src/components/piano/Keyboard.tsx`): 88-key piano with pre-computed key geometry (`geometry.ts`). Highlights active notes.
- **Controls** (`src/components/piano/Controls.tsx`): Playback, speed, looping, visual settings, song selector. Wrapped in `memo()`.

### File Format Support

- **MIDI**: Parsed directly via `@tonejs/midi`
- **ABC notation**: Converted to MIDI buffer via `src/lib/abc-loader.ts`
- **MusicXML**: Client-side parsing (`src/lib/musicxml/parser.ts`) then MIDI generation (`src/lib/musicxml/midi-generator.ts`). The parser uses `fast-xml-parser` with `preserveOrder: true` to maintain XML document order — critical for `<backup>`/`<forward>` elements that control multi-voice/grand-staff timing. Notes are split into separate tracks by `<staff>` element (staff 1 = right hand, staff 2 = left hand). The MIDI generator may further split each staff into multiple MIDI tracks (non-overlapping layers for midi-writer-js), so hand color assignment uses track names (`-staff1`, `-staff2`) rather than raw track indices.

### Theme System

6 themes defined as CSS custom properties in `src/app/globals.css`. Managed by `useTheme` hook with `useSyncExternalStore` and `localStorage` persistence.

### State Management

Local `useState` for UI state, refs for mutable Tone.js references, `useSyncExternalStore` for theme. No global state library.

## Critical Configuration

- **basePath**: `/piano_lessons` in `next.config.ts` — all local URLs must include this prefix
- **Static export**: `output: "export"` — no server-side features (no API routes, no SSR)
- **React Compiler**: Enabled (`reactCompiler: true`) — automatic memoization via `babel-plugin-react-compiler`. **WARNING:** The compiler (Turbopack/SWC) generates internal dependency arrays for `useEffect`/`useCallback` at compile time. Any code change that alters the compiler's dependency analysis (adding new local variables, `for` loops, or function calls inside effect/callback bodies) can change the internal array size, causing the runtime error: _"The final argument passed to useEffect changed size between renders."_ The `"use no memo"` opt-out directive is **not recognized** by this Turbopack integration. Safe changes: modifying numeric literals and math formulas using only already-captured variables. Unsafe: adding new control flow, new `useRef` hooks, or referencing new variables inside effects. For complex changes to `EffectsCanvas.tsx`, consider migrating to the imperative `EffectsEngine` class (`src/lib/effects-engine.ts`) which bypasses the compiler entirely.
- **CSS `contain: paint` clips `box-shadow`**: Waterfall notes (`.waterfall-note`) use `contain: layout style` — do NOT add `paint` containment. `contain: paint` clips all outer `box-shadow` overflow, making glow effects completely invisible. This was a long-standing silent bug that hid every visual change to note styling.
- **CSS `var()` colors cannot take hex opacity suffixes**: Active note colors are CSS variable strings (e.g. `var(--color-note-left)`). Appending hex opacity like `${color}80` produces invalid CSS (`var(--color-note-left)80`), silently breaking `box-shadow` and `backgroundColor`. Use gradient overlay `<div>` elements with opacity classes instead.
- **White key cutout depth must match black key bottom**: `cutH` in `Key.tsx`'s `getClipPath()` must equal the black key's `top` offset + height (currently `2px + 96px = 98px`). A mismatch exposes white key edges below or above the black key.
- **VFX constants are data-driven**: All theme-specific VFX tuning lives in `src/lib/vfx-constants.ts` via `THEME_VFX_PROFILES`, `THEME_PARTICLE_BEHAVIORS`, and `THEME_COLOR_GRADES`. Per-theme vignette intensity is in CSS via `--vignette-alpha`. Do NOT hardcode theme gates (e.g. `if (theme === '8bit')`) in the effects engine — use the config tables.
- **`.pixel-panel` must not set `position: relative` in CSS**: The settings popover and other panels use Tailwind's `absolute` class for positioning. Un-layered CSS (`position: relative`) overrides Tailwind utilities, breaking layout. Dithering uses `background-image` layers instead of pseudo-elements to avoid needing positioning.
- **Sub-pixel-scale effects need dark surfaces**: Effects smaller than ~4px need adequate contrast to be visible. Specular highlights work on black keys (dark surface) but not white keys. Dithering works on `.pixel-panel` (dark mid-tone) but not on the keyboard cavity (hidden behind keys).
- **MusicXML parser requires `preserveOrder: true`**: Without it, `fast-xml-parser` groups same-named elements by tag and loses document order, silently dropping `<backup>`/`<forward>` elements. This makes all multi-voice/grand-staff piano pieces play with completely wrong timing. The `preserveOrder` output format is verbose (ordered arrays instead of grouped objects) — use the helper functions (`getVal`, `getChild`, `getAllChildren`, `getAttr`, `tagName`) in `parser.ts`.
- **Hand color uses track names, not indices**: The MIDI generator splits parsed tracks into non-overlapping layers, creating multiple MIDI tracks per staff. Color assignment (right/left hand) must use the `-staff1`/`-staff2` suffix in track names, not raw `trackIndex`. Both `Waterfall.tsx` and `usePianoAudio.ts` extract staff number via `/-staff(\d+)/` regex, falling back to track index for regular MIDI files.
- **Git workflow**: Never amend commits — always fix forward. This is a multi-PR plan; preserve history across PRs.
- **Path alias**: `@/*` maps to `./src/*`
- **Playwright baseURL**: `http://localhost:3000/piano_lessons`

## Testing

- **Unit tests** (`tests/unit/`): Vitest with node environment
- **E2E tests** (`tests/e2e/`): Playwright, Chromium only. Auto-starts dev server.
- **Performance benchmarks** (`tests/performance/`): `waterfall.bench.ts`

## Active Plans

- **Waterfall animation upgrade**: See `docs/waterfall-animation-plan.md` and `docs/dead-cells-style-plan.md` — Hybrid Canvas overlay for particle effects, glow, bloom, and theme-specific VFX. All 3 phases complete: Phase 1 (Atmosphere & Parallax), Phase 2 (Lighting, Texture & Color Identity), Phase 3 (Post-Processing & Juice — vignette, dithering, specular, particle physics).

## Conventions

- TypeScript strict mode, avoid `any`
- Functional components with React Hooks
- Tailwind CSS utility classes (v4 with `@tailwindcss/postcss`)
- Conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, etc.
- Admin can bypass branch protection: `gh pr merge <N> --squash --delete-branch --admin`
