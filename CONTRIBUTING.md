# Contributing to Piano Lessons

Thank you for your interest in contributing to this project!

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# App runs at http://localhost:3000

# Build for production
npm run build

# Lint code
npm run lint
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components (Piano, Controls, etc.)
│   ├── hooks/            # Custom hooks (usePianoAudio)
│   └── lib/              # Utility functions and types
├── public/               # Static assets (MIDI files)
├── scripts/
│   └── take-screenshots.mjs # Automated screenshot tool
└── .github/              # GitHub workflows and screenshots
```

## Working with MIDI

The application relies on MIDI files located in `public/`.
- **Primary Test File:** `gnossienne1.mid`
- **Helper Script:** Use `../download_midi.py` (requires Python/uv) if you need to fetch the original source file again.

When adding new features that depend on MIDI parsing, ensure you test with multiple MIDI files to verify compatibility with `@tonejs/midi`.

## Updating Screenshots

Screenshots are generated programmatically using Playwright. This ensures documentation always matches the actual UI.

```bash
# 1. Ensure dev server is running
npm run dev

# 2. Run the screenshot script (in a new terminal)
npm run screenshots
```

This will:
- Launch a headless browser
- Capture screenshots of the Landing Page, Idle Player, and Active Player
- Save them to `.github/screenshots/`

**When to update:**
- UI design changes
- New visual features (e.g., new color themes)
- Major layout updates

## Pull Request Workflow

1. **Fork & Branch:** Create a feature branch from `main`.
2. **Implement:** Write clean, typed code.
3. **Test:** Ensure `npm run build` and `npm run lint` pass locally.
4. **Submit:** Open a PR describing your changes.

## Code Style

- **TypeScript:** Use strict types. Avoid `any`.
- **Tailwind CSS:** Use utility classes. Avoid custom CSS files where possible.
- **React:** Functional components with Hooks.
- **State:** Use `useState` for UI state and `Tone.js` events for audio sync.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.