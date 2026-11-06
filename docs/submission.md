# Aaj submission draft

> Replace each `<TBD>` only with verified facts. Remove unsupported fields rather than guessing. This draft does not claim that Aaj is implemented, tested, deployed, or submitted.

## Project

**Name:** Aaj

**Meaning:** “Today” in Hindi

**Tagline:** Speak your day. Leave with a plan.
**Prize selection:** 0G — Build with 0G Private Computer (Classic), and no other partner prize

## Short description

Aaj is a mobile-first voice planner designed to turn a 30–60 second multilingual brain dump into exactly three priorities, one blocker, one first step, and one short encouragement. The planned real path uses 0G for speech transcription and structured planning, surfaces authentic per-stage request IDs when returned, and keeps structured plan history and completion state in the user’s browser.

> At submission, change “designed/planned” to present tense only for behavior verified in the deployed build.

## Problem

Planning tools often ask overloaded people to organize their thoughts before the tool can help. Voice lowers capture friction, especially when people switch languages. The useful outcome is not a transcript or a chat session; it is a small daily plan with an immediate action.

## Intended flow

1. Record or upload a short voice note.
2. A server-only route sends the bounded audio to 0G `whisper-large-v3`.
3. The transcript goes to a server-configured 0G text model verified to be available: `<TBD after live contract test>`.
4. Strict validation accepts only three priorities, one blocker, one first step, and one encouragement.
5. The browser stores the structured plan and completion state; Aaj does not retain raw audio or server-side history.
6. The evidence panel shows each real 0G request ID exactly as returned, or clearly says unavailable.

## Why 0G is load-bearing

In this submission, removing 0G removes Aaj’s core transformation: speech transcription and structured daily planning, plus the authentic request evidence judges can inspect. 0G is in the primary path, not an optional analysis button.

The architecture is **technically replaceable by design**: the provider sits behind a small server adapter so the product is not permanently locked to one API. That does not make 0G decorative. The submitted and demonstrated implementation must be built, tested, and evidenced against real 0G calls; another provider would require a different adapter, validation, privacy review, and evidence contract.

## Why users return

Aaj opens on today, preserves completion state and recent structured plans locally, and lets the user create a new plan the next day without an account. This claim must be reduced if history does not ship.

## 0G qualification checklist

| Requirement | Submission evidence |
|---|---|
| Consumer app where AI is the product | `<TBD live flow evidence>` |
| 0G inference in primary flow | `<TBD verified speech and planning model/call evidence>` |
| Request IDs | `<TBD actual evidence-panel behavior; never paste secrets or fabricated IDs>` |
| Judge-tryable app | `<TBD live HTTPS URL>` |
| Reason to return | `<TBD verified local-history/completion behavior>` |
| What breaks without 0G | Core transcript, plan, and 0G evidence path described above |
| Public repository and setup | `<TBD public GitHub URL and clean-checkout verification>` |
| Video under 3 minutes | `<TBD video URL>` — duration `<TBD; must be 2:00–2:59>` |
| Live demo link | `<TBD>` |
| Contracts | None planned for MVP |
| Team/contact | `<TBD names>` · Telegram `<TBD>` · X `<TBD>` |

## Technical architecture

Planned architecture:

- mobile-first Next.js/TypeScript PWA;
- browser `MediaRecorder` with upload fallback;
- same-origin `POST /api/plan` server boundary;
- server-only `ZERO_G_API_KEY`;
- 0G `whisper-large-v3` plus `ZERO_G_PLANNER_MODEL=<verified model>`;
- strict schema validation and typed safe errors;
- versioned browser storage with no database or account; and
- unit, integration, browser, and opt-in live 0G contract tests.

Replace this list with the actual final stack and versions before submission.

## Privacy and security

Aaj is designed so the provider credential remains server-only. The Aaj server should process audio/transcript transiently without intentionally logging or persisting content, and the browser should persist only the structured plan, completion state, and safe inference metadata. The UI must disclose that real-mode audio/transcript is sent to 0G for processing.

Do not claim end-to-end encryption, zero provider retention, cryptographic verification, or “audio never leaves the device” unless separate evidence supports it. Final copy: `<TBD after implementation, hosting-log review, and current 0G policy review>`.

## Demo-mode disclosure

If demo mode ships, it is explicitly configured and persistently labeled **Demo mode — no 0G inference occurred**. It contains no provider request IDs or real model label. Missing credentials do not silently trigger it. If demo mode does not ship, remove this section.

## Original work and reused components

Aaj is planned as a Classic/from-scratch project begun during ETHGlobal Mumbai 2026. Public frameworks and libraries will be listed with their licenses/roles. All Aaj-specific implementation, tests, design, assets, and documentation must be traceable in progressive history. Final reused/new inventory: `<TBD>`.

## AI assistance

Hermes Agent assisted with supplied-research synthesis and the planning artifacts in `README.md` and `docs/**`. Human contributors chose the scope, review and correct the artifacts, implement or direct the build, run tests, verify live 0G behavior, secure credentials, create the human-narrated demo, and remain responsible for every claim. Implementation-time assistance must be appended to [`docs/ai-assistance.md`](ai-assistance.md) with affected paths and human verification.

## Feedback for 0G

### What worked

`<TBD after real integration; cite actual setup, API compatibility, model, latency, and evidence behavior>`

### What was difficult

`<TBD after real integration; include reproducible specifics, not invented feedback>`

### What we would add

`<TBD based on observed integration>`

## Links

- Public repository: `<TBD>`
- Live app: `<TBD>`
- Demo video and duration: `<TBD>`
- Architecture: [`hld.md`](hld.md)
- Product specification: [`spec.md`](spec.md)
- Contracts: none planned

## Submission-owner final check

- [ ] Exactly one partner prize selected.
- [ ] Every present-tense capability works on the linked deployment.
- [ ] Clean checkout follows README successfully.
- [ ] Real 0G request IDs are shown only if actually returned.
- [ ] Video is 2:00–2:59, ≥720p, human narrated, and not sped up.
- [ ] Public repo contains progressive history and AI-assistance disclosure.
- [ ] No credential, private audio, transcript, or identifying plan is public.
- [ ] Every `<TBD>` is replaced or its unsupported section removed.
