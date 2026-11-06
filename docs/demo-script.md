# Aaj demo script (draft)

**Target runtime:** 2:20–2:45

**Hard constraints:** Under the 0G sponsor’s three-minute ceiling and at least ETHGlobal’s general two-minute minimum; ≥720p; desktop screen capture; human narration; no speed-up; no phone recording; no AI/TTS voiceover.
**Status:** Draft only. The speech and planner models, local live-call latency, and request-ID locations are verified; live URL, complete product flow, and demo performance remain TBD until verified.

## Preflight

- [ ] Live URL opens on a narrow/mobile viewport.
- [ ] Deployed server has `ZERO_G_API_KEY` and a planner model proven available.
- [ ] A real test run succeeded immediately before recording.
- [ ] Microphone permission and file-upload fallback work.
- [ ] The input contains no private or identifying information.
- [ ] Evidence panel has authentic per-stage request IDs returned by 0G. An honest “unavailable” state is valid product behavior but does not meet the published prize requirement; stop and seek sponsor clarification rather than recording a submission-ready demo.
- [ ] A prior local plan exists only if history is part of the final implementation.
- [ ] No API key, authorization header, private log, or provider dashboard secret is visible.

## 0:00–0:15 — Problem and promise

**Say:** “Most planners start with an empty form. Aaj—‘today’ in Hindi—starts with what is already in your head. Speak for under a minute and leave with three priorities and one first step.”

**Show:** Home screen at a mobile width; point to the concise processing/privacy disclosure.

## 0:15–0:40 — Multilingual capture

**Say while recording:** “Aaj mujhe demo finish karna hai, mentor ko update bhejna hai, and test the live deployment. I’m blocked because I haven’t verified the real API response. Start by running one safe request.”

**Show:** Record, visible timer, stop, and review. The primary take should use a real fresh capture; keep a short non-sensitive file ready only as fallback.

## 0:40–1:25 — Real 0G critical path

**Say:** “The audio goes to Aaj’s server, where the key stays private. Aaj asks 0G’s `whisper-large-v3` to transcribe it, then asks `0gm-1.0-35b-a3b` for a strict JSON plan.”

**Show:** Submit; the honest orchestration labels **Transcribing** then **Planning**; reveal:

- exactly three priority cards;
- one blocker;
- one first step;
- one short encouragement;
- transcript disclosure; and
- separate transcription/planning evidence.

**Say:** “Any request IDs shown here are copied from the actual 0G responses. Aaj never fills a missing ID with its own UUID.”

## 1:25–1:50 — Return tomorrow

**Show:** Mark one priority complete, refresh, and demonstrate persistence. If history shipped, open the prior local date and return to today.

**Say:** “Aaj stores the structured plan and completion state in this browser—no account or Aaj cloud history. It does not retain the raw audio. Tomorrow opens a fresh daily plan while recent local progress remains here.”

Do not imply browser storage is encrypted or that 0G has a retention policy that has not been verified.

## 1:50–2:10 — Honest simulation boundary

**Show:** A prepared second environment or screenshot only if explicit demo mode shipped. It must display **Demo mode — no 0G inference occurred** and no provider request IDs or real model badge.

**Say:** “Simulation never masquerades as inference. Demo mode is explicitly configured, persistently labeled, and contains no 0G request evidence.”

If demo mode did not ship, use this time to show the upload fallback and an honest typed error instead; do not invent a feature for the video.

## 2:10–2:30 — Why 0G and close

**Show:** Architecture diagram: browser → Aaj server → 0G speech → 0G planning; browser → local history.

**Say:** “0G is load-bearing in this build: remove its two inference calls and Aaj cannot produce the transcript or plan. The architecture is candidly provider-adaptable, but this submission’s working critical path, evidence, and integration are built and tested against 0G. Aaj: speak your day, leave with your first step.”

## Live fallback order

1. Retry the real flow once with the prepared 10–15 second non-sensitive audio file.
2. If microphone access fails, use upload and still run real 0G inference.
3. If 0G is temporarily unreachable, show the honest error and a previously recorded real-run clip/screenshot with its evidence and timestamp.
4. Show explicit demo mode only as simulation, never as a substitute for proof of a real run.

## Final evidence checklist

- [ ] Actual runtime is 2:00–2:59.
- [ ] One fresh real 0G run is visible.
- [ ] Models shown match observed configuration.
- [ ] Any displayed request IDs are authentic and stage-specific.
- [ ] No unavailable ID is replaced with an Aaj/sample ID.
- [ ] Exact plan shape is visible.
- [ ] Return behavior is demonstrated, not only stated.
- [ ] Privacy wording covers Aaj behavior without unsupported provider claims.
- [ ] No secret or private content appears.
- [ ] Video meets ETHGlobal recording requirements.
