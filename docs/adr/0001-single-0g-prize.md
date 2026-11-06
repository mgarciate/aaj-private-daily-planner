# ADR-0001: Target a single 0G prize

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

ETHGlobal permits multiple partner-prize selections, but Aaj has a short delivery window and one clear dependency: speech and text inference. The 0G Private Computer Classic track asks for a consumer product with 0G inference in the primary flow, request IDs, return value, a live link, and a short demo.

## Decision

Target only **0G — Build with 0G Private Computer (Classic)**. Do not add another sponsor integration unless the complete 0G critical path, tests, deployment, evidence, and demo are already finished—and changing the target would require a new ADR.

## Consequences

- The architecture and demo can optimize for one complete voice-to-plan loop.
- 0G must be genuinely load-bearing and evidenced.
- There is less prize optionality, but less integration and submission risk.
- iAI sign-in remains a post-MVP bonus, not a hidden second critical path.
