# 001 — Static browser calculator

Date: 2026-09-17

## Context and decision

The app needs a roomy dark display, everyday arithmetic, parentheses, and a compact keypad. Use three static files, a dedicated arithmetic parser, native browser controls, JavaScript Numbers, and Node's built-in tests. Keep history in page memory.

## Why and tradeoffs

There is no backend or complex navigation to justify a framework. The parser enforces precedence while preventing input from executing code. Keeping raw answers separate from formatted text avoids cumulative display rounding.

`eval()` and `Function()` were rejected because input must remain arithmetic. A math library or arbitrary-precision system would add complexity beyond this scope. Floating-point limitations are documented. Persistent history was not requested.

Implied multiplication shares multiplication/division precedence. `±` negates the entire expression, keeping grouped calculations predictable; its accessible label states this behavior.
