# 0G transcription observation

**Status:** UNVERIFIED — BLOCKED  
**Gate:** Task 0.2 / Gate A has not passed.

No live 0G request has been made from this repository. At the time this note was created, `ZERO_G_API_KEY` and a human-recorded, non-sensitive audio fixture were not available to the runtime. No request ID, provider behavior, latency, supported fixture format, or response shape is claimed here.

## Documented target

Current 0G documentation describes:

- mainnet endpoint: `https://router-api.0g.ai/v1/audio/transcriptions`;
- model: `whisper-large-v3`;
- multipart fields: `model` and `file`;
- optional TEE query: `verify_tee=true`; and
- private-provider preference: `X-0G-Provider-Trust-Mode: private`.

Source: https://pc.0g.ai/models/whisper-large-v3

These values remain integration assumptions until observed with the event credentials.

The Router chat-completions documentation states that `x_0g_trace.request_id` is present in Router responses. The verifier treats that nested location as **candidate-only** because the speech endpoint has not yet been observed. Source: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions

## Safe preflight

1. Store the credential outside the repository in a file readable only by the current user.
2. Record a short, human-spoken fixture containing no private or identifying information.
3. Keep shell tracing disabled and load the secret without placing its value in command history.
4. Run the verifier:

```bash
set +x
source "$HOME/.config/aaj/zero-g.env"
pnpm tsx scripts/verify-zero-g.ts "$ZERO_G_AUDIO_FIXTURE"
```

5. Run the opt-in contract test:

```bash
RUN_0G_LIVE_TESTS=1 pnpm vitest run tests/contract/zero-g-live.test.ts
```

The verifier intentionally reports only safe metadata: status, duration, model, transcript presence/length, safe response header names, body key names, candidate evidence locations, and truncated SHA-256 fingerprints. It does not print credentials, audio, transcript content, full response bodies, or full candidate request IDs.

## Gate A evidence still required

Before Task 0.2 can close, record only non-sensitive observations:

- credential environment (mainnet/testnet, never the key);
- accepted audio extension and MIME type;
- HTTP status and measured duration;
- safe response body/header shape;
- exact provider request-ID source location;
- whether the identifier is safe to show to judges;
- a second run proving the identifier is per-request; and
- the passing live contract-test command and commit SHA.

If no authentic request ID is returned, stop prize-readiness work and ask 0G for clarification. Never substitute an Aaj correlation ID, UUID, timestamp, hash, or demo identifier.
