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

## Hosting and iPhone home screen

The public app is hosted on [GitHub Pages](https://joshpled.github.io/top-view-calculator/dist/). Pages publishes the repository root from `main`, so the calculator URL includes `/dist/`. Merging to `main` triggers Pages publication; wait for its deployment to finish before checking changes.

In Safari on iPhone, open the calculator link, use Share → Add to Home Screen, then Add. The shortcut uses a cyan **C** on charcoal. If an existing shortcut keeps the old icon, remove that shortcut and add it again after the deployment finishes.

`dist/icons/calculator.svg` is the artwork source and browser favicon. `dist/icons/apple-touch-icon.png` is its opaque 180 × 180 export for iPhone, linked explicitly from the HTML using Apple's [web clip icon guidance](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). To change the artwork, edit the SVG and regenerate the PNG. With librsvg's `rsvg-convert` available, run:

```sh
rsvg-convert --width 180 --height 180 --output dist/icons/apple-touch-icon.png dist/icons/calculator.svg
```

`rsvg-convert` is only an optional artwork export tool; running the app and its checks requires no new dependency. This adds a shortcut icon, not offline support. Physical iPhone installation still needs a device check.

## Use

- Enter numbers, decimals, `+`, `−`, `×`, `÷`, and nested parentheses. Answers appear only after Enter / `=`. Enter saves the calculation once in history and immediately clears the input for the next calculation.
- Scroll or swipe anywhere in the upper display to review earlier calculations. The keypad stays in place. New input returns the display to the current calculation.
- `2(3+4)`, `(2+3)(4+5)`, and `(2+3)4` imply multiplication. Multiplication, division, and implied multiplication run left to right: `6÷2(1+2)` is `9`. Write `6÷(2(1+2))` when the whole product belongs in the denominator.
- After Enter, a number or opening parenthesis starts fresh; an operator continues from the answer. Repeated Enter does nothing.
- `±` changes the sign of the **whole expression**. Backspace deletes the selection or preceding character. `C` / Escape clears only the current expression.
- Keyboard: digits, `.`, parentheses, `+ - * /`, Enter / `=`, Backspace, Escape. Click the expression to select or edit within it.
- The last 100 completed calculations are saved automatically on this browser/device and restored when you reload or reopen the calculator. Only Enter / `=` saves; unfinished input is not saved. Reopening starts with an empty input, so old digits cannot enter the next calculation. `C` still clears only the current entry.

## Saved history

History uses the browser's [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) under `top-view-calculator.history.v1`. The app does not upload calculations or sync them between devices, browsers, or the earlier private Sites address. Safari tabs and an installed home-screen app may use separate storage; do not rely on their histories being shared.

Clearing this site's browser data removes saved history. Private browsing does not provide lasting storage. Other apps served from the same `https://joshpled.github.io` origin can access that origin's localStorage, so it is not an encrypted or isolated vault.

If loading or saving fails, a message appears below the input and the calculator continues working in memory. A later successful calculation retries saving the current history. Invalid stored rows are skipped; unreadable data stays untouched until a new calculation successfully saves. Multiple open calculator tabs do not merge their histories: the most recent successful save replaces the stored list. Use one instance for a consistent history.

## Precision

Answers display up to 12 significant digits. Operator continuation shows that same tidy number while retaining its underlying JavaScript Number; editing its digits switches to the newly typed value. Very large or small results use scientific notation. This is everyday floating-point arithmetic, not arbitrary-precision math; very large integers, cancellation, and underflow have standard floating-point limits.

Division by zero, malformed expressions, and non-finite results show a correctable error on Enter. Incomplete input stays quiet while typing.

See [ARCHITECTURE.md](ARCHITECTURE.md), [the implementation decision](docs/decisions/001-static-calculator.md), and [the saved-history decision](docs/decisions/002-local-history.md).
