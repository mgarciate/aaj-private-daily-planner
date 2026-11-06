# ADR-0004: Never fabricate provider evidence

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The target 0G prize asks teams to surface request IDs. Internal correlation IDs, timestamps, UUIDs, hashes, and demo identifiers are easy to generate but do not prove a provider request. Presenting them as 0G evidence would mislead users and judges.

## Decision

Aaj displays a 0G request ID only when the live provider response returned that exact value in a response location verified during integration. Each ID remains attached to its inference stage. If no ID is returned, Aaj shows “unavailable.”

Demo mode contains no provider request IDs. It may use a clearly named `sampleRunId` beginning with `demo_`, but the UI never calls that value a request ID, trace, proof, or verified run.

Aaj correlation IDs are used only for diagnostics and are visually and structurally separate from provider evidence.

## Consequences

- Some successful runs may have incomplete prize evidence and must say so honestly.
- Integration begins by observing and documenting actual response behavior.
- API types use explicit `available`/`unavailable` evidence states.
- Tests must prevent fallback IDs and prohibited demo language.
- Demo planning must include a confirmed real run with authentic evidence; simulation cannot substitute for it.
