# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Piano Lessons is an interactive web app for learning piano via a "Guitar Hero" style falling-notes waterfall synchronized with audio playback. It uses Next.js 16 with static export, deployed to GitHub Pages. PR preview deployments run on Cloudflare Pages (branch `pr-<N>`) and are cleaned up automatically on PR close.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000/piano_lessons
npm run build        # Production build (static export to ./out)
npm run lint         # ESLint
npm test             # Vitest unit tests (runs in watch mode)
npm test -- --run    # Vitest unit tests (single run, no watch)
npx vitest tests/unit/validation.test.ts        # Run a single unit test file
npx vitest bench --run                           # Performance benchmarks (tests/performance/)
npx playwright test                              # All E2E tests (starts dev server automatically)
npx playwright test tests/e2e/navigation.spec.ts # Single E2E test
npx playwright test --workers=1                  # Full E2E suite the way CI runs it (see below)
npm run screenshots  # Generate UI screenshots (requires dev server running)
```

There is also a `uv`-managed Python toolchain for score wrangling (`pyproject.toml`, deps: `mido`, `music21`, `requests`; `ruff` for lint). It is not part of the build or CI:

```bash
uv run scripts/fetch_score.py <url> <name>   # Download a MusicXML/MXL score into public/scores/
uv run analyze_midi.py <file.mid>            # Dump track/tempo/note structure of a MIDI file
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
- **MusicXML**: Client-side parsing (`src/lib/musicxml/parser.ts`) then MIDI generation (`src/lib/musicxml/midi-generator.ts`). The parser uses `fast-xml-parser` with `preserveOrder: true` to maintain XML document order — critical for `<backup>`/`<forward>` elements that control multi-voice/grand-staff timing. Notes are split into separate tracks by `<staff>` element (staff 1 = right hand, staff 2 = left hand). The MIDI generator may further split each staff into multiple MIDI tracks (non-overlapping layers for midi-writer-js), so hand color assignment uses track names (`-staff1`, `-staff2`) rather than raw track indices. `generate()` returns `{ base64, fingerings }` — see the fingering note below.

### Fitting the Stage to the Screen

The lesson is laid out on a fixed stage — 1248px of keyboard plus 48px of padding — which is then scaled to fit the viewport. At 1296px that scale is 1; on a phone in portrait it used to be 0.30, which left a white key four pixels wide and was why the app put up a "please rotate your device" wall instead.

`src/lib/keyboard-range.ts` decides how much keyboard to show. When the full board can be drawn at a legible size (roughly a 864px viewport and up) nothing changes — desktops and tablets get all 88 keys exactly as before. Below that, the stage narrows to the slice the loaded piece actually plays, which the bundled library puts at 22–41 white keys against 52 for the whole board.

- **The crop grows to fill the width.** The piece's range is the floor, not the target: `chooseKeyRange` expands outwards a key at a time until the keys would fall below `MIN_WHITE_KEY_PX` or the whole board is on screen. The earlier rule stopped at the piece and had a cliff — at about an 876px viewport the full board misses the readable minimum by a fraction, and a one-octave piece dropped to a thirteen-key island on a screen with room for fifty. Anything asserting "the keyboard is cropped to the song" is out of date; what holds is that no note is ever off screen.
- **The coordinates never move.** `getKeyPosition` still returns full-keyboard positions; `getRangeMetrics` returns an `offset` and a `width`, and each container shifts by the offset and clips to the width. That is why a slice needed no changes at all in `effects-engine.ts`, which reads key positions in eight places.
- **The full range is the identity case**: `getRangeMetrics(FULL_RANGE)` is `{ offset: 0, width: 1248 }`, so wide screens run the same numbers they always did. Any regression there is a real bug, not a rounding difference.
- **The scale is capped by height as well as width.** A phone in landscape is barely 340px tall, and a 150px keyboard would eat two thirds of it; `MAX_KEYBOARD_FRACTION` keeps the keys to 45% of the stage so the notes have somewhere to fall. The cap only binds on short screens.
- **Centre the stage at its *scaled* width, never with `mx-auto`.** Auto margins resolve before the transform, so a stage centred at full width and then scaled from its top-left corner banks the whole difference onto one edge. It looks fine for as long as the scale is exactly the width ratio — the scaled stage fills the container either way — and breaks the moment the height cap makes the scale smaller than that, which is what rotating a phone into landscape does. `tests/e2e/stage-layout.spec.ts` asserts the invariants (centred, layers aligned to the keys, nothing painting outside them, no sideways scroll) at seven viewport sizes and across rotations.
- **A layer that keeps full-keyboard coordinates must be sized to the slice, not slid into place.** The effects canvas was `offset + width` wide at `left: -offset`, which put its left edge outside the keyboard on a narrowed stage; `overflow: hidden` hides that but does not change the layout box, so it still reads as an overflowing layer. The canvas is now exactly `metrics.width` and `EffectsEngine` translates by `-viewLeft` once per frame — before the drawing, after the clear, and undone before the bloom and grade passes, which composite whole frames and would smear by the offset.
- **The sheet music view renders outside the stage transform**, in real pixels. A staff lines up with time, not with the keys, so shrinking it alongside the keyboard cost legibility for nothing — and a fractional transform on top of the canvas's integer zoom resampled the pixel grid and blurred it.

### Sheet Music View

`PixelScore` (`src/components/piano/PixelScore.tsx`) is the alternative to the waterfall in the lesson view — the two never render at once, and the toggle lives in the controls bar (`V` also switches). It is a thin React wrapper in the `EffectsCanvas` mould: the drawing lives in the imperative `PixelScoreRenderer` (`src/lib/score/pixel-score-renderer.ts`), which owns its own rAF loop, so the React Compiler is nowhere near a hot path.

- **Notation comes from the MIDI, not the source file** (`src/lib/score/notation.ts`). The app plays MIDI whatever was loaded, so reading the same `Midi` object the waterfall reads gives one code path for MusicXML, MIDI and ABC. The cost is having to recover what MIDI discards: note values (ratio-matched, so a gated MIDI quarter still reads as a quarter), pitch spelling (from the key signature), rests (gaps where a whole staff is silent), and beam groups. Every one of those heuristics is unit-tested in `tests/unit/notation.test.ts`, including against the bundled scores.
- **Glyphs are 1-bit bitmaps** (`src/lib/score/glyphs.ts`), either typed out row by row or rasterised from lines and arcs with a 1px pen. The canvas backing store is small and upscaled by an integer zoom with `image-rendering: pixelated`, so nothing is ever anti-aliased. To eyeball a glyph, dump its bitmap as `#`/`.` rows in a scratch test — freehand-tuning a clef blind does not work.
- **Horizontal zoom follows `lookAheadTicks`**, the same setting that drives the waterfall, so both views scroll at one reading speed and the settings slider doubles as the score's zoom (clamped, so extreme tempi stay readable).
- **The staff geometry is integer-only**: `SPACE` must stay even, because half-spaces position note heads. Margins are deliberately generous — piano writing runs far outside the staves on ledger lines, and a clipped bass note is worse than a smaller zoom.

### Theme System

6 themes defined as CSS custom properties in `src/app/globals.css`. Managed by `useTheme` hook with `useSyncExternalStore` and `localStorage` persistence.

### State Management

Local `useState` for UI state, refs for mutable Tone.js references, `useSyncExternalStore` for theme. No global state library.

## Critical Configuration

- **basePath**: `/piano_lessons` in `next.config.ts` — all local URLs must include this prefix
- **`NEXT_PUBLIC_BASE_PATH` env var**: overrides the basePath for asset URLs at build time. Set to `''` (empty string) in the Cloudflare Pages preview build so assets resolve from the root. Leave unset for the normal GitHub Pages build.
- **Static export**: `output: "export"` — no server-side features (no API routes, no SSR)
- **React Compiler**: Enabled (`reactCompiler: true`) — automatic memoization via `babel-plugin-react-compiler`. **WARNING:** The compiler (Turbopack/SWC) generates internal dependency arrays for `useEffect`/`useCallback` at compile time. Any code change that alters the compiler's dependency analysis (adding new local variables, `for` loops, or function calls inside effect/callback bodies) can change the internal array size, causing the runtime error: _"The final argument passed to useEffect changed size between renders."_ The `"use no memo"` opt-out directive is **not recognized** by this Turbopack integration. Safe changes: modifying numeric literals and math formulas using only already-captured variables. Unsafe: adding new control flow, new `useRef` hooks, or referencing new variables inside effects. For complex changes to `EffectsCanvas.tsx`, consider migrating to the imperative `EffectsEngine` class (`src/lib/effects-engine.ts`) which bypasses the compiler entirely.
- **CSS `contain: paint` clips `box-shadow`**: Waterfall notes (`.waterfall-note`) use `contain: layout style` — do NOT add `paint` containment. `contain: paint` clips all outer `box-shadow` overflow, making glow effects completely invisible. This was a long-standing silent bug that hid every visual change to note styling.
- **CSS `var()` colors cannot take hex opacity suffixes**: Active note colors are CSS variable strings (e.g. `var(--color-note-left)`). Appending hex opacity like `${color}80` produces invalid CSS (`var(--color-note-left)80`), silently breaking `box-shadow` and `backgroundColor`. Use gradient overlay `<div>` elements with opacity classes instead.
- **White key cutout depth must match black key bottom**: `cutH` in `Key.tsx`'s `getClipPath()` must equal the black key's `top` offset + height (currently `2px + 96px = 98px`). A mismatch exposes white key edges below or above the black key.
- **VFX constants are data-driven**: All theme-specific VFX tuning lives in `src/lib/vfx-constants.ts` via `THEME_VFX_PROFILES`, `THEME_PARTICLE_BEHAVIORS`, and `THEME_COLOR_GRADES`. Per-theme vignette intensity is in CSS via `--vignette-alpha`. Do NOT hardcode theme gates (e.g. `if (theme === '8bit')`) in the effects engine — use the config tables.
- **`.pixel-panel` must not set `position: relative` in CSS**: The settings popover and other panels use Tailwind's `absolute` class for positioning. Un-layered CSS (`position: relative`) overrides Tailwind utilities, breaking layout. Dithering uses `background-image` layers instead of pseudo-elements to avoid needing positioning.
- **Sub-pixel-scale effects need dark surfaces**: Effects smaller than ~4px need adequate contrast to be visible. Specular highlights work on black keys (dark surface) but not white keys. Dithering works on `.pixel-panel` (dark mid-tone) but not on the keyboard cavity (hidden behind keys).
- **MusicXML parser requires `preserveOrder: true`**: Without it, `fast-xml-parser` groups same-named elements by tag and loses document order, silently dropping `<backup>`/`<forward>` elements. This makes all multi-voice/grand-staff piano pieces play with completely wrong timing. The `preserveOrder` output format is verbose (ordered arrays instead of grouped objects) — use the helper functions (`getVal`, `getChild`, `getAllChildren`, `getAttr`, `tagName`) in `parser.ts`.
- **The generated MIDI carries the key and time signature, on the first track only**: `@tonejs/midi` collects those meta events from *every* track, so writing them per layer would report one signature change per layer. `midi-writer-js` encodes a negative `fifths` through a path that happens to produce the right two's-complement byte — `tests/unit/notation.test.ts` round-trips the flat keys (Clair de Lune, Nocturne) rather than trusting it.
- **Fingerings travel beside the MIDI, not inside it**: MIDI has no per-note fingering field, so `MIDIGenerator.generate()` returns a `FingeringMap` alongside the bytes (`src/lib/fingering.ts`), keyed by `trackName:ticks:midiNumber` — the three values that survive the MusicXML → MIDI → `@tonejs/midi` round-trip. `usePianoAudio` carries it in state; `Waterfall` looks each note up while building its render list. Uploaded MusicXML is converted to a data-URL MIDI up front, so its map is stashed on the `Song` object and passed back in via `SongSource.fingerings`.
- **Grace notes steal time from the note they lead into**: `<grace>` elements carry no `<duration>`, so the parser buffers them per staff and pays for them out of the following principal note — each takes `GRACE_TICKS` (32, a 16th), capped at half the principal split across the run. The principal's onset shifts later by that much and its duration shrinks to match; `currentTick` still advances by the full written duration, so nothing downstream drifts. Ornaments were dropped entirely before this, which cost Gnossienne No. 1 a third of its melody (100 of 305 notes).
- **Staff assignment is engraving, not always hands**: MusicXML editions routinely notate a left-hand figure on the treble staff (Gymnopédie No. 1 put the whole beat-2 accompaniment chord there). Since hand color derives from `<staff>`, such scores need the notes reassigned in the XML — `tests/unit/score-hands.test.ts` guards the Gymnopédie split.
- **Hand color uses track names, not indices**: The MIDI generator splits parsed tracks into non-overlapping layers, creating multiple MIDI tracks per staff, so `P1-staff1-0/-1/P1-staff2-0/-1` is hands 0,0,1,1 — not 0,1,2,3. `getHandIndexForTrack` / `getHandIndexByTrack` in `src/lib/note-colors.ts` are the single source of that mapping (they fall back to track index for plain MIDI, which has no staff information). Do not re-derive it inline; both `Waterfall.tsx` and `usePianoAudio.ts` used to carry their own copy of the regex.
- **A dynamic `import()` inside a component silently disables `react-hooks` lint for that whole component**: the compiler-based rules (`set-state-in-effect`, etc.) bail out on code they cannot analyse and report nothing for it, so "lint is clean" can mean "lint gave up". `Home` in `page.tsx` had an `await import('tone')` that masked two real `set-state-in-effect` violations; removing it made them appear, in code nobody had touched. If lint suddenly flags lines your change did not touch, this is why — the violations were always there. The established fix in this codebase is to defer the update with `setTimeout(() => setX(...), 0)`; localStorage hydration cannot move into a lazy `useState` initializer because the static export has no `window` at prerender.
- **`npm run lint` reports pre-existing errors locally that CI never sees**: `eslint.config.mjs` ignores `.venv/**` but not `scripts/.venv/**`, so a local uv venv leaks vendored Python-package JS (matplotlib's `mpl.js`) into the lint run — currently 5 `no-this-alias` errors and ~18 warnings. The venvs are git-ignored, so CI is clean. Check the file paths before assuming you broke lint.
- **iOS parks the AudioContext in a non-standard `'interrupted'` state**: not `'suspended'`, which is what a `state === 'suspended'` check misses entirely. Worse, `resume()` on an interrupted context can return a promise Safari never settles, so `await Tone.start()` hangs and whatever called it never continues — that is why the play button went dead after a screen lock. Always go through `ensureAudioContext()` (`src/lib/audio-context.ts`), which treats both states as parked, races the resume against a timeout, and reports the live state rather than trusting the promise. `usePianoAudio` also pauses and re-syncs `isPlaying` on `visibilitychange`, because the transport still claims to be `"started"` after an interruption.
- **Wake locks are dropped by the system, not just by us**: iOS releases the screen lock whenever the page hides, and Safari drops it on its own entering fullscreen. `useWakeLock` re-acquires on `visibilitychange`, `pageshow` and `pointerdown` (a request outside a user gesture can be refused), and listens for the sentinel's `release` event, which is the only reliable signal the lock is gone. It is held for the whole lesson rather than only during playback.
- **A phone is a supported target, in both orientations.** `tests/e2e/mobile.spec.ts` runs the lesson at iPhone sizes and asserts the things that used to be wrong: no rotate wall, white keys wider than 10px, controls that fit, and a sheet view still drawn at 2x or better. The controls hide the song title and the two clocks below `sm` — three clusters do not fit across 375px, and the title is already in the header there.
- **Git workflow**: Never amend commits — always fix forward. This is a multi-PR plan; preserve history across PRs.
- **Path alias**: `@/*` maps to `./src/*`
- **Playwright baseURL**: `http://localhost:3000/piano_lessons`
- **`AGENTS.md` is the short orientation for other AI agents and defers to this file.** It went stale once by duplicating what this file says (it described the app as a single-song Gnossienne trainer long after the library grew), so it is now deliberately thin: an overview, the commands, a map of the directories, and the admin-merge escape hatch, which is the one thing that lives only there. Keep it that way — detail belongs here, not in both.

## Testing

- **Keep pure logic out of components so tests can reach it**: `tests/unit/waterfall_logic.test.ts` used to reimplement the waterfall render pass inside the test file, so it passed no matter what `Waterfall.tsx` did — as did the benchmark. The pure part now lives in `src/lib/waterfall-logic.ts` and both import it. If a test defines the thing it is testing, it is not a test.
- **Unit tests** (`tests/unit/`): Vitest, node environment. `vitest.config.ts` maps the `@` alias, so tests can import either `@/lib/…` or relative paths.
- **E2E tests** (`tests/e2e/`): Playwright, Chromium only. Auto-starts the dev server (reuses one already on :3000).
  - **`page.goto('')`, not `page.goto('/')`** — `baseURL` already includes the `/piano_lessons` path, so `'/'` navigates to the site root and every locator times out.
  - Song cards on the landing page are addressable as `data-testid="song-<song.id>"`; the lesson view exposes `play-button`, `waterfall-container`, `keys-container`, `current-time`, `duration`, `fullscreen-button`.
  - **`reuseExistingServer` will reuse *any* server on :3000, including one from a stray git worktree under `.claude/worktrees/`.** When that happens the suite silently tests someone else's code — edits and even deliberate breakage have no effect on the results. If a change to `src/` does not alter test outcomes, check `netstat -ano | grep :3000` against the process list before believing the tests. Run against a dedicated port to be certain.
  - **Assert on pitch, not screen position.** The hands overlap in range — the Gymnopédie melody comes down to F#4, the exact top note of the left-hand chord — so "the right hand is further right" holds only at some timestamps. `tests/e2e/hand-colours.spec.ts` maps a note block's `left` back to a MIDI number via `getKeyPosition` and asserts a floor on the right hand, which is true for every frame.
  - **Local runs are flaky, CI is not.** `workers` is unset locally (unbounded parallelism against a single dev server), so the full suite intermittently fails an unrelated spec on a slow machine. CI pins `workers: 1` with 2 retries. Reproduce CI with `npx playwright test --workers=1` before concluding a change broke something.
- **Performance benchmarks** (`tests/performance/waterfall.bench.ts`): `npx vitest bench --run`. The `include` in `vitest.config.ts` only covers `tests/unit/`, so benchmarks never run as part of `npm test`.

## Adding Scores

`ADD_SONGS.md` is the reference. Two things are worth verifying by hand on any new MusicXML score, because both are silent when wrong:

- **Hands** — see the staff-assignment note under Critical Configuration.
- **Finger numbers** — render automatically if the score has `<fingering>` markings, and the settings toggle only appears for scores that do. Nocturne Op. 9 No. 2 is currently the only bundled score with them.

## Background Reading

- **Waterfall animation upgrade** (complete, all 3 phases): `docs/waterfall-animation-plan.md` and `docs/dead-cells-style-plan.md` — the design rationale behind the Canvas overlay, particle effects, glow/bloom and per-theme VFX. Read these before changing `EffectsCanvas.tsx` or `src/lib/vfx-constants.ts`.
- **Pixel-art constraints**: `docs/Pixel_Art_Techniques.md`, `docs/Pixel_Piano_Specs.md`.

## Conventions

- TypeScript strict mode, avoid `any`
- Functional components with React Hooks
- Tailwind CSS utility classes (v4 with `@tailwindcss/postcss`)
- Conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, etc.
- Admin can bypass branch protection: `gh pr merge <N> --squash --delete-branch --admin`
