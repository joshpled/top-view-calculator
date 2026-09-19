# 005 — Fixed page and wrapping expressions

## Context

The user wants the calculator to stay fixed on screen while long calculations wrap onto multiple lines. Minimum heights could overflow short viewports, and the single-line input hid earlier terms horizontally. Scrolling inside the top display remains approved so history and very long expressions stay accessible.

## Decision

Fix the outer page to the small viewport height, remove minimum panel heights, and retain one scroll container: the display. Use a soft-wrapping textarea sized to its contents, remeasured when its width changes. Preserve selection and reveal the edited line inside the display. Use two columns on short landscape screens so the keypad and display fit together.

## Why and alternatives

Clipping all scrolling would make stored history and long expressions unreachable. A separately scrolling textarea would introduce nested scrolling. Shrinking the expression text would reduce readability. Soft wrapping keeps the user's text and calculation semantics unchanged, including Enter-to-calculate and saved history.

## Gotchas

The small viewport height favors a stable layout while mobile browser toolbars expand/collapse; it may leave spare space when the toolbar retracts. Desktop browser emulation does not establish physical iPhone behavior. Browser zoom remains available. This change adds no dependencies and does not change stored data.
