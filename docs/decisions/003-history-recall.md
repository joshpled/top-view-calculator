# 003 — Recall history into the active input

Date: 2026-09-17

## Context and decision

The user wants tapping a saved calculation or result to fill the input with visual feedback. Use separate native buttons for the expression and its answer. Each replaces the current input, brings it into view, and places the cursor at the end. The clicked expression or result flashes cyan for 200ms before scrolling, so the user can identify the source text. The input then highlights cyan with a short notice for 1.4 seconds. Editing or another recall cancels pending feedback, preventing an old timer from scrolling or highlighting the wrong entry. Recall remains an edit: equals is still required to evaluate and save.

## Why and tradeoffs

Native buttons provide touch, keyboard, and accessible semantics without custom key handling. A static highlight provides feedback without animated motion, and a 44px target height makes the two actions easier to distinguish on a phone. Rows become slightly taller, with the existing display scrolling as before.

Expression recall copies exactly the recorded text. Answer recall uses the existing carried-number binding to preserve full precision behind the tidy display; editing the number invalidates that binding. Restoring an expression's original hidden precision would require new stored metadata and a migration, and could make edited text surprising. Saved answers already contain the needed numeric precision.

Replacing input is intentional; inserting at a cursor could accidentally concatenate an old calculation with new digits. Existing history is not edited, and recalling repeatedly must neither save nor duplicate entries. Storage failures continue to take priority over the temporary success notice. No dependencies or storage-schema changes are needed.

## Validation

Model tests cover replacement, errors/completion reset, full-precision results, edited results, repeated recall, negative/zero/scientific numbers, restored history, and no writes before equals. Browser checks cover touch, keyboard, focus/cursor, feedback lifetime, scrolling, and persistence. Physical iPhone checks remain separate from browser emulation.
