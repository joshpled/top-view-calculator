# Architecture

The browser owns all calculator state. Hosting serves three static files; there is no backend, database, account system, or dependency bundle.

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Accessible display, editable expression, and 21-key keypad |
| `dist/styles.css` | Dark surfaces, tall display, responsive keypad, and focus states |
| `dist/calculator.js` | Arithmetic parser, state model, formatting, and DOM wiring |
| `tests/calculator.test.js` | Precedence, shorthand multiplication, errors, and input transitions |
| `.openai/hosting.json` | Private Sites identity and static output folder |

## Arithmetic flow

The tokenizer accepts decimal/scientific numbers and arithmetic symbols. A recursive descent parser reads primary values (including unary signs and parentheses), then multiplication/division, then addition/subtraction. It never runs input as JavaScript. Implied multiplication shares multiplication/division precedence and left-to-right evaluation.

`Calculator` separates editing, completion, and errors. Enter saves the expression and raw numeric answer. The UI keeps the latest completed calculation in the current area until editing resumes, then moves it into the scrollable history. Only display formatting rounds to 12 significant digits; continuation uses the raw answer.

The DOM adapter preserves text selection for keypad editing. Native input handles direct edits; keypad and unfocused keyboard use the same model actions. History uses `textContent`, not HTML interpolation. Limits: 500 input characters and 100 session entries.

When a browser offers `document.modelContext`, the optional `calculate_expression` tool validates input before using the same visible Enter flow. Unsupported browsers keep the normal interface. This tool has no network or storage access.

## Hosting and checks

`dist/` is tracked source, not generated output. `npm run check` validates JavaScript syntax and runs Node's built-in tests. There is no TypeScript compiler or lint dependency. Local and hosted versions use the same relative asset paths.

The GitHub implementation stays on `feature/calculator` for review. Sites receives the exact committed static source for the approved private preview; publication does not merge the GitHub PR.
