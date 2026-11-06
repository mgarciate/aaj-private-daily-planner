# 0G transcription observation

**Status:** VERIFIED against 0G mainnet Router
**Gate:** Task 0.2 / Gate A passed on 2026-11-06.

Three live `whisper-large-v3` calls completed through the mainnet Router: two safe verifier runs and one opt-in contract-test run. The local fixture was a non-sensitive 12-second mono WAV and was not committed. A self-recorded fixture should replace it for the final demo.

## Documented target

Current 0G documentation describes:

- mainnet endpoint: `https://router-api.0g.ai/v1/audio/transcriptions`;
- model: `whisper-large-v3`;
- multipart fields: `model` and `file`;
- optional TEE query: `verify_tee=true`; and
- private-provider preference: `X-0G-Provider-Trust-Mode: private`.

Source: https://pc.0g.ai/models/whisper-large-v3

The endpoint, model, multipart fields, TEE query, and private trust-mode header all worked with the configured credential.

The Router chat-completions documentation states that `x_0g_trace.request_id` is present in Router responses. Live speech responses confirmed the same nested location. Source: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions

## Observed results

| Run | HTTP | Duration | Transcript | Evidence locations |
|---|---:|---:|---|---|
| Verifier 1 | 200 | 5120 ms | present, 159 characters | `x-request-id`; `x_0g_trace.request_id` |
| Verifier 2 | 200 | 3975 ms | present, 159 characters | `x-request-id`; `x_0g_trace.request_id` |
| Contract test | 200 | completed within 5 seconds | present and non-whitespace | both required candidate locations present |

The two verifier runs produced different truncated SHA-256 fingerprints for both identifiers, proving the values are per-request rather than constants. Full identifiers, transcript content, audio, credentials, and response bodies were not printed or committed.

For product evidence, prefer `x_0g_trace.request_id`: it is documented by 0G as the Router request identifier. Keep the header ID separately available for diagnostics until 0G clarifies whether it represents the edge request or the same logical operation. Both values appeared safe to display as opaque request identifiers; neither contained credential material.

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

## Reproduction

The documented commands above reproduce the verifier and live test when the credential and fixture are loaded from protected local configuration. The live contract test must run in Vitest's Node environment; jsdom's Blob/FormData implementation produced a provider-side HTTP 400 and is not representative of the server runtime.

Gate A is complete. Task 0.3 may begin, but Gate B still requires selecting and proving a live planner model with its own authentic `x_0g_trace.request_id`. Never substitute an Aaj correlation ID, UUID, timestamp, hash, or demo identifier.
