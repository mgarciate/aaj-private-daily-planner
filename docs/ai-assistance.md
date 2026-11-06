# AI assistance ledger

Aaj uses AI as an assistant, not as the accountable author or verifier. Human contributors remain responsible for product choices, implementation, security, testing, claims, and submission.

## Ledger

| Date | Tool | Assistance | Affected paths | Human responsibility and verification |
|---|---|---|---|---|
| 2026-11-06 | Hermes Agent (Nous Research), configured model | Synthesized supplied research; drafted product, architecture, specification, delivery, demo, submission, ADR, and overview documents | `README.md`, `docs/**` | Review scope and wording; compare event facts with primary pages; approve architecture; verify every implementation-time claim through real execution |

## Required implementation-time updates

Append an entry whenever AI materially assists with source code, tests, assets, copy, debugging, or review. Each entry must name:

- date and tool/model when known;
- the kind of assistance;
- exact affected paths or assets;
- what a human changed, tested, or independently verified; and
- any output rejected or materially corrected.

Do not write “AI generated the project.” Record specific contributions. Do not claim a test, deployment, 0G request, request ID, model availability, privacy guarantee, or performance result because an AI suggested it; only real evidence can support those claims.

## Human-owned responsibilities

Humans must:

1. choose and approve product scope and prize strategy;
2. obtain and protect credentials;
3. implement or meaningfully direct and review implementation;
4. execute tests and inspect failures;
5. run real 0G calls and verify model/request-ID behavior;
6. review accessibility, privacy, and security behavior;
7. create and narrate the demo without AI/TTS voiceover; and
8. ensure the final submission accurately distinguishes planned, simulated, and verified behavior.
