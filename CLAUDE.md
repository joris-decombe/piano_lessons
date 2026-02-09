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
- **MusicXML**: Client-side parsing (`src/lib/musicxml/parser.ts`) then MIDI generation (`src/lib/musicxml/midi-generator.ts`)

### Theme System

6 themes defined as CSS custom properties in `src/app/globals.css`. Managed by `useTheme` hook with `useSyncExternalStore` and `localStorage` persistence.

### State Management

Local `useState` for UI state, refs for mutable Tone.js references, `useSyncExternalStore` for theme. No global state library.

## Critical Configuration

- **basePath**: `/piano_lessons` in `next.config.ts` — all local URLs must include this prefix
- **Static export**: `output: "export"` — no server-side features (no API routes, no SSR)
- **React Compiler**: Enabled (`reactCompiler: true`) — automatic memoization via `babel-plugin-react-compiler`
- **Path alias**: `@/*` maps to `./src/*`
- **Playwright baseURL**: `http://localhost:3000/piano_lessons`

## Testing

- **Unit tests** (`tests/unit/`): Vitest with node environment
- **E2E tests** (`tests/e2e/`): Playwright, Chromium only. Auto-starts dev server.
- **Performance benchmarks** (`tests/performance/`): `waterfall.bench.ts`

## Active Plans

- **Waterfall animation upgrade**: See `docs/waterfall-animation-plan.md` — Hybrid Canvas overlay (Option B) for particle effects, glow, bloom, and theme-specific VFX on top of the existing DOM waterfall/keyboard.

## Conventions

- TypeScript strict mode, avoid `any`
- Functional components with React Hooks
- Tailwind CSS utility classes (v4 with `@tailwindcss/postcss`)
- Conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, etc.
- Admin can bypass branch protection: `gh pr merge <N> --squash --delete-branch --admin`
