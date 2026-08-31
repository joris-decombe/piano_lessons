# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Internal
- `AGENTS.md` rewritten. It had gone stale by duplicating CLAUDE.md — it still described the app as a single-song Gnossienne trainer with Tone.js synthesis and no test suite — so it is now a short orientation that defers to CLAUDE.md for detail, keeping only the admin-merge escape hatch that lives nowhere else
- Screenshots regenerated, and `npm run screenshots` now also captures the sheet music view (on the Nocturne, the score that carries finger numbers)
- Notation is derived from the loaded MIDI rather than the source file, so the sheet view works the same for MusicXML, MIDI and ABC. `src/lib/score/notation.ts` recovers what MIDI throws away (note values, spelling, rests, beam groups); `src/lib/score/pixel-score-renderer.ts` draws it imperatively, like `EffectsEngine`
- MusicXML `<key><fifths>` is now parsed, and the generated MIDI carries both the key and the time signature, so the sheet view can print the right signature instead of guessing it from the notes
- Waterfall render pass extracted to `src/lib/waterfall-logic.ts`; its unit tests and benchmark previously reimplemented the algorithm inside the test files and could not fail when the component changed
- Staff-to-hand mapping consolidated into `note-colors.ts` (it was duplicated in `Waterfall.tsx` and `usePianoAudio.ts`) and covered by tests, including the layer-split case where track index is not the hand
- Added end-to-end colour regressions for both Satie scores

### Fixed
- Finger numbers in the sheet music view were drawn at 3x5 pixels in the accent colour, which put them somewhere between illegible and invisible — on the theme where the accent is close to the left-hand note colour they read as specks of a note rather than as digits. They are now drawn at double size on a knocked-out patch, so they stay readable over staff lines and beams. Bar numbers keep the small dim treatment, which leaves the two telling each other apart
- Rotating a phone into landscape left the stage banked against one edge with a black band down the other. `mx-auto` resolves auto margins before the transform, so the stage was centred at its full width and then shrunk towards its top-left corner; that was invisible while the scale was exactly the width ratio, and appeared as soon as the height cap made the stage narrower than the width alone would have. It is now centred at the width it actually occupies
- The effects canvas hung past the keyboard on a narrowed stage. It is deliberately wider than the stage — it keeps full-keyboard coordinates — and was slid left into place, which put its left edge outside the keys. The canvas is now exactly the visible slice and the engine shifts its own drawing once per frame instead
- The keyboard could swallow a short screen: on a phone in landscape the 150px keyboard took two thirds of the stage, leaving the falling notes almost no room. It is now capped at 45% of the height
- The sheet music view was drawn inside the keyboard's stage transform, so on a phone it was shrunk twice over — once by its own zoom and again by the stage — and the pixel grid was resampled by the fractional scale. It now renders in real pixels, at full width, above the keyboard
- Narrow screens: the lesson header and the transport bar overflowed at 375px, the landing page's filter buttons were clipped, and the title ran under the settings button
- iOS: playback could not be resumed after a screen lock or incoming call. Safari parks the AudioContext in a non-standard `interrupted` state that the `suspended`-only check missed, and its `resume()` promise can hang forever, leaving the play button dead. The context is now revived through a timeout-guarded helper, and returning to the app re-syncs the transport with the UI
- iOS: the screen slept during a lesson. The wake lock was only held while the transport was running, and was never recovered after the system took it away — it is now held for the whole lesson and re-acquired on return, on page show, and on the next touch

### Added
- The lesson now runs on a phone, in both orientations. Portrait was previously blocked outright by a "please rotate your device" wall, and for good reason: the stage is laid out for all 88 keys and scaled to fit, which on a 390px screen left a white key four pixels wide. Narrow screens now show the slice of keyboard the loaded piece actually plays — the bundled library uses 22 to 41 white keys against 52 for the whole board — which roughly triples the key size on a phone without ever hiding a note the piece is about to play. Screens that can draw the full keyboard legibly are untouched
- Pixel-art sheet music view: a grand staff drawn in the app's own pixel style — clefs, key and time signature, bar lines and numbers, note heads, stems, sloped beams, flags, dots, ties, accidentals, ledger lines and rests — scrolling in sync with playback behind a fixed playhead, with hands coloured as in the waterfall, sounding notes lit, and finger numbers where the score has them. Toggle it with the staff button in the controls or the `V` key; the choice is remembered. The score's horizontal zoom follows the existing note-preview setting, so both views read at the same speed
- Finger numbers on falling notes, read from MusicXML `<fingering>` markings, with a "Finger Numbers" toggle that appears only for scores that carry them (currently Nocturne Op. 9 No. 2)
- Grace note playback: ornaments now sound, taking their time from the note they lead into. They were silently dropped before, which cost Gnossienne No. 1 a third of its melody and Nocturne Op. 9 No. 2 two of its fingered notes

### Changed
- Gnossienne No. 1 now ships as MusicXML instead of MIDI. The MIDI split the A♭3–C4–F4 accompaniment chord across both tracks, so two of its three notes were coloured as right hand — impossible to play, since the right hand also has the melody above it. The MusicXML edition keeps the whole chord with the left hand. It also plays faster (3:11 vs 4:58) because the transcription is marked ♩=102

### Fixed
- Gymnopédie No. 1 hand colors: the beat-2 accompaniment chord was notated on the treble staff and coloured as right hand for bars 1–18 and 32–45, then flipped to left hand in bars 19–31 where the same figure is engraved in the bass staff. It is now left hand throughout, and the right hand correctly enters at bar 5

## [0.7.0] - 2026-02-26

### Added
- Configurable note preview (look-ahead) setting — adjustable in settings, auto-calculated from waterfall height
- Screen wake lock to prevent device sleep during playback (iOS 16.4+, Chrome)
- Auto-scrolling song title (marquee bounce) in the controls bar when text overflows
- Speed badge in controls bar with click-to-cycle presets (1x → 0.75x → 0.5x → 0.25x)
- SEO metadata, structured data (JSON-LD), and AI agent discovery files (`llms.txt`, `agents.json`)

### Fixed
- Progress bar accuracy: seeking and progress now use tick-based calculations, correct at any playback speed
- Look-ahead ticks computed directly from base BPM, eliminating floating-point drift after speed changes
- Saved song position and note preview properly re-read on song switch (was stale due to `useState` initializer)
- Note preview override now resets per-song instead of persisting across songs
- Back button moved into controls bar to avoid overlap with Safari's native fullscreen exit button
- Fullscreen Escape key handling: Escape now only exits fullscreen (not the lesson) when in fullscreen mode
- Gnossienne No.1 tempo corrected
- Menu sounds replaced with raw Web Audio API for cross-browser reliability (Tone.js caused issues on some browsers)
- ScrollingText marquee recalculates on resize (fullscreen, rotation) via ResizeObserver

### Changed
- Controls bar layout rationalized: uniform button sizes, consistent touch/desktop sizing
- Redundant speed slider removed from settings popover (replaced by speed badge)
- Fullscreen button moved from floating header position into the controls bar

## [0.6.0] - 2026-02-18

### Added
- VFX Phase 2: per-theme lighting, texture & colour identity with data-driven profiles (`THEME_VFX_PROFILES`, `THEME_PARTICLE_BEHAVIORS`, `THEME_COLOR_GRADES` in `vfx-constants.ts`)
- VFX Phase 3: post-processing & juice — fullscreen vignette, ordered dithering on panels, specular highlights on black keys, and particle physics (gravity, drag, spin)
- Loading overlay with audio prefetch on song select to eliminate the "notes appear late" delay on first play
- Salamander Grand Piano samples bundled locally — no external CDN dependency at runtime
- Self-hosted fonts via `@fontsource` — eliminates Google Fonts network request
- 8 new beginner/intermediate scores in MusicXML format (Beethoven, Bach, Mozart, Chopin, and more)
- MusicXML duration pre-computation with a sort dropdown on the song list (by title / duration)
- PR preview deployments via Cloudflare Pages: preview URL auto-posted as a PR comment, deployment cleaned up on PR close

### Fixed
- MusicXML multi-voice / grand-staff timing: switched parser to `preserveOrder: true` so `<backup>`/`<forward>` elements are processed in document order — fixes completely wrong note timing on all grand-staff pieces
- MusicXML staff-aware hand colouring: uses `-staff1`/`-staff2` track-name suffix instead of raw track index, so right/left hand colours survive MIDI layer splitting
- VFX particles not triggering on consecutive notes of the same pitch
- White key cutout depth (`cutH`) misaligned with black key bottom edge — exposed white key edges below black keys
- iPhone / iPad keyboard centering regression and missing first note on load
- Landing page vertical alignment and iOS install-hint overlay positioning in screenshots

### Changed
- CSP header tightened: fonts and piano samples now served from same origin, removing external CDN entries from `connect-src` / `font-src`
- Hand colour pickers removed from Settings — note colours are now fully defined by the active theme

## [0.5.0]

### Added
- Waterfall note visual overhaul matching pixel art game aesthetic
  - Base note styling with enhanced bevel, top highlight, and leading edge glow
  - Long note segmentation pattern (Tetris brick / piano roll grid) for notes >40px
  - Proximity-based glow and brightness as notes approach the keyboard line
  - Active state: impact brightness boost + horizontal squash on note-on
  - Black key notes with darker depth treatment
  - Per-theme note character (8-bit chunky segments, mono CRT scanlines, cool neon glow, warm sepia highlights, hi-bit saturation boost, 16-bit rich bevels)
  - Enhanced impact particles (8 count, faster speed, longer lifetime) and impact flash
  - CSS `contain` and selective `will-change` for performance
  - Unit tests for proximity, isActive, and isLong computations
- Main menu UX overhaul with 8 improvements
- Difficulty badges on song cards (beginner/intermediate/advanced)
- Progress tracking via localStorage with "Continue Playing" card for returning users
- First-timer highlight: Twinkle card gets pulse animation and [RECOMMENDED] badge
- Duration estimates on song cards (parsed from MIDI/ABC files)
- RPG-style cursor animation on card hover
- Menu sound effects (hover blip + select sound via Tone.js square wave)
- Category tabs (All/Beginner/Intermediate/Advanced/My Uploads) — shown when >4 songs
- Settings gear popover for theme selection (replaces full-width theme grid)

### Changed
- Landing page layout: theme selector moved to compact gear popover (top-right)
- Song cards now show difficulty, duration, and RPG cursor on hover

## [0.4.0]

### Added
- Canvas effects overlay with particle system, key glow, note trails, and bloom post-processing
- Key press squash/stretch animation for physical impact feel
- Sustained note glow pulse (2Hz sine wave on glow intensity)
- Phosphor persistence afterglow for Mono theme (green CRT decay)
- Chromatic aberration bloom for Cool theme (RGB channel split)
- Color cycling via hue rotation on all glow effects
- Pixel art animation upgrade plan (`docs/waterfall-animation-plan.md`)
- `CLAUDE.md` for Claude Code session guidance
- Particle system unit tests (10 tests)

### Fixed
- Floating point RangeError in Tone.js time values (clamped to >= 0)

## [0.3.0] - 2026-01-22

### Added
- 6 pixel art themes: 8-Bit (NES), 16-Bit (SNES), Hi-Bit (modern indie), Cool (Neon), Warm (Sepia), Mono (CRT)
- Theme selector on landing page with color swatches
- Pixel art UI system (panels, buttons, toggles, bevels)
- CRT scanline effect for retro themes
- Phosphor glow for Mono theme
- Noise texture for Hi-Bit theme
- Keyboard shortcuts: Space (play/pause), arrows (seek), Escape (back)
- Toast notification system
- Touch device optimizations and larger tap targets
- Content Security Policy (CSP) meta tag
- File upload validation for MusicXML imports
- iPad layout and playback sync fixes

### Changed
- Complete visual overhaul to pixel art aesthetic across all components
- Simplified piano layout for mobile optimization
- Optimized keyboard rendering to reduce unnecessary re-renders
- Updated README with v0.3.0 features

## [0.2.0] - 2026-01-18

### Added
- ABC notation support with live MIDI generation (Ode to Joy)
- MusicXML upload and client-side conversion to MIDI
- Fullscreen mode for mobile devices
- PWA install hint for iPhone users
- Silent mode warning for iOS
- Return to home button with navigation
- Mobile-optimized controls with settings popover
- Looping controls (set start/end points)
- Split hand coloring with split point support
- Vitest and Playwright test suites
- Automated CI pipeline (lint, build, unit tests, E2E tests)
- Song persistence via localStorage

### Fixed
- First note at tick 0 now lights up correctly on keyboard
- Audio initialization for iOS devices
- ABC notation MIDI buffer extraction
- Fullscreen button detection on mobile

### Changed
- Optimized Waterfall rendering with binary search culling
- Optimized active notes calculation with pre-computed timeline
- Replaced server-side MusicXML conversion with client-side solution
- Enabled static export mode for GitHub Pages deployment

## [0.1.0] - 2026-01-18

### Added
- Initial release of Piano Lessons
- Real-time MIDI visualization ("Waterfall" style)
- Virtual Keyboard with active note highlighting
- Support for "Gnossienne No. 1" (Erik Satie) and "Twinkle Twinkle Little Star"
- Split-hand color customization
- Playback controls (Play/Pause, Seek, Speed)
- Automated screenshot generation via Playwright
- Documentation (README, CONTRIBUTING, RELEASE)
