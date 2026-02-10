# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0]

### Added
- Canvas effects overlay with particle system, key glow, note trails, and bloom post-processing
- Key press squash/stretch animation for physical impact feel
- Sustained note glow pulse (2Hz sine wave on glow intensity)
- Pixel art animation upgrade plan (`docs/waterfall-animation-plan.md`)
- `CLAUDE.md` for Claude Code session guidance
- Particle system unit tests (10 tests)

### Fixed
- Floating point RangeError in Tone.js time values (clamped to >= 0)

## [0.3.0] - 2026-01-22

### Added
- 6 pixel art themes: 8-Bit (NES), 16-Bit (SNES), Hi-Bit (modern indie), Cyber, Vintage, Terminal
- Theme selector on landing page with color swatches
- Pixel art UI system (panels, buttons, toggles, bevels)
- CRT scanline effect for retro themes
- Phosphor glow for Terminal theme
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
