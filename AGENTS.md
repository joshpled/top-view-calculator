# Top View Calculator

Plain HTML/CSS/JavaScript. Preserve the dark display and compact arithmetic keypad.

## Commands

- `npm start`: Python static server at `http://127.0.0.1:4173`.
- `npm run check`: JavaScript syntax and tests; no installation.
- `npm test`: Node built-in tests.

## Structure and conventions

Authored site files and icons live in `dist/` and are tracked. Pure parser/state exports and `HistoryStorage` share `dist/calculator.js` with DOM wiring guarded for Node. Docs: README.md, ARCHITECTURE.md, docs/decisions/. No dependencies, secrets, or environment variables. Completed history is stored locally under `top-view-calculator.history.v1`; never restore unfinished input or upload calculations. `dist/icons/calculator.svg` is the icon source; re-export its opaque 180 × 180 PNG after artwork changes (command in README).

Follow the feature branch/PR workflow. Do not merge without explicit user approval. Public GitHub Pages publishes the root of `main`; the app URL is https://joshpled.github.io/top-view-calculator/dist/. The earlier private Sites preview remains separate.

The repository is now public. `main` had no branch protection configured when checked on 2026-09-17. Keep using PRs and passing checks; automatic remote branch deletion is enabled.

## Decisions log

- 2026-09-17 — Tap a history calculation or result to replace active input with brief cyan feedback — requested reuse without retyping — the tapped source flashes cyan before revealing the input; expression recall copies recorded text, result recall retains raw precision, and only equals adds/saves another entry; see docs/decisions/003-history-recall.md.

- 2026-09-17 — Persist the latest 100 completed calculations in localStorage — requested history across reloads — restore history only, keep input empty, catch storage failures, and preserve raw answers; see docs/decisions/002-local-history.md. Concurrent instances use the latest successful save.
- 2026-09-17 — Icon PR #3 squash-merged as 6995f23 and verified on GitHub Pages — approved iPhone C icon — feature branch deleted locally and remotely; existing home-screen shortcuts may need re-adding.

- 2026-09-17 — Use one cyan C artwork for the SVG favicon and opaque Apple touch PNG — matches the calculator and provides an iPhone shortcut identity — relative links support the Pages `/dist/` path; existing shortcuts may need re-adding, and this does not enable offline operation.

- 2026-09-17 — Calculator merged to GitHub main through PR #1 (squash f7a20a8) — approved implementation and 42 passing tests — Sites deployment remains independent; source merge does not republish the app.
- 2026-09-17 — Show answers only after Enter/equals — requested explicit calculation behavior — typing renders only the expression; completed answers remain in the scrollable history.
- 2026-09-17 — Enter immediately archives and clears input; the whole display scrolls — prevents old digits returning in a second entry — carried-number bindings keep display rounding separate from numeric precision and are invalidated when edited.
- 2026-09-17 — Static files, arithmetic parser, page-memory history, display-only rounding — fits the lightweight approved scope — floating-point limitations and implicit multiplication precedence are documented; see docs/decisions/001-static-calculator.md.
