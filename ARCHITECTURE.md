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

`Calculator` separates editing, completion, and errors. Typing only displays the expression; there is no live answer preview or render-time evaluation. Enter evaluates and saves the expression and raw numeric answer once, then empties the input immediately. Completed rows remain consistently visible in history; they are never removed and reinserted when editing starts. The entire `#display` scrolls, while the keypad stays outside it. New input scrolls to the bottom.

Continuation shows the same 12-significant-digit answer the user saw. `carriedNumber` binds its numeric token (start, length, raw value) to the original precision. The parser substitutes that raw value only for the untouched token. Edits within the number invalidate the binding; edits before it move the binding. This prevents ugly floating-point digits from entering the visible expression without introducing cumulative rounding. Native replacement of the input clears the binding.

The DOM adapter preserves text selection for keypad editing. Physical arithmetic keys and keypad taps use the same actions even when the input has focus. Native replacement input has an already-empty value after Enter, so it cannot append to the preceding calculation. History uses `textContent`, not HTML interpolation. Limits: 500 input characters and 100 session entries.

When a browser offers `document.modelContext`, the optional `calculate_expression` tool validates input before using the same visible Enter flow. Unsupported browsers keep the normal interface. This tool has no network or storage access.

## Hosting and checks

`dist/` is tracked source, not generated output. `npm run check` validates JavaScript syntax and runs Node's built-in tests. There is no TypeScript compiler or lint dependency. Local and hosted versions use the same relative asset paths.

The GitHub implementation stays on `feature/calculator` for review. Sites receives the exact committed static source for the approved private preview; publication does not merge the GitHub PR.
