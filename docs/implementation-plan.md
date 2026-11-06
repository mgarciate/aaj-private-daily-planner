# Aaj MVP implementation plan

> **For Hermes:** Use the `subagent-driven-development` skill to implement this plan task-by-task after a human approves implementation. This document does not authorize or claim implementation.

**Goal:** Deliver a tested, mobile-first PWA that turns a 30–60 second multilingual voice note into Aaj’s exact plan shape through real 0G inference, with authentic evidence handling and local-only history.

**Architecture:** A same-origin web app sends one bounded audio upload to a server route. A server-only 0G adapter transcribes with `whisper-large-v3`, calls a verified-available configured text model, validates the result, and returns a discriminated real/demo response. The browser persists only versioned structured plans and completion state.

**Proposed stack:** Next.js App Router, TypeScript, React, Zod, Vitest + Testing Library, Playwright, and browser storage. Exact package versions and the 0G client approach are selected only after the real API spike.

---

## Delivery rules

1. **Real 0G first.** Do not build the UI around an imagined API. The first technical gate is a redacted, reproducible live transcription call and observed evidence behavior.
2. **Test first.** For every behavior task: write one focused failing test, run it and record the expected failure, add the minimum implementation, run the focused test, then run the relevant suite.
3. **No fake evidence.** Fixtures are obviously synthetic. No test UUID, hash, or correlation ID can populate a provider `requestId` field.
4. **One vertical slice before polish.** Real upload → transcript → exact plan → evidence → result precedes installability, animation, streaks, or extra screens.
5. **Small commits.** Commit each independently passing task. Never combine the real-integration spike with unrelated UI work.
6. **Update the ledger.** Any material AI assistance must be appended to `docs/ai-assistance.md` with paths and human verification.
7. **Do not claim success from mocks.** Mocks prove application behavior; only a live call proves endpoint/model/evidence assumptions.

## Proposed future layout

```text
app/
  api/plan/route.ts
  history/page.tsx
  layout.tsx
  page.tsx
  manifest.ts
components/
  audio-capture.tsx
  demo-banner.tsx
  evidence-panel.tsx
  plan-result.tsx
  processing-status.tsx
lib/
  client/plan-api.ts
  domain/plan-schema.ts
  domain/plan-types.ts
  server/config.ts
  server/errors.ts
  server/logger.ts
  server/plan-orchestrator.ts
  server/zero-g-adapter.ts
  storage/plan-history.ts
public/
  icons/...
scripts/
  verify-zero-g.ts
tests/
  contract/zero-g-live.test.ts
  e2e/critical-flow.spec.ts
  fixtures/zero-g.ts
  integration/api-plan.test.ts
  unit/...
```

Paths remain planned until scaffold creation. If the selected framework version generates different required files, record the change in this plan or a new ADR before broad implementation.

## Phase 0 — Evidence-first feasibility

### Task 0.1: Create the minimal project and test harness

**Objective:** Establish only the runtime and test tools needed for the live 0G spike.

**Future files:**

- Create: `package.json`, lockfile, framework-generated TypeScript configuration
- Create: `vitest.config.ts`
- Create: `.env.example` with empty/non-secret names only
- Create: `tests/fixtures/zero-g.ts`
- Modify: `docs/ai-assistance.md` if AI assists

**TDD/verification steps:**

1. Generate the current stable Next.js scaffold in a temporary sibling directory, not in the non-empty repository:
   `pnpm create next-app@latest ../aaj-next-scaffold --ts --eslint --app --src-dir=false --import-alias='@/*'`
2. Copy only the generated application/configuration files into this repository. Preserve and review `README.md`, `docs/`, `.github/`, `LICENSE`, and Git history; inspect the diff before deleting the temporary scaffold.
3. Install test and script dependencies only after confirming versions:
   `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom tsx`
4. Add a smoke test that fails because no test setup exists.
5. Run `pnpm vitest run`; expect the named setup failure.
6. Add the minimum test configuration; rerun and expect PASS.
7. Run `pnpm lint && pnpm exec tsc --noEmit && pnpm vitest run`.
8. Commit: `chore: scaffold Aaj test harness`.

**Gate:** No product UI beyond framework scaffold; no credential in any file or command history.

### Task 0.2: Probe real 0G transcription

**Objective:** Prove the speech endpoint, authentication, request shape, supported fixture format, response shape, latency, and request-ID location with a real call.

**Future files:**

- Create: `scripts/verify-zero-g.ts`
- Create: `tests/fixtures/audio/short-multilingual.<verified-extension>` (human-recorded non-sensitive fixture)
- Create: `docs/integration-notes/zero-g-observation.md`
- Modify: `.gitignore` only if local credential artifacts require exclusion

**Steps:**

1. Read current 0G documentation/event instructions and obtain credentials outside Git.
2. Write a script that prints only: HTTP status, duration, transcript presence/length, model label, response header names safe to reveal, and candidate request-ID location/presence. Until sensitivity is assessed, print only a redacted preview or fingerprint—not the full candidate value. It MUST NOT print authorization, audio, or transcript content.
3. Run without `ZERO_G_API_KEY`; expect a deliberate configuration failure before network I/O.
4. Load the key from a protected local secret source outside the repository (for example, a `0600` shell environment file sourced without command tracing, or the deployment secret manager), then run:
   `pnpm tsx scripts/verify-zero-g.ts tests/fixtures/audio/short-multilingual.<ext>`
   Never paste the literal credential into the command line, shell history, terminal transcript, or issue.
5. Inspect the actual response. Record endpoint, fields, status, supported format, duration, and evidence location in `docs/integration-notes/zero-g-observation.md`; redact secrets and personal content.
6. Repeat once to establish that evidence is per-request rather than a constant.
7. Add a live opt-in contract test at `tests/contract/zero-g-live.test.ts`, skipped unless `RUN_0G_LIVE_TESTS=1`.
8. Run `RUN_0G_LIVE_TESTS=1 pnpm vitest run tests/contract/zero-g-live.test.ts`; expect PASS from a real call.
9. Run secret scan commands listed in the final gate.
10. Commit: `test: verify live 0G transcription contract`.

**Gate A — mandatory:** Stop if a real `whisper-large-v3` call cannot be completed. Do not replace it with a mock or demo response. Resolve credentials/API shape with 0G before continuing.

### Task 0.3: Select and prove the planner model

**Status:** Completed 2026-11-06. Live verification selected `0gm-1.0-35b-a3b` with JSON-object response mode, strict application validation, no automatic repair retry, and authentic planner evidence at `x_0g_trace.request_id`. See `docs/integration-notes/zero-g-planner-observation.md`.

**Objective:** Replace the configurable-default hypothesis with a verified model and structured-output strategy.

**Future files:**

- Modify: `scripts/verify-zero-g.ts`
- Modify: `tests/contract/zero-g-live.test.ts`
- Modify: `docs/integration-notes/zero-g-observation.md`
- Modify: `docs/spec.md`, `docs/hld.md`, `.env.example`

**Steps:**

1. Discover available text models using the supported 0G mechanism or test candidates documented by 0G. Do not assume `0gm-1.0` is available.
2. Add a failing live contract test requiring the exact Aaj plan schema from a fixed non-sensitive transcript.
3. Run the test against the candidate configured through `ZERO_G_PLANNER_MODEL`; expect the initial schema failure or document immediate pass.
4. Choose the minimum reliable prompt/response-format strategy and bounded retry policy.
5. Rerun the live contract multiple times with multilingual fixtures; require schema-valid output and observe evidence location.
6. Record the chosen model and limitations, then update docs from “TBD” to the observed result.
7. Run `RUN_0G_LIVE_TESTS=1 pnpm vitest run tests/contract/zero-g-live.test.ts`.
8. Commit: `test: verify 0G planner model contract`.

**Gate B — mandatory for the selected prize:** Both operations complete through 0G **and authentic request IDs are captured for both stages**. If either endpoint does not return a usable request ID, stop submission-readiness work and obtain sponsor clarification; honest `unavailable` behavior remains valid product behavior but does not satisfy the published prize requirement. No fabricated fallback is permitted.

## Phase 1 — Domain and server vertical

### Task 1.1: Define the exact plan schema

**Status:** Completed 2026-11-06. The dependency-free domain parser enforces exact fields and cardinality, final Unicode-code-point limits, normalized duplicate rejection, trimmed output, and stable `p1`–`p3` assignment.

**Objective:** Encode the cardinality and length rules before orchestration.

**Files:**

- Create: `lib/domain/plan-types.ts`
- Create: `lib/domain/plan-schema.ts`
- Create: `tests/unit/plan-schema.test.ts`

**Steps:**

1. Write failing tests for valid output plus missing, fourth, duplicate, empty, over-length, and extra-field cases.
2. Run `pnpm vitest run tests/unit/plan-schema.test.ts`; expect FAIL because schema modules do not exist.
3. Implement the minimum strict schema and stable `p1`–`p3` assignment.
4. Rerun focused tests; expect PASS.
5. Run typecheck and unit suite.
6. Commit: `feat: define strict daily plan schema`.

### Task 1.2: Implement typed evidence normalization

**Status:** Completed 2026-11-06. Production normalization accepts only the live-observed stage-specific locations, preserves provider values exactly, uses provider-trace-over-header precedence for transcription, and returns explicit unavailable states otherwise. ADR-0004 records the locked allowlist.

**Objective:** Normalize only observed provider evidence into available/unavailable states.

**Files:**

- Create: `lib/server/zero-g-adapter.ts`
- Create: `tests/unit/zero-g-evidence.test.ts`
- Create/modify: `tests/fixtures/zero-g.ts`

**Steps:**

1. Write failing tests for each observed allowlisted location, blank/missing IDs, unrelated UUID/correlation fields, and exact-value preservation.
2. Run the focused test; expect module-not-found failure.
3. Implement the smallest extractor based only on Task 0 observations.
4. Assert unknown fields never become evidence.
5. Run focused and live contract tests.
6. Commit: `feat: preserve authentic 0G request evidence`.

### Task 1.3: Implement server configuration and safe errors

**Objective:** Guarantee server-only credentials, explicit mode, and safe public errors.

**Future files:**

- Create: `lib/server/config.ts`
- Create: `lib/server/errors.ts`
- Create: `tests/unit/server-config.test.ts`
- Modify: `.env.example`

**Steps:**

1. Write failing tests for real config, missing key, explicit demo config, invalid model, and absence of silent demo fallback.
2. Run focused tests; expect FAIL.
3. Implement validated server-only configuration and error mapping.
4. Run tests and `pnpm exec tsc --noEmit`.
5. Commit: `feat: validate server inference configuration`.

### Task 1.4: Orchestrate transcription and planning

**Objective:** Produce a validated plan with stage-specific evidence and no persistence.

**Future files:**

- Create: `lib/server/plan-orchestrator.ts`
- Create: `tests/unit/plan-orchestrator.test.ts`
- Modify: `lib/server/zero-g-adapter.ts`

**Steps:**

1. Write failing tests for call order, transcript delimiting, exact success response, transcription failure, planning failure, malformed output, evidence absence, and retry evidence policy.
2. Run focused tests; expect FAIL.
3. Implement the minimum orchestration using dependency injection for the tested adapter. Every planner candidate MUST pass through `parsePlanCandidate` before orchestration can return success; the existing planner verifier's weaker contract check is observation tooling and MUST NOT be final orchestration validation.
4. Run focused, unit, and live opt-in contract suites.
5. Commit: `feat: orchestrate 0G voice planning`.

### Task 1.5: Expose the bounded plan API

**Objective:** Add the single same-origin multipart endpoint with server validation and no-store responses.

**Future files:**

- Create: `app/api/plan/route.ts`
- Create: `tests/integration/api-plan.test.ts`
- Create: `lib/server/logger.ts`

**Steps:**

1. Write failing integration tests for one valid file, missing/multiple/empty/oversize/unsupported files, method behavior, errors, no-store headers, no secret/body logs, and duplicate field policy.
2. Run `pnpm vitest run tests/integration/api-plan.test.ts`; expect FAIL.
3. Implement bounded parsing, validation, orchestration call, safe response mapping, and metadata-only logging.
4. Inspect captured logs for audio, transcript, plan, key, auth, and raw upstream bodies; require absence.
5. Run integration, unit, typecheck, and lint.
6. Commit: `feat: add secure plan API boundary`.

**Gate C:** A command-line multipart request against the local app completes a real two-stage run and returns exact schema with honest evidence. Capture a redacted response for internal review, not as a claimed production artifact.

## Phase 2 — Client vertical

### Task 2.1: Build the upload-first critical screen

**Objective:** Reach the real API through the simplest accessible input before microphone complexity.

**Future files:**

- Create: `lib/client/plan-api.ts`
- Create: `components/processing-status.tsx`
- Create: `components/plan-result.tsx`
- Modify: `app/page.tsx`
- Create: `tests/unit/plan-page.test.tsx`

**Steps:**

1. Write failing UI tests for file selection, validation, disabled duplicate submit, stage labels, exact result, evidence unavailable, and safe errors.
2. Run focused UI tests; expect FAIL.
3. Implement upload, state machine, API client, and result rendering.
4. Run focused tests and manually submit the verified fixture to a local real-mode server.
5. Commit: `feat: add upload-to-plan critical flow`.

### Task 2.2: Add microphone capture with fallback

**Objective:** Make recording primary without compromising upload compatibility.

**Future files:**

- Create: `components/audio-capture.tsx`
- Create: `tests/unit/audio-capture.test.tsx`
- Modify: `app/page.tsx`

**Steps:**

1. Write failing tests for unsupported API, denied permission, record/stop, timer, duration cutoff, discard, and upload persistence.
2. Run focused tests; expect FAIL.
3. Implement capability/codec detection and state transitions.
4. Test manually on current mobile Safari and Chromium; document actual supported MIME types.
5. Run unit suite and commit: `feat: capture short voice notes`.

### Task 2.3 (optional, after Gate C): Enforce honest demo rendering

**Objective:** If time permits, add simulation without allowing it to be confused with real inference. This task is not required for the 0G prize and may be cut in full.

**Future files:**

- Create: `components/demo-banner.tsx`
- Create: `components/evidence-panel.tsx`
- Create: `tests/unit/demo-integrity.test.tsx`
- Modify: `components/plan-result.tsx`, `app/page.tsx`

**Steps:**

1. Write failing tests for persistent banner across all states, null model labels, no request-ID labels, prohibited “verified” copy, and no adapter invocation in server demo tests.
2. Run focused tests; expect FAIL.
3. Implement the discriminated rendering and deterministic server demo provider.
4. Search rendered copy/tests for prohibited labels in demo fixtures.
5. Commit: `feat: make demo mode unmistakable`.

### Task 2.4: Add versioned local history

**Objective:** Persist plans and completion state by local date without transcript/audio.

**Future files:**

- Create: `lib/storage/plan-history.ts`
- Create: `tests/unit/plan-history.test.ts`
- Create: `app/history/page.tsx`
- Modify: `components/plan-result.tsx`

**Steps:**

1. Write failing tests for V1 round-trip, local date, completion, demo label, absent transcript/audio, corrupt JSON, unknown version, write failure, and erase confirmation.
2. Run focused tests; expect FAIL.
3. Implement V1 repository and basic history screen.
4. Inspect serialized test/local values to confirm excluded fields.
5. Run tests and commit: `feat: keep plan history in browser`.

**Gate D:** On a 360px viewport, a real voice/upload run produces a plan, authentic/unavailable evidence is correct, completion survives reload, and no transcript/audio appears in storage.

## Phase 3 — Accessibility, PWA, and release confidence

### Task 3.1: Close accessibility states

**Future files:**

- Modify: `app/page.tsx`, `components/*.tsx`, styles
- Create: `tests/e2e/accessibility.spec.ts`

**Steps:**

1. Write failing keyboard/focus/status tests for upload, recording fallback, errors, success, completion, history, and erase.
2. Run Playwright test; expect named failures.
3. Add names, focus management, live regions, non-color status text, target sizing, contrast, and reduced-motion behavior.
4. Run automated checks and a manual keyboard/screen-reader smoke test.
5. Commit: `fix: make critical flow accessible`.

### Task 3.2: Add minimal PWA metadata

**Future files:**

- Create: `app/manifest.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `app/layout.tsx`
- Create: `tests/e2e/pwa.spec.ts`

**Steps:**

1. Write failing tests for manifest, names, icons, theme, and install metadata.
2. Implement only the metadata required for installability. A service worker/offline inference is not required.
3. Run browser audit and tests.
4. Commit: `feat: add installable Aaj shell`.

### Task 3.3: Add end-to-end critical-flow coverage

**Future files:**

- Create: `playwright.config.ts`
- Create: `tests/e2e/critical-flow.spec.ts`
- Create: `tests/e2e/demo-flow.spec.ts`

**Steps:**

1. Write mock-boundary E2E tests for deterministic UI behavior and separate opt-in real-mode smoke instructions.
2. Cover mobile viewport upload, stage progression, exact result, evidence states, completion reload, history, corrupt storage, errors, and demo integrity.
3. Run `pnpm playwright test`; expect initial failures, then implement only fixes required by the spec.
4. Run the complete quality gate below.
5. Commit: `test: cover Aaj critical flows`.

### Task 3.4: Deploy and prove the real path

**Future files:**

- Modify: `README.md` with actual setup/run/test/deploy commands
- Modify: `docs/submission.md`, `docs/demo-script.md`, `docs/research.md` as observed facts require
- Create: `docs/integration-notes/deployment-verification.md`

**Steps:**

1. Select hosting that supports secret env vars, bounded multipart uploads, required timeouts, HTTPS, and outbound 0G access.
2. Configure `ZERO_G_API_KEY` and the verified planner model through hosting secrets, never Git.
3. Deploy and perform a real phone/browser run.
4. Record timestamp, commit SHA, live URL, observed models, response status, and authentic evidence presence in the verification note; do not record user content or secrets.
5. Verify raw audio and transcript are absent from application persistence/logs under the hosting configuration.
6. Add setup and run commands to README only after they work from a clean checkout.
7. Run a clean-checkout test against those instructions.
8. Commit: `docs: document verified deployment and setup`.

**Gate E — mandatory for submission:** Live URL works with a real 0G run, exact plan schema, **authentic per-stage request IDs**, secure configuration, and tested mobile fallback. If authentic IDs cannot be surfaced, the app may still be useful but is not submission-ready for the selected prize until the sponsor clarifies eligibility. Until this gate passes, submission fields stay TBD.

## Phase 4 — Demo and submission

### Task 4.1: Capture the demo evidence

1. Run the preflight in `docs/demo-script.md`.
2. Record a human-narrated 2:15–2:45 demo at ≥720p, under the sponsor’s three-minute ceiling and above ETHGlobal’s two-minute general minimum.
3. Show one real multilingual input, both stages, exact output, authentic IDs when available, persistence, and explicit demo/error behavior without exposing private content.
4. Do not speed the video, record it with a phone, or use TTS/AI voiceover.
5. Verify duration and playback independently.
6. Commit only updated documentation/links, never private raw recordings unless intentionally public.

### Task 4.2: Finalize submission without placeholders

1. Replace each `<TBD>` in `docs/submission.md` with verified data or remove the unsupported field.
2. Verify repository visibility, live link, video link/duration, setup from clean checkout, and contact data.
3. Check that selected prize is exactly one: 0G Private Computer Classic.
4. Review every sentence for “planned” versus “working.”
5. Update AI-assistance ledger.
6. Commit: `docs: finalize Aaj submission`.

## Complete quality gate

Run from a clean checkout using the package manager/commands actually established during implementation:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc --noEmit
pnpm vitest run
pnpm playwright test
RUN_0G_LIVE_TESTS=1 pnpm vitest run tests/contract/zero-g-live.test.ts
```

Then verify:

```bash
git grep -nE 'ZERO_G_API_KEY\s*=\s*[^[:space:]]+' -- ':!docs/implementation-plan.md'
git grep -nE '(sk-|Bearer )[A-Za-z0-9._-]{16,}'
git status --short
```

Expected: all quality commands pass; secret searches print nothing; status is clean. Also inspect the built client output for the actual secret value using a safe local script that receives the value from the environment without printing it.

## Backlog and GitHub milestones

The planning backlog is tracked as 17 open GitHub Issues under four milestones. Stable work IDs `AAJ-01` through `AAJ-17` map to GitHub Issues [#2](https://github.com/mgarciate/aaj-private-daily-planner/issues/2) through [#18](https://github.com/mgarciate/aaj-private-daily-planner/issues/18), respectively. Use `.github/ISSUE_TEMPLATE/` for follow-up work and preserve the stable IDs below for traceability.

### Milestone M0 — Real 0G proof

**Closure criteria:** Gates A and B pass; a real speech and planner call are reproducible; observed API/model/evidence behavior is documented; no secret is committed.

| ID | Proposed issue | Labels | Close when |
|---|---|---|---|
| AAJ-01 | Verify live 0G speech contract | `integration`, `critical` | Task 0.2 complete and opt-in live test passes |
| AAJ-02 | Verify and select 0G planner model | `integration`, `critical` | Task 0.3 complete; model and structured-output behavior documented |
| AAJ-03 | Lock evidence semantics to observed responses | `security`, `integration` | Allowlist tests pass and ADR-0004 remains satisfied |

### Milestone M1 — Tested server vertical

**Closure criteria:** Gate C passes locally with a real request; schema, adapter, orchestration, API validation, logging, and errors pass tests.

| ID | Proposed issue | Labels | Close when |
|---|---|---|---|
| AAJ-04 | Implement strict plan domain schema | `backend`, `test` | Task 1.1 acceptance tests pass |
| AAJ-05 | Normalize authentic 0G evidence | `backend`, `security`, `integration` | Task 1.2 tests pass against observed response locations |
| AAJ-06 | Validate server configuration and safe errors | `backend`, `security` | Task 1.3 tests pass; missing credentials never trigger simulation |
| AAJ-07 | Orchestrate transcription and planning | `backend`, `critical` | Task 1.4 tests and live contract checks pass |
| AAJ-08 | Expose the bounded plan API | `backend`, `security` | Task 1.5 tests pass; no-store and redaction verified |

### Milestone M2 — Mobile MVP

**Closure criteria:** Gate D passes at a 360px viewport; capture/upload, honest modes, exact result, and local continuity work.

| ID | Proposed issue | Labels | Close when |
|---|---|---|---|
| AAJ-09 | Deliver the upload-first critical flow | `frontend`, `critical` | Task 2.1 passes against the real API |
| AAJ-10 | Add microphone capture with upload fallback | `frontend` | Task 2.2 passes on target browsers |
| AAJ-11 | Optionally add honest demo mode | `frontend`, `security` | If selected, Task 2.3 and prohibited-copy tests pass; otherwise close as cut |
| AAJ-12 | Persist versioned local history | `frontend`, `storage` | Task 2.4 migration/corruption/privacy tests pass |

### Milestone M3 — Submission ready

**Closure criteria:** Gate E passes; accessibility/E2E suites pass; deployment, video, and submission links are verified; no TBD that implies completed work remains.

| ID | Proposed issue | Labels | Close when |
|---|---|---|---|
| AAJ-13 | Close accessibility states | `quality`, `accessibility` | Task 3.1 passes |
| AAJ-14 | Add minimal PWA metadata | `frontend`, `quality` | Task 3.2 passes or is explicitly cut |
| AAJ-15 | Cover the critical flow end to end | `quality`, `test` | Task 3.3 passes |
| AAJ-16 | Verify production deployment | `deployment`, `critical` | Task 3.4 evidence note and clean-checkout verification complete |
| AAJ-17 | Record demo and finalize submission | `docs`, `submission` | Tasks 4.1–4.2 complete and links independently opened |

## Stop conditions and cuts

If time is constrained, cut in this order: demo mode in full; animation; streak visualization; install polish; separate settings; audio preview/playback; transcript persistence (already excluded); editing/reordering. If demo mode ships, its explicit labeling and evidence restrictions are non-negotiable. Never cut real 0G calls, authentic per-stage request IDs required by the selected prize, input/output validation, upload fallback, secret isolation, or the deployed critical path.
