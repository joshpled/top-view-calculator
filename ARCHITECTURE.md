# Architecture

The browser owns all calculator state. Hosting serves static HTML, CSS, JavaScript, and icon assets; there is no backend, database, account system, or dependency bundle.

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Accessible display, editable expression, and 21-key keypad |
| `dist/styles.css` | Dark surfaces, tall display, responsive keypad, and focus states |
| `dist/calculator.js` | Arithmetic parser, state model, history storage adapter, formatting, and DOM wiring |
| `dist/icons/` | Shared C artwork as SVG favicon and opaque 180 × 180 PNG for iPhone home-screen shortcuts |
| `tests/calculator.test.js` | Precedence, shorthand multiplication, errors, and input transitions |
| `tests/history.test.js` | Restore/save behavior, input isolation, storage limits, malformed data, and failure recovery |
| `tests/recall.test.js` | Expression/result recall, precision, replacing input, and saving only on equals |
| `.openai/hosting.json` | Earlier private Sites identity; independent of current GitHub Pages hosting |

## Arithmetic flow

The tokenizer accepts decimal/scientific numbers and arithmetic symbols. A recursive descent parser reads primary values (including unary signs and parentheses), then multiplication/division, then addition/subtraction. It never runs input as JavaScript. Implied multiplication shares multiplication/division precedence and left-to-right evaluation.

`Calculator` separates editing, completion, and errors. Typing only displays the expression; there is no live answer preview or render-time evaluation. Enter evaluates and saves the expression and raw numeric answer once, then empties the input immediately. Completed rows remain consistently visible in history; they are never removed and reinserted when editing starts. The entire `#display` scrolls, while the keypad stays outside it. New input scrolls to the bottom.

Continuation shows the same 12-significant-digit answer the user saw. `carriedNumber` binds its numeric token (start, length, raw value) to the original precision. The parser substitutes that raw value only for the untouched token. Edits within the number invalidate the binding; edits before it move the binding. This prevents ugly floating-point digits from entering the visible expression without introducing cumulative rounding. Native replacement of the input clears the binding.

The DOM adapter preserves text selection for keypad editing. Physical arithmetic keys and keypad taps use the same actions even when the input has focus. Native replacement input has an already-empty value after Enter, so it cannot append to the preceding calculation. History uses `textContent`, not HTML interpolation. Limits: 500 input characters and 100 completed entries.

## History recall

Each history expression and answer is a native button with a descriptive accessible name and a minimum 44px target height. Click/tap or keyboard Enter/Space calls `Calculator.recall(index, part)`. Expression recall uses `edit()` to replace active input with recorded text and discard any carried-number binding. Answer recall uses `useAnswer()` to retain the saved numeric precision. Both clear completion/error/previous-answer state without evaluating, mutating history, or writing storage. No history format migration is needed.

Recall focuses the input with its cursor at the end, scrolls the display to it, and shows a static cyan highlight and a short notice for 1.4 seconds. Ordinary input/actions cancel that feedback, and a repeated recall restarts its timer. Clearing the timer updates feedback only, so it cannot unexpectedly scroll the display while the user browses history. Arithmetic/storage errors take priority over recall notices; a separate live announcement still identifies the recall. There is no animated motion, including for reduced-motion users. History buttons do not cancel pointer events, preserving normal swipe scrolling. See [ADR 003](docs/decisions/003-history-recall.md).

When a browser offers `document.modelContext`, the optional `calculate_expression` tool validates input before using the same visible Enter flow, including saving history locally. Unsupported browsers keep the normal interface. This tool has no network access.

## History persistence

`HistoryStorage` receives a getter for the browser's localStorage. Both the getter and its read/write calls can throw; all are caught inside the adapter so failures cannot become arithmetic errors. `Calculator` accepts this optional adapter and loads history once in its constructor. Its default remains an in-memory model for arithmetic tests.

Successful Enter updates history, clears active input, and then saves `{ version: 1, entries: [{ expression, answer }] }` under `top-view-calculator.history.v1`. Empty/repeated Enter, typing, arithmetic errors, and `C` do not write. Restoring does not set `expression`, `answer`, `completed`, or `carriedNumber`; the next calculation starts fresh. Stored raw answers are not recomputed from rounded continuation text.

Loading rejects data over 400,000 characters (enough for 100 maximum-length expressions even with JSON escaping) and unsupported structures/versions. It skips entries with invalid expression types, lengths, or characters and non-finite numeric answers, strips unknown fields, and retains the latest 100 valid rows. It does not evaluate stored expression text. Existing data is not rewritten on startup. Load/save issues appear in the existing feedback area; arithmetic errors take priority, and only arithmetic errors mark the input invalid. A successful save clears the storage notice.

Only this app's key is written. History is local to a browser storage context and origin, not encrypted, uploaded, or shared through an account. GitHub Pages projects on the same host share an origin; the app-specific key avoids accidental key collisions, not same-origin access. Clearing site data or ending a private session can remove history. Simultaneous instances use the most recent successful save; there is no cross-tab merge. See [ADR 002](docs/decisions/002-local-history.md).

## Hosting and checks

`dist/` is tracked source, not generated output. `npm run check` validates JavaScript syntax and runs Node's built-in tests. There is no TypeScript compiler or lint dependency. Local and hosted versions use the same relative asset paths.

GitHub Pages publishes the root of public `main`; the calculator is at `/top-view-calculator/dist/`. Relative asset links resolve beside its HTML, including the explicitly linked Apple touch icon. The PNG stays opaque and square so iOS can apply its own home-screen mask. Its matching SVG supplies the browser favicon and editable source. These assets do not add a service worker or offline caching.

Changes use a feature or fix branch and a PR. Merging to `main` triggers GitHub Pages publication. The earlier private Sites preview is separate and does not update through this workflow.
