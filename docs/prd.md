# Aaj Product Requirements Document

## Product summary

Aaj (आज, “today” in Hindi) is a mobile-first progressive web app that turns a 30–60 second multilingual voice note into a deliberately small daily plan:

- exactly three priorities;
- one blocker;
- one first step; and
- one short encouragement.

The product is for people who know what is on their mind but do not want to organize it into a planning system before receiving help.

## Goals

1. Produce a useful, constrained plan from a short voice note in under one user flow.
2. Make real 0G inference and its returned request evidence visible in the core experience.
3. Give the user a reason to return tomorrow through date-keyed plans and completion state stored in the browser.
4. Keep the MVP achievable: one input, one transformation, one output, no account or collaboration.
5. Be honest about privacy, provider boundaries, failures, and simulation.

## Non-goals

- General-purpose chat, coaching, therapy, or medical advice.
- Calendar, task-manager, notification, wallet, blockchain, or collaboration integrations.
- Cloud sync, accounts, cross-device history, analytics profiles, or server-side plan storage.
- Editing, reordering, subtasks, long-term project management, or automatic task execution.
- Claiming cryptographic privacy, confidentiality, or verification beyond evidence actually returned by 0G.
- iAI login or user-funded compute in the MVP.
- Native iOS or Android applications.

## Personas

### The overloaded builder

A hackathon participant or knowledge worker with several competing obligations, limited time, and a tendency to postpone planning because entering and sorting tasks feels like more work.

### The multilingual thinker

A user who naturally switches languages while speaking and wants to capture thoughts without first translating or normalizing them.

### The privacy-conscious planner

A user who prefers no account and wants plan history to remain on the current device, while understanding that current audio and transcript must be sent to an inference provider for processing.

## Jobs to be done

- **When** my day feels scattered, **I want** to say everything once, **so I can** see the three things that matter now.
- **When** I am blocked, **I want** the obstacle and the smallest starting action separated from the task list, **so I can** begin.
- **When** I return later, **I want** today’s completion state to remain, **so I can** resume without an account.
- **When** inference is real or simulated, **I want** the distinction to be unmistakable, **so I can** trust the evidence shown.

## User stories

- As a user, I can record or upload a 30–60 second supported audio file.
- As a multilingual user, I can speak naturally without selecting a language first.
- As a user, I receive exactly three priorities, one blocker, one first step, and one short encouragement.
- As a user, I can inspect the transcript before relying on the plan.
- As a user, I can see whether a result came from real 0G inference or explicit demo data.
- As a judge, I can inspect authentic provider request IDs when 0G returns them.
- As a user, I can mark priorities complete and find the state after reload.
- As a user, I can revisit recent plans stored on this browser and erase all local Aaj data.
- As a user, I receive a clear, recoverable error when capture, validation, inference, or storage fails.

## Primary UX flow

1. **Arrive:** The home screen explains the output and processing boundary in plain language.
2. **Capture:** The user records audio or selects a file. A timer and recording state are visible.
3. **Review:** The user can discard/re-record or submit the capture.
4. **Process:** The UI shows distinct transcription and planning stages without pretending to know provider progress.
5. **Result:** The UI shows the fixed plan shape, transcript disclosure, mode, model labels, and available evidence.
6. **Act:** The user marks priorities complete.
7. **Return:** The current date opens by default; recent local plans are available by date.
8. **Erase:** The user can clear local plans and completion state after confirmation.

### Alternate and failure flows

- If microphone access is unavailable, file upload remains available.
- If input validation fails, no inference request is sent and the corrective action is specific.
- If transcription succeeds but planning fails, the UI reports a failed run; it does not persist a completed plan.
- If the provider returns no request ID, the result may be real but evidence is marked unavailable—not fabricated.
- If explicit demo mode is enabled, the UI remains persistently labeled and never uses real-inference language.

## Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Capture microphone audio with visible recording and elapsed-time states. | Must |
| FR-02 | Accept a documented set of audio upload types and enforce byte and duration limits. | Must |
| FR-03 | Send audio to a server boundary; never expose `ZERO_G_API_KEY` to browser code or responses. | Must |
| FR-04 | Use 0G `whisper-large-v3` for transcription in real mode. | Must |
| FR-05 | Use a server-configured 0G text model for plan generation; the default model remains a hypothesis until verified against available models. | Must |
| FR-06 | Validate model output into the exact plan cardinality and bounded text fields. | Must |
| FR-07 | Surface only request IDs actually received from 0G, separately for transcription and planning. | Must |
| FR-08 | Persist structured plans and completion state locally by calendar date. | Must |
| FR-09 | Provide transcript disclosure, retry, re-record, history, and erase-all controls. | Must |
| FR-10 | If time permits after the real critical path, implement explicit demo mode with persistent labeling and non-provider evidence semantics. | Could |
| FR-11 | Support installability as a PWA after the real inference flow is proven. | Should |
| FR-12 | Show a lightweight locally derived streak only if it does not threaten the critical path. | Could |

## Non-functional requirements

### Performance

- Immediate visual response to record, stop, submit, completion toggle, and retry actions.
- Input and local operations remain usable on a mobile viewport and mid-range phone.
- No fixed promise for provider latency until measured; the interface must tolerate a long request and allow safe retry.

### Reliability

- A run has one terminal state: success, validation error, provider error, or network error.
- Duplicate submissions are prevented while a run is active.
- A malformed provider response never becomes a stored plan.
- Local-storage migration or corruption fails safely without deleting readable data silently.

### Security and privacy

- Secrets stay server-only and are redacted from logs and errors.
- Aaj does not intentionally persist raw audio or transcript on its server.
- The browser stores only the structured plan, completion state, safe evidence metadata, and optionally the transcript when the product copy explicitly says so; MVP default is not to persist the transcript.
- User input is treated as untrusted data, not instructions that can alter the required schema.
- Uploads are constrained before provider calls.

### Accessibility

- Core flow is keyboard operable and screen-reader labeled.
- Status changes use an appropriate live region without excessive announcements.
- Color is never the only real/demo, success/error, or completion indicator.
- Focus is moved or announced predictably after recording, errors, and plan creation.
- Touch targets and contrast meet WCAG 2.2 AA intent.

### Compatibility

- Current mobile Safari and Chromium are primary targets.
- File upload is the fallback wherever `MediaRecorder` or a usable codec is unavailable.

## Success metrics

These are launch hypotheses, not measured results:

- **Activation:** share of started captures that produce a valid plan.
- **Time to value:** median time from capture start to visible plan.
- **Plan usefulness:** user can identify an actionable first step without editing.
- **Reliability:** valid-plan rate among provider-success responses.
- **Return:** share of local browsers that create plans on at least two dates.
- **Evidence completeness:** share of real successful runs for which each provider call returns an authentic request ID.
- **Demo integrity:** zero cases where simulated output is labeled or described as verified inference.

No numeric targets will be claimed until there is an instrumented or manually recorded baseline. The MVP avoids third-party analytics; demo measurements may be recorded manually.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 0G speech request format or model availability differs from assumptions | Critical path blocked | Make the first implementation gate a real minimal transcription request; isolate the adapter. |
| Planner model availability is unknown | Plan call blocked | Configure the model server-side; verify an available text model before selecting a default. |
| Request ID location or presence differs by endpoint | Prize evidence incomplete | Capture documented response fields/headers; expose absence honestly; never synthesize IDs. |
| Model returns prose or invalid JSON | Invalid plan | Strict schema, constrained prompt/response format where supported, bounded retry, typed failure. |
| Browser codec incompatibility | Capture blocked | Capability detection and file-upload fallback. |
| Audio or secret appears in logs | Privacy/security harm | Metadata-only logging, redaction tests, server-only import boundary. |
| Local data is lost or corrupted | User loses history | Version records, validate on read, explicit migration, export deferred unless time permits. |
| “Private” wording overstates guarantees | Misleading product | Describe Aaj retention behavior and provider processing separately; avoid unsupported cryptographic claims. |
| Scope expansion | Incomplete demo | Enforce gates and non-goals; cut streak/install polish before core behavior. |

## MVP acceptance criteria

The MVP is acceptable only when all are true:

1. On a supported mobile browser, a user can record or upload valid audio and receive the exact plan shape.
2. A real end-to-end run uses 0G transcription and a verified-available, configured 0G text model.
3. Any displayed provider request ID is byte-for-byte data received from the provider; absence is shown as unavailable.
4. `ZERO_G_API_KEY` is absent from client bundles, browser network responses, repository history, and logs.
5. Aaj retains no raw audio and no server-side plan history by design; local structured history survives reload.
6. Completion toggles survive reload and remain associated with the correct local date.
7. If demo mode ships, it is opt-in, persistent in the UI, structurally marked `demo`, and cannot display verified/provider-request evidence; demo mode may be cut entirely without blocking MVP acceptance.
8. Invalid files, denied microphone access, malformed provider output, timeout/network failure, and corrupt local data have tested states.
9. The critical flow is keyboard accessible and usable at a narrow mobile viewport.
10. A live deployment, public repository, setup instructions, real evidence capture, and under-three-minute video are added only after they exist and are verified.
