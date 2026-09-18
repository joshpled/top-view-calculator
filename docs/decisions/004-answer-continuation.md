# 004 — Label operator continuations with answer

Date: 2026-09-18

## Context and decision

The user wants pressing an arithmetic operator immediately after equals to show `answer +`, `answer −`, `answer ÷`, or `answer ×`. Capture the last completed result in the existing carried-number binding and display the generated `answer` label with spaces around the operator. Digits, decimals, parentheses, and pasted expressions continue to start fresh after equals.

## Why and alternatives

The label keeps the input readable while retaining full precision. Bind it to the result at the start of the continuation instead of resolving it dynamically from whichever answer is most recent. No general variable language is needed: before evaluation, replace the one bound label with a parenthesized raw numeric string and use the existing arithmetic parser. This also correctly groups negative results and implied multiplication.

Resolve the label before saving history. Persisting the word alone would make a later recall ambiguous; saving extra variable metadata would need a storage migration. Numeric history is compatible with the existing schema and can be evaluated independently after reopening. Existing rounded historical expressions remain unchanged.

## Editing and limits

Insertion before the label moves its binding. Backspace/replacement touching its letters treats it as one token. Editing surrounding operands preserves it, and sign toggling moves it with the expression. C, fresh input, recall, and native whole-input replacement invalidate the old binding. Pasted text cannot invent a bound `answer` reference.

The displayed input and the resolved numeric expression must each fit the existing 500-character limit. Extremely long continuations can exceed the resolved limit before the visible input limit. They produce the existing correctable length error without saving a row. Full precision can add digits to saved expressions; it does not add a premature result while typing.

## Validation

Tests cover every operator and keyboard alias, consecutive continuations, full precision, zero/negative/extreme finite results, fresh-entry rules, token edits, sign toggling, error recovery, no save before equals, reload/recall, and length limits. Browser checks cover the visible label and keyboard/keypad paths. This adds no dependencies or network behavior.
