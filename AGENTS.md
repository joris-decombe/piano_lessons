# AGENTS.md

Guidance for AI agents (Claude, Gemini, Codex, and friends) working in this repository.

> **Read [CLAUDE.md](CLAUDE.md) first.** It is the maintained reference: architecture, the
> critical configuration that silently breaks when changed, testing notes, and the running
> list of hard-won gotchas. This file is a short orientation plus the few things that live
> nowhere else. Where the two disagree, CLAUDE.md wins — and the disagreement is a bug worth
> fixing, since this file went stale once already by duplicating what CLAUDE.md said better.

## Project Overview

**Piano Lessons** is an interactive web app for learning piano. It ships a library of a dozen
classical pieces and shows each one two ways, both synchronised to audio playback:

- a Guitar Hero-style waterfall of falling notes onto an 88-key virtual keyboard, and
- a pixel-art sheet music view — a scrolling grand staff (`V`, or the staff button).

Scores load from MusicXML, MIDI or ABC, and users can upload their own MusicXML in the browser.
Playback uses real Salamander grand piano samples through Tone.js. Everything runs client-side:
the app is a Next.js static export with no server, no accounts and no API routes.

## Development Commands

```bash
npm run dev            # Dev server — http://localhost:3000/piano_lessons
npm run build          # Production build (static export to ./out)
npm run lint           # ESLint
npm test -- --run      # Vitest unit tests, single run
npx playwright test    # E2E tests (starts the dev server itself)
npm run screenshots    # Regenerate .github/screenshots (needs a dev server running)
```

CLAUDE.md has the rest, including the single-file and CI-equivalent invocations, and the
`uv`-managed Python helpers for wrangling scores.

## Architecture at a Glance

`page.tsx` (landing + lesson) → `usePianoAudio` (Tone.js transport, MIDI parsing, scheduling)
→ the visual layers: `Waterfall`, `PixelScore`, `Keyboard`, `Controls`.

- `src/hooks/usePianoAudio.ts` — the audio engine and the single source of playback truth
- `src/components/piano/` — waterfall, keyboard, controls, canvas effects, sheet music
- `src/lib/musicxml/` — MusicXML parser and MIDI generator
- `src/lib/score/` — notation model, pixel glyphs and the sheet music renderer
- `src/lib/` — effects engine, particles, note colours, validation
- `public/scores/` — the bundled MusicXML library

Two constraints bite immediately and are explained in CLAUDE.md: `basePath` is
`/piano_lessons`, so every local URL and the Playwright `baseURL` must include it; and the
React Compiler is enabled, which makes some innocuous-looking edits to effect bodies fail at
runtime.

## Administrator Access

The `main` branch protection is configured with `"enforce_admins": false`.

This means that while the rules (reviews, linear history, CI checks) are enforced for standard
contributors, **administrators can bypass these checks** when necessary.

### Merging PRs as Admin

If you are an administrator and need to merge a PR that doesn't satisfy all checks (e.g. your
own PR, which you cannot approve):

```bash
# Use the --admin flag to forcefully merge
gh pr merge <PR_NUMBER> --squash --delete-branch --admin
```

No need to disable/re-enable protection rules.

## Conventions

- TypeScript strict mode; avoid `any`
- Functional components with React Hooks; Tailwind utility classes
- Conventional commits (`feat:`, `fix:`, `chore:`, …)
- Never amend commits — fix forward, so history survives across PRs
