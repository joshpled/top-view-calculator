# Top View Calculator

A phone-friendly calculator in plain HTML, CSS, and JavaScript, with a roomy dark display and a simple keypad.

## Run

Requires Python 3 for the local server and Node.js 22+ for checks. There are no dependencies or environment variables.

```sh
npm start
# Open http://127.0.0.1:4173
npm run check
```

The authored site lives in `dist/`; no build is required. Serve that folder through any static HTTP host. The JavaScript module needs HTTP rather than opening the HTML as a local file.

## Use

- Enter numbers, decimals, `+`, `−`, `×`, `÷`, and nested parentheses. Answers appear only after Enter / `=`. Enter saves the calculation once in history and immediately clears the input for the next calculation.
- Scroll or swipe anywhere in the upper display to review earlier calculations. The keypad stays in place. New input returns the display to the current calculation.
- `2(3+4)`, `(2+3)(4+5)`, and `(2+3)4` imply multiplication. Multiplication, division, and implied multiplication run left to right: `6÷2(1+2)` is `9`. Write `6÷(2(1+2))` when the whole product belongs in the denominator.
- After Enter, a number or opening parenthesis starts fresh; an operator continues from the answer. Repeated Enter does nothing.
- `±` changes the sign of the **whole expression**. Backspace deletes the selection or preceding character. `C` / Escape clears only the current expression.
- Keyboard: digits, `.`, parentheses, `+ - * /`, Enter / `=`, Backspace, Escape. Click the expression to select or edit within it.
- The last 100 calculations stay in page memory. Refreshing clears them; no calculations leave the browser.

## Precision

Answers display up to 12 significant digits. Operator continuation shows that same tidy number while retaining its underlying JavaScript Number; editing its digits switches to the newly typed value. Very large or small results use scientific notation. This is everyday floating-point arithmetic, not arbitrary-precision math; very large integers, cancellation, and underflow have standard floating-point limits.

Division by zero, malformed expressions, and non-finite results show a correctable error on Enter. Incomplete input stays quiet while typing.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [the implementation decision](docs/decisions/001-static-calculator.md).
