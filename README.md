# Project: piano_lessons

## Project Overview
`piano_lessons` is a Next.js web application designed to be an interactive piano learning tool. Its primary goal is to help users learn to play "Gnossienne: No. 1" by Erik Satie through a real-time visualization interface.

The application visualizes MIDI data as "falling notes" (waterfall style) onto a virtual keyboard, allowing users to follow along with the music. It includes playback controls (speed, pause, replay) and utilizes modern web audio technologies for accurate sound reproduction.

## Architecture & Technology
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS 4 (using `@tailwindcss/postcss`)
*   **Audio Engine:** `tone` (Tone.js) for synthesis and scheduling.
*   **MIDI Parsing:** `@tonejs/midi` for converting MIDI files into JSON/JavaScript objects.
*   **UI/Animation:** `framer-motion` for smooth visual transitions, with `clsx` and `tailwind-merge` for class management.

## Key Files & Directories
*   `src/app/`: Contains the Next.js App Router pages and layouts.
*   `public/`: Intended location for static assets, specifically `gnossienne1.mid`.
*   `package.json`: Defines dependencies and scripts.
*   `../download_midi.py`: A Python utility script (located in the parent directory) used to attempt downloading the required MIDI file from various mirrors.

## Building and Running

### Prerequisites
*   Node.js and npm
*   `uv` (for running the Python helper script)

### Commands
**Development Server:**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Build for Production:**
```bash
npm run build
```

**Start Production Server:**
```bash
npm run start
```

**Linting:**
```bash
npm run lint
```

**MIDI Setup:**
The application relies on `public/gnossienne1.mid`. Use the helper script in the parent directory to attempt a download:
```bash
uv run ../download_midi.py
```
*(Note: As of setup, valid mirrors for the MIDI file are being investigated due to 404 errors.)*

## Development Conventions
*   **Styling:** Use Tailwind CSS utility classes. Avoid custom CSS files where possible.
*   **Type Safety:** Strict TypeScript usage is encouraged.
*   **Components:** Functional components with React Hooks.
*   **State Management:** Local React state for UI controls; Tone.js internal state for audio transport.
