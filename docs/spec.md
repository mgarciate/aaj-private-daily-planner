# Aaj MVP specification

Normative terms **MUST**, **MUST NOT**, **SHOULD**, and **MAY** define testable MVP behavior. This document specifies intended behavior; it does not claim the behavior is implemented.

## 1. Product invariant

For one accepted voice input, Aaj MUST produce one result containing:

- exactly three ordered priorities;
- exactly one blocker statement;
- exactly one first-step statement; and
- exactly one short encouragement.

A transcript alone, free-form chat response, more or fewer priorities, or an unvalidated partial plan is not a successful result.

## 2. Modes

Real mode is required. Demo mode is an optional post-critical-path profile. If demo mode is implemented, the API and UI MUST use the discriminated mode `real` or `demo` and every rule in §2.2 applies; if it is cut, demo-only schema, UI, storage, and tests MAY be omitted.

### 2.1 Real mode

- Real mode MUST make the planned live 0G calls.
- Real mode MUST use `whisper-large-v3` for transcription unless a later ADR changes this requirement.
- Real mode MUST use a server-configured 0G text model whose availability was verified by a real preflight or request.
- Real mode MUST NOT be declared successful when either required inference stage is simulated.
- Real mode MUST report evidence separately for each stage.

### 2.2 Demo mode

- Demo mode MUST be enabled by an explicit server configuration; a missing/invalid credential MUST produce a configuration error and MUST NOT silently select demo mode.
- A persistent banner MUST say, in substance, **“Demo mode — no 0G inference occurred.”**
- Mode labeling MUST be visible before submission, during the simulated processing state, on the result, and in stored demo history.
- Demo responses MUST use `mode: "demo"`.
- Demo responses MUST use `null` model values and `unavailable` provider evidence.
- A sample-run ID MAY exist for UI/test correlation and MUST start with `demo_`; it MUST NOT occupy a `requestId` field or be labeled “request ID,” “0G request,” “trace,” “verified,” or equivalent.
- Demo text MUST be clearly sample content and deterministic for tests.
- Demo mode MUST NOT emit network traffic to 0G.

## 3. Capture behavior

### 3.1 Recording

The UI MUST expose idle, permission-requested, recording, stopped/review, and error states.

- Recording MUST show an elapsed timer and a stop control.
- The browser SHOULD stop at the configured maximum duration.
- The user MUST be able to discard and record again before submission.
- When recording is unsupported or permission is denied, upload MUST remain reachable.
- The UI MUST NOT claim that microphone permission is denied until the browser reports it.

### 3.2 Upload

The implementation MUST define its accepted MIME types, extensions, maximum bytes, and maximum duration in one shared policy with server authority. Initial proposed policy:

- duration: at least 1 second and no more than 60 seconds;
- size: no more than 10 MiB;
- formats: browser-recorded WebM/Opus plus MP3, M4A/MP4 audio, and WAV where the verified provider endpoint accepts them.

These formats are hypotheses until the real 0G speech call confirms support. Unsupported types MUST be rejected before inference. Client checks improve feedback but MUST NOT replace server validation.

Exactly one audio file is accepted. Empty files, multiple files, renamed non-audio content where detectable, over-limit files, and invalid duration MUST produce specific non-retryable validation errors.

## 4. Processing states

The client MUST implement this state machine:

```text
idle
  -> recording -> review
  -> submitting -> transcribing -> planning -> success
  -> validation_error | provider_error | network_error
success -> idle (new plan) | success (completion update)
error -> review (retry/re-record) | idle
```

Stage labels indicate Aaj orchestration, not live provider progress. The client MUST prevent duplicate submit actions while a request is active. A retry MUST be treated as a new provider run and MUST NOT reuse prior provider request evidence.

## 5. Plan-generation semantics

The planning instruction MUST:

- treat transcript content as untrusted source data;
- preserve useful meaning across languages without requiring user language selection;
- prefer concrete, achievable priorities for today;
- avoid inventing appointments, deadlines, people, or commitments;
- return the normative schema only;
- identify a blocker from the transcript or use a neutral “No clear blocker identified” equivalent;
- make `firstStep` one small physical or digital action;
- keep encouragement brief and avoid medical, therapeutic, or guaranteed-outcome claims.

Aaj MUST NOT execute instructions embedded in the transcript, call tools from transcript text, or allow transcript text to override the output schema.

## 6. API schema

### 6.1 Request

`POST /api/plan` with `multipart/form-data`:

| Field | Cardinality | Meaning |
|---|---:|---|
| `audio` | exactly 1 | Accepted bounded audio file |

All other fields MUST be rejected or ignored according to a documented strict policy. In particular, the client MUST NOT select the provider model, API key, mode, system prompt, or evidence values.

### 6.2 Success response

Conceptual TypeScript shape (documentation only):

```ts
type Evidence =
  | { status: "available"; requestId: string }
  | { status: "unavailable" };

type Plan = {
  priorities: [
    { id: "p1"; text: string },
    { id: "p2"; text: string },
    { id: "p3"; text: string }
  ];
  blocker: string;
  firstStep: string;
  encouragement: string;
};

type RealSuccess = {
  schemaVersion: 1;
  mode: "real";
  transcript: string;
  plan: Plan;
  inference: {
    transcription: { model: "whisper-large-v3"; evidence: Evidence };
    planning: { model: string; evidence: Evidence };
  };
};

type DemoSuccess = {
  schemaVersion: 1;
  mode: "demo";
  sampleRunId: `demo_${string}`;
  transcript: string;
  plan: Plan;
  inference: {
    transcription: { model: null; evidence: { status: "unavailable" } };
    planning: { model: null; evidence: { status: "unavailable" } };
  };
};
```

Responses MUST set `Content-Type: application/json` and `Cache-Control: no-store`. They MUST NOT include secrets, upstream authorization data, raw upstream error bodies, server stack traces, provider-response headers wholesale, or internal prompts.

### 6.3 Error response

```ts
type ErrorResponse = {
  error: {
    code:
      | "INVALID_AUDIO"
      | "AUDIO_TOO_LARGE"
      | "AUDIO_TOO_LONG"
      | "CONFIGURATION_ERROR"
      | "TRANSCRIPTION_FAILED"
      | "PLANNING_FAILED"
      | "INVALID_MODEL_OUTPUT"
      | "UPSTREAM_TIMEOUT"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
    retryable: boolean;
    correlationId: string;
  };
};
```

HTTP mapping proposal:

- `400`: invalid audio/duration/type;
- `413`: byte limit exceeded;
- `429`: local or upstream rate limit;
- `500`: configuration/internal error;
- `502`: transcription/planning/invalid upstream output;
- `504`: upstream timeout.

Provider details MUST be translated into safe messages. `correlationId` is Aaj operational metadata and MUST NOT be displayed under provider evidence.

## 7. Validation rules

Server validation is authoritative.

| Field | Rule |
|---|---|
| `transcript` | Trimmed, non-empty, bounded to a documented maximum before planning |
| `priorities` | Array length exactly 3; no duplicate normalized text |
| priority `id` | Reassigned by Aaj to exactly `p1`, `p2`, `p3`; never treated as provider evidence |
| priority `text` | Trimmed, non-empty, single actionable item, proposed 1–160 Unicode characters |
| `blocker` | Trimmed, non-empty, proposed 1–200 characters |
| `firstStep` | Trimmed, non-empty, one action, proposed 1–160 characters |
| `encouragement` | Trimmed, non-empty, one short sentence, proposed 1–140 characters |
| request ID | Non-empty string from an allowlisted observed provider field/header; maximum length set after observation |

The validator MUST reject additional priorities, missing fields, wrong types, empty strings, and text beyond final limits. It MUST NOT silently drop a fourth priority, combine priorities, or substitute invented content.

If a bounded repair/retry is implemented, it MUST create a new planning inference operation with its own evidence semantics. The response MUST expose evidence sufficient to avoid implying the first ID proves the repaired output. The simpler MVP MAY return `INVALID_MODEL_OUTPUT` instead.

## 8. Evidence semantics

### 8.1 Definitions

- **Provider request ID:** an identifier actually returned by 0G for one provider operation.
- **Aaj correlation ID:** an internal identifier for one API request, used for diagnostics only.
- **Sample-run ID:** a demo-only local identifier, used only to distinguish deterministic sample runs.
- **Evidence available:** an allowlisted provider response location contained a non-empty identifier.
- **Evidence unavailable:** the operation may have run, but no authentic request ID was returned or safely captured.

### 8.2 Normative rules

1. Aaj MUST preserve provider request-ID values exactly; it MUST NOT create, hash, prefix, normalize, or “repair” them.
2. Aaj MUST NOT substitute correlation IDs, UUIDs, timestamps, hashes, database IDs, sample IDs, model outputs, or cached IDs.
3. Transcription and planning evidence MUST remain associated with their respective operation.
4. The UI MAY say “0G request ID” only for `status: available` in `real` mode.
5. The UI MUST say “Request ID unavailable” or equivalent for unavailable evidence.
6. The UI MUST NOT use “verified run” as a blanket success label unless current 0G documentation and the returned evidence support that exact claim. Safer default copy is “Real 0G inference” plus per-stage evidence status.
7. Tests MUST include missing, blank, malformed, duplicate, and demo evidence cases.
8. Fixtures MUST use obviously synthetic values and MUST be marked fixtures; documentation MUST not present them as runs that happened.

## 9. Result and history UI

A successful result MUST show:

- three distinguishable priority controls in order;
- blocker, first step, and encouragement;
- completion state for priorities;
- real/demo mode;
- configured model labels in real mode;
- per-stage evidence status;
- transcript behind an explicit disclosure for the current result;
- an option to create another plan.

Priority completion MUST be operable without drag gestures. Completion MUST not rewrite plan text. Demo history MUST retain its demo label. Real and demo plans MAY coexist locally but MUST remain distinguishable.

The MVP MUST NOT claim cloud sync, encrypted storage, account recovery, or cross-device availability.

## 10. Local storage

Use one namespaced key, proposed `aaj.planHistory`, containing a versioned envelope.

### 10.1 Version 1

```ts
type StoredEnvelopeV1 = {
  schemaVersion: 1;
  updatedAt: string;
  plansByDate: Record<string, {
    createdAt: string;
    mode: "real" | "demo";
    plan: Plan;
    completedPriorityIds: Array<"p1" | "p2" | "p3">;
    inference: RealSuccess["inference"] | DemoSuccess["inference"];
  }>;
};
```

- Date keys MUST be valid browser-local `YYYY-MM-DD` dates.
- `createdAt`/`updatedAt` MUST be valid ISO-8601 timestamps.
- Transcript and raw audio MUST NOT be stored in version 1.
- Completion IDs MUST be unique and refer to present priorities.
- Reads MUST validate the full envelope before use.
- Writes SHOULD be copy-then-serialize and MUST avoid leaving partially mutated in-memory state on failure.
- Unknown future versions MUST NOT be overwritten automatically.
- Known migrations MUST be pure, tested, sequential functions and MUST preserve user-visible plan content.
- Corrupt data MUST cause a recovery state, not an application crash or silent erase.
- Erase-all MUST require confirmation and remove the namespace.

## 11. Privacy and security behavior

- `ZERO_G_API_KEY` MUST exist only in server configuration and server-only modules.
- Client code, HTML, source maps, API responses, logs, errors, and repository files MUST NOT contain the key.
- Aaj server code MUST NOT intentionally persist audio, transcript, or plan content.
- Logging MUST be metadata-only and redact upstream authorization and bodies.
- UI copy MUST state that current audio/transcript is sent to 0G for processing in real mode.
- UI copy MUST distinguish Aaj non-retention from any 0G provider retention/privacy property; unverified provider guarantees MUST NOT be claimed.
- Generated/model text MUST be rendered as text, never unsanitized HTML.
- The endpoint SHOULD enforce same-origin requests and abuse controls before public deployment.

## 12. Accessibility

- Every control MUST have a programmatic name and visible focus state.
- Recording state and elapsed time MUST not rely only on color or animation.
- Processing and errors MUST be announced through restrained live regions.
- On validation failure, focus MUST move to or be associated with the error summary; the capture remains recoverable.
- On success, the plan heading MUST receive programmatic focus or be announced.
- Priority completion controls MUST expose checked state and remain at least 44×44 CSS pixels where practical.
- Keyboard-only users MUST complete capture via upload, submit, inspect result, toggle completion, navigate history, and erase data.
- Text and status indicators MUST meet WCAG AA contrast targets.
- Motion MUST respect `prefers-reduced-motion`.

## 13. Testable acceptance criteria

### Real critical path

- Given valid supported audio and real configuration, when the user submits, then the server performs transcription before planning and returns a schema-valid exact plan.
- Given a verified-available planner model, the response identifies that actual configured model rather than a hard-coded unsupported default.
- Given provider IDs in observed allowlisted locations, the UI displays the exact values under the correct stages.
- Given no provider ID for a successful stage, the UI displays unavailable and no replacement identifier.

### Demo integrity (conditional)

These criteria apply only if optional demo mode ships:

- Given demo configuration, no 0G network adapter method is invoked.
- Every capture, processing, result, and history view visibly states demo mode.
- Demo responses contain no provider `requestId` key and no non-null model label.
- Automated copy assertions reject “verified 0G run” and “0G request ID” in demo rendering.

Whether demo mode ships or not, missing real credentials without explicit demo configuration returns `CONFIGURATION_ERROR`.

### Validation and failure

- Invalid type, zero-byte, over-size, over-duration, empty transcript, malformed plan, timeout, rate limit, and upstream error each produce the specified state and persist no plan.
- A fourth priority is rejected, not truncated.
- A second submit while active does not create a second request.
- A retry does not reuse evidence from the failed attempt.

### Local continuity

- A successful plan stored on date D is restored after reload on D.
- Priority completion toggles persist and do not affect other dates.
- Transcript and audio are absent from serialized storage.
- Demo labels survive storage/reload.
- Unknown schema versions and corrupt JSON produce a recovery state without silent overwrite.
- Erase-all removes all Aaj records after confirmation.

### Security and privacy

- Static/client bundle and browser responses contain no `ZERO_G_API_KEY` value.
- Log capture for success and each failure contains no audio bytes, transcript, plan text, auth header, or raw upstream body.
- Model output containing HTML/script text renders inertly.
- Response headers prohibit caching.

### Accessibility and viewport

- Keyboard-only critical flow passes on the supported desktop browser using upload fallback.
- Screen-reader labels/state are present for recording and completion controls.
- No horizontal overflow or blocked primary action occurs at a 360 CSS-pixel viewport.
- Status meaning remains understandable with color removed and reduced motion enabled.

## 14. Deferred decisions

The following MUST be resolved from real integration evidence, not guessed:

- exact 0G base URL, SDK/version, speech endpoint, multipart field names, and response fields;
- event credential provisioning and supported audio formats;
- planner model default and structured-output capability;
- request-ID source locations and sensitivity;
- timeout and retry budgets based on measured latency;
- provider privacy/retention wording;
- hosting runtime and public rate-limit strategy.
