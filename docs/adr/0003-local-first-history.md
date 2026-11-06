# ADR-0003: Keep plan history local to the browser

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Aaj needs a reason to return tomorrow but does not need accounts, sharing, or cross-device sync. A database would add identity, retention, deletion, and operational scope.

## Decision

Store versioned structured plans and completion state in browser storage, keyed by local calendar date. Do not store plan history on the Aaj server. Do not retain raw audio. Do not persist transcripts by default.

## Consequences

- Users get same-device continuity without an account.
- Clearing site data, changing browsers, or changing devices loses history.
- Browser storage is not a secure vault; product copy must not imply otherwise.
- Schema versioning, corruption handling, migration, and erase-all behavior require tests.
- Server processing and provider processing still occur for each real inference request and must be disclosed separately.
