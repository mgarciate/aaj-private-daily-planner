# AI assistance ledger

Aaj uses AI as an assistant, not as the accountable author or verifier. Human contributors remain responsible for product choices, implementation, security, testing, claims, and submission.

## Ledger

| Date | Tool | Assistance | Affected paths | Human responsibility and verification |
|---|---|---|---|---|
| 2026-11-06 | Hermes Agent (Nous Research), configured model | Synthesized supplied research; drafted product, architecture, specification, delivery, demo, submission, ADR, and overview documents | `README.md`, `docs/**` | Review scope and wording; compare event facts with primary pages; approve architecture; verify every implementation-time claim through real execution |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Generated and selectively integrated the Next.js scaffold; added the Vitest, Testing Library, jest-dom, jsdom, and tsx harness; authored the smoke test, empty environment template, fixture placeholder, and configuration updates | `.gitignore`, `.env.example`, `app/**`, `public/**`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `tests/**`, `docs/ai-assistance.md` | Review the generated scaffold and dependency choices; inspect the diff for scope and secrets; independently rerun lint, type checking, and tests; reject any product behavior beyond the framework scaffold |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Reviewed Task 0.1 for specification compliance and code quality; pinned the supported Node runtime, made the default test command deterministic, corrected scaffold metadata and status documentation, and removed unused generated assets | `.nvmrc`, `package.json`, `app/layout.tsx`, `public/**`, `README.md`, `docs/ai-assistance.md` | Independently rerun install, lint, type checking, tests, and production build; confirm the repository still contains no product behavior or secrets |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Prepared safe TDD tooling for the live 0G transcription contract, including configuration failure tests, metadata redaction, an opt-in live test, and an explicitly blocked observation note | `.env.example`, `lib/server/zero-g-transcription-verifier.ts`, `scripts/verify-zero-g.ts`, `tests/unit/zero-g-transcription-verifier.test.ts`, `tests/contract/zero-g-live.test.ts`, `docs/integration-notes/zero-g-observation.md`, `docs/ai-assistance.md` | Verify no live claim is made without a 0G key and non-sensitive human fixture; review redaction; run unit quality gates now and the opt-in live test only when credentials are available |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Implemented and live-tested strict 0G planner verification with a fixed non-sensitive multilingual transcript, JSON-object mode, safe evidence fingerprinting, exact-schema rejection tests, and model/default documentation updates | `.env.example`, `lib/server/zero-g-planner-verifier.ts`, `scripts/verify-zero-g-planner.ts`, `tests/unit/zero-g-planner-verifier.test.ts`, `tests/contract/zero-g-live.test.ts`, `docs/integration-notes/zero-g-planner-observation.md`, `docs/integration-notes/zero-g-observation.md`, `docs/{ai-assistance,demo-script,hld,implementation-plan,prd,research,spec,submission}.md` | Review the fixed prompt, strict schema, redaction boundary, selected model, and claims; independently rerun quality gates and the credentialed live contract; do not treat the limited live sample as a general quality or privacy guarantee |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Implemented typed authentic-evidence normalization from the live-observed 0G response locations, added allowlist/precedence/exact-value tests, reused normalization in planner verification, and locked the policy in ADR-0004 | `lib/server/{zero-g-adapter,zero-g-planner-verifier}.ts`, `tests/fixtures/zero-g.ts`, `tests/unit/zero-g-evidence.test.ts`, `docs/adr/0004-no-fake-evidence.md`, `docs/{implementation-plan,ai-assistance}.md` | Review the closed allowlist and body-over-header precedence; independently rerun focused and full quality gates; confirm future provider changes are observed live before expanding production evidence locations |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Implemented the strict daily-plan domain parser with exact-field/cardinality validation, Unicode-code-point limits, normalized duplicate rejection, trimmed output, and stable priority IDs | `lib/domain/{plan-types,plan-schema}.ts`, `tests/unit/plan-schema.test.ts`, `docs/{implementation-plan,spec,ai-assistance}.md` | Review normalization and final limits; independently rerun focused and full quality gates; reject any future orchestration path that bypasses the domain parser |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Corrected direction-aware emoji ZWJ qualification and allowlisted only the three exact currently recognized RGI subdivision-flag tag sequences in normalized visibility and duplicate keys | `lib/domain/plan-schema.ts`, `tests/unit/plan-schema.test.ts`, `docs/{spec,ai-assistance}.md` | Review the bounded Unicode scans and exact subdivision allowlist; independently rerun focused and full quality gates; keep malformed or unattached default-ignorable characters from bypassing validation |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Implemented fail-closed server inference configuration with explicit demo mode and a non-serializing credential holder; added exhaustive stable public error mappings and redaction tests | `.env.example`, `lib/server/{config,errors}.ts`, `tests/unit/server-config.test.ts`, `docs/{implementation-plan,hld,ai-assistance}.md` | Review the mode/model contract, secret boundary, retry semantics, and user-facing messages; independently rerun focused and full quality gates and inspect the diff/secret scans |
| 2026-11-06 | Hermes Agent (Nous Research), GPT-5.6 | Hardened issue 7 security boundaries with the production `server-only` marker, a test-only marker stub, neutral model constants, non-reflectable secret storage, immutable allowlisted errors and response graphs, and cryptographically generated Aaj correlation IDs | `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `lib/{inference-models,server/config,server/errors,server/zero-g-transcription-verifier}.ts`, `tests/{stubs/server-only,unit/server-boundary,unit/server-config,unit/zero-g-transcription-verifier}.ts`, `docs/ai-assistance.md` | Review the server/client import boundary and runtime guards; independently rerun focused/full tests, lint, type checking, production build, and diff checks; keep the test alias out of production configuration |

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
