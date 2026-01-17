# Contributing to Piano Lessons

Thank you for your interest in contributing to this project!

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── lib/              # Utility functions and types
├── public/               # Static assets (MIDI files)
└── .github/              # GitHub workflows and config
```

## MIDI File Management

The application relies on `public/gnossienne1.mid`. If you need to update or replace the MIDI file:
1. Ensure the file is a standard GM (General MIDI) or similar format.
2. Place it in `public/`.
3. Verify parsing works correctly with `@tonejs/midi`.

## Pull Request Workflow

1. **Fork & Branch:** Create a feature branch from `main`.
2. **Implement:** Write clean, typed code.
3. **Test:** Ensure `npm run build` and `npm run lint` pass.
4. **Submit:** Open a PR describing your changes.

## Code Style

- **TypeScript:** Use strict types. Avoid `any`.
- **Tailwind:** Use utility classes.
- **React:** Functional components with Hooks.
