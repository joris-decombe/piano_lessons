# AGENTS.md

This file provides guidance to AI agents (like Gemini, Claude, etc.) when working with code in this repository.

## Project Overview

**Piano Lessons** is an interactive web application designed to help users learn to play "Gnossienne: No. 1" by Erik Satie. It provides a real-time, waterfall-style visualization of MIDI notes falling onto a virtual keyboard.

### Key Features
- **Visual Learning:** "Falling notes" visualization synced with audio.
- **Audio Engine:** High-quality playback using Tone.js synthesis.
- **Interactivity:** Play, pause, restart, and variable playback speed (0.5x to 1.5x).
- **Responsive Design:** Built with Tailwind CSS for various screen sizes.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production (Static Export)
npm run build

# Start production server (locally serves the built app)
npm run start

# Lint code
npm run lint
```

## Architecture

### Frameworks & Libraries
- **Next.js 16 (App Router):** Core framework using Server Components where applicable, but primarily Client Components for the interactive UI.
- **TypeScript:** Strict type safety throughout the codebase.
- **Tailwind CSS 4:** Utility-first styling with `@tailwindcss/postcss`.
- **Tone.js:** Audio synthesis and transport scheduling.
- **@tonejs/midi:** Parsing the `gnossienne1.mid` file.
- **Framer Motion:** Smooth animations for UI elements.

### Deployment & Build
- **Static Export:** The project is configured with `output: "export"` in `next.config.ts`.
- **GitHub Pages:** Deploys automatically to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).
- **Images:** Unoptimized images configured for static export compatibility.

### Key Directories
- `src/app/`: Next.js App Router pages.
- `src/components/`: Reusable UI components (Piano, Controls, Visualization).
- `public/`: Static assets, specifically the MIDI file `gnossienne1.mid`.

## Technical Context

### Audio & MIDI Handling
- The app fetches `gnossienne1.mid` from the `public` folder at runtime.
- `@tonejs/midi` converts the binary MIDI data into a JSON structure containing tracks, notes, and timing.
- `Tone.Transport` is used to schedule note playback and visual events.
- **Note:** Audio contexts in browsers require user interaction to start. The UI handles this via a "Start" or "Play" button overlay.

### Visual Sync
- The visualization logic likely maps MIDI note start times and durations to CSS animations or Canvas drawing (check specific implementation in `src/`).
- `requestAnimationFrame` or Tone.js's `Draw` loop may be used to sync visuals with the audio thread.

## CI/CD Pipeline

1. **CI (`.github/workflows/ci.yml`):** Runs on Push/PR.
   - Installs dependencies.
   - Lints code (`npm run lint`).
   - Builds project (`npm run build`) to ensure type safety and valid static export.

2. **Deploy (`.github/workflows/deploy.yml`):** Runs on Push to `main`.
   - Builds the application.
   - Uploads the `out` directory as a GitHub Pages artifact.
   - Deploys to the `gh-pages` environment.

3. **Release (`.github/workflows/release.yml`):** Runs on Tag `v*`.
   - Generates a changelog from commit messages.
   - Creates a GitHub Release with `.zip` and `.tar.gz` archives of the build.

## Code Style & Conventions

- **Components:** Functional components using React Hooks.
- **Styling:** Tailwind CSS utility classes. Avoid custom CSS files unless necessary for complex animations.
- **State:** Use React `useState` / `useReducer` for UI state. Avoid global state libraries unless complexity demands it.
- **Commits:** Follow conventional commit messages (e.g., "feat: add speed control", "fix: mobile layout").
