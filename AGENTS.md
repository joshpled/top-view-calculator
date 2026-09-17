# Top View Calculator

Plain HTML/CSS/JavaScript. Preserve the dark display and compact arithmetic keypad.

## Commands

- `npm start`: Python static server at `http://127.0.0.1:4173`.
- `npm run check`: JavaScript syntax and tests; no installation.
- `npm test`: Node built-in tests.

## Structure and conventions

Three authored site files live in `dist/` and are tracked. Pure parser/state exports share `dist/calculator.js` with DOM wiring guarded for Node. Docs: README.md, ARCHITECTURE.md, docs/decisions/. No dependencies, secrets, environment variables, or persistent user data.

Follow the feature branch/PR workflow. Do not merge without explicit user approval. Private Sites publication and GitHub main are separate states.

GitHub cannot enforce branch protection for this private repository on the current account plan. Keep using PRs and passing checks; automatic remote branch deletion is enabled.

## Decisions log

- 2026-09-17 — Calculator merged to GitHub main through PR #1 (squash f7a20a8) — approved implementation and 42 passing tests — Sites deployment remains independent; source merge does not republish the app.
- 2026-09-17 — Show answers only after Enter/equals — requested explicit calculation behavior — typing renders only the expression; completed answers remain in the scrollable history.
- 2026-09-17 — Enter immediately archives and clears input; the whole display scrolls — prevents old digits returning in a second entry — carried-number bindings keep display rounding separate from numeric precision and are invalidated when edited.
- 2026-09-17 — Static files, arithmetic parser, page-memory history, display-only rounding — fits the lightweight approved scope — floating-point limitations and implicit multiplication precedence are documented; see docs/decisions/001-static-calculator.md.
