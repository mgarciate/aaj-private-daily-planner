# Research and decision basis

**Research cut:** 2026-11-06
**Scope:** Event constraints come from the supplied Mumbai research and its primary ETHGlobal URLs. Winner observations come only from the supplied verified-winners file. Facts and inferences are separated below.

## Verified event facts

- ETHGlobal Mumbai submissions close on **7 November 2026 at 09:00 IST**; late submissions are not accepted.[1]
- Classic/from-scratch entries must begin project-specific code, designs, and assets after the event starts. Public libraries and starter kits are allowed with transparency.[1]
- Progressive version-control history matters; a missing history or large single commit may disqualify a submission.[1]
- AI assistance is allowed with attribution. Spec-driven workflows must include their specifications, prompts, and planning artifacts.[1]
- The base submission requires a title, description, and repository link. Teams may select up to three partner prizes, but Aaj intentionally selects one.[1]
- ETHGlobal’s general demo-video guidance is **2–4 minutes**, at least 720p, not sped up, not recorded with a phone, and without an AI/TTS voiceover.[1]
- **0G — Build with 0G Private Computer (Classic)** requires 0G inference in the primary flow, surfaced request IDs, a judge-tryable consumer app, a reason to return, an explanation of what breaks without 0G, a repository with setup, a live link, and a video under three minutes.[2]
- The 0G page explicitly lists `whisper-large-v3`, welcomes voice apps, and rejects generic chat wrappers or apps where the AI call is removable without consequence.[2]
- The page lists `0gm-1.0` among models to try, but this planning foundation does **not** treat current API availability or suitability as verified. The implementation must query or test actual availability before choosing a default.[2]

## Verified winner patterns from the supplied sample

The supplied file verifies ten ETHGlobal showcase projects, whose primary showcase pages are listed below.[3]–[12] Its internal count finds that eight of ten expose a visible interface; several are explicitly mobile-first, PWA, MiniKit, or Next.js experiences. This supports a visible consumer flow, not a backend-only demo.

Three comparatively simple payment products use a familiar object as the entry point: a QR code (QryptoPay), a shared bill/link (WeSplit), or a calendar event (calendefi).[5][6][7] Poll It limits one action through verified identity; Vision Pay applies spending rules; ZKred exposes verifiable agent identity; NAR _ NET exposes an auditable subscription flow.[4][8][9][12]

For 0G specifically, the supplied sample verifies:

- **AInfluencer**, which won “Most Innovative Use of 0G Ecosystem,” puts 0G Compute inside an event-to-generated-content pipeline whose output drives publication.[10]
- **DeTrain**, which placed second for “Building Onchain AI dapps with 0G intelligent L1,” uses 0G Compute/Storage in a data contribution, evaluation, and payment loop.[11]
- **DIVE** also won a 0G prize within a broader identity, agent, and settlement product.[3]

These are evidence of complete, inspectable loops—not proof that their complexity is required for Mumbai.

## Product inferences

The following are design judgments, not sponsor rules:

1. **Optimize for one narratable loop.** “Speak → inspect plan → take first step” is easier to understand and finish than a general assistant.
2. **Make sponsor use causal.** Without transcription and plan generation, Aaj has no result; 0G therefore sits in the critical path rather than decorating it.
3. **Keep evidence visible.** The sponsor explicitly requires request IDs. Aaj should display authentic per-stage IDs; an honest unavailable state is correct product behavior but blocks prize readiness unless the sponsor clarifies otherwise.
4. **Prefer mobile web.** The winner sample shows visible web/mobile products can communicate value without native-app scope.
5. **Avoid sponsor stuffing.** A single well-proven 0G integration is more achievable than multiple shallow integrations.
6. **Make recurrence local and modest.** Date-keyed plans and completion state create a reason to return without accounts, cloud storage, or blockchain scope.

## Decisions

| Decision | Rationale | Status |
|---|---|---|
| Target only 0G Private Computer (Classic) | Matches voice transformation; reduces integration and judging risk | Accepted; see ADR-0001 |
| Build a mobile-first PWA | Fastest accessible consumer surface with recording/upload fallback | Accepted; see ADR-0002 |
| Keep history local | Supports return use while avoiding account/database scope | Accepted; see ADR-0003 |
| Never manufacture evidence | Sponsor evidence must be authentic and inspectable | Accepted; see ADR-0004 |
| Use two sequential inference operations | Speech transcription then structured planning is conceptually clean | Proposed pending real API verification |
| Use `whisper-large-v3` | Explicitly listed speech model and required by the product plan | Planned, not yet tested |
| Configure the text model server-side | Availability must be discovered rather than assumed | Planned; default TBD after verification |

## Open research questions

- What exact request shape, content type, response shape, timeout behavior, and size limits does the live 0G speech endpoint accept?
- Which 0G text models are actually available to the event credentials, and which support reliable structured output?
- Where does each endpoint return its request ID: header, body, both, or neither?
- What provider retention and privacy guarantees can be stated accurately? Until verified, Aaj claims only its own non-retention behavior.
- Does 0G require additional evidence or setup instructions not visible in the supplied page snapshot?

## Sources

[1] https://ethglobal.com/events/mumbai/info/details — ETHGlobal Mumbai details and rules
[2] https://ethglobal.com/events/mumbai/prizes/0g — 0G prize page
[3] https://ethglobal.com/showcase/dive-5hxbp — DIVE
[4] https://ethglobal.com/showcase/poll-it-wfhir — Poll It
[5] https://ethglobal.com/showcase/qryptopay-gbvkm — QryptoPay
[6] https://ethglobal.com/showcase/wesplit-jsbqa — WeSplit
[7] https://ethglobal.com/showcase/calendefi-6d3ji — calendefi
[8] https://ethglobal.com/showcase/zkred-agent-id-4aesd — ZKred Agent ID
[9] https://ethglobal.com/showcase/vision-pay-s1t91 — Vision Pay
[10] https://ethglobal.com/showcase/ainfluencer-moreg — AInfluencer
[11] https://ethglobal.com/showcase/detrain-5wiyz — DeTrain
[12] https://ethglobal.com/showcase/nar-net-s316f — NAR _ NET
