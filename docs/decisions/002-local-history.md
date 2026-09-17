# 002 — Local calculation history

Date: 2026-09-17

## Context and decision

The user wants past calculations to survive reopening the calculator. Save the latest 100 completed expression/answer pairs in localStorage after successful Enter. Restore history on startup, but leave active input and answer-continuation state empty. This supersedes ADR 001's page-memory-only history.

## Why and alternatives

The existing history is a small bounded list. Native localStorage needs no library or backend; IndexedDB would add asynchronous state management without a benefit at this size. Account sync and persistent drafts are outside the requested scope. In particular, restoring an active expression would risk bringing back the old-digits problem.

A storage adapter catches access, parsing, and write failures and exposes a short user-facing notice while arithmetic continues. A versioned, app-specific key avoids accidental collisions with other GitHub Pages apps. Load validates structure, bounded expression text, and finite answers, strips extra fields, and keeps at most 100 valid rows. It never evaluates stored text or writes on startup.

Save the original numeric answer. A continuation's displayed expression can contain a rounded number even though the calculation used full precision; recomputing that display would change the historical result.

## Tradeoffs and gotchas

- Browser/device storage is not a backup or cross-device sync. Clearing site data and private browsing can discard it; separate browser/home-screen storage contexts may have different histories.
- GitHub Pages apps on the same origin can read the stored data. The key is namespaced, not a security boundary; calculation data is not uploaded by this app.
- Multiple open instances do not merge: the latest successful save replaces the stored list. Adding timestamps, unique IDs, and conflict reconciliation would be a separate feature.
- Storage failure preserves current in-memory history and any earlier saved data. A subsequent successful calculation retries the save. If old stored data was malformed, the successful save replaces it with the current valid history.
- `C` retains its current-entry meaning. Saved history can be removed through the browser's site-data controls.

## Validation

Node tests cover reopening, fresh input, equals-only saving, C, repeated Enter, raw precision, 100-entry limits, invalid data, blocked access, write failures/recovery, and unrelated storage keys. Browser checks verify visible history after reload and that editing still shows no premature result. Physical iPhone installation and storage behavior require device verification.
