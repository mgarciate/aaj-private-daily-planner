# 0G planner model observation

**Status:** VERIFIED against 0G mainnet Router
**Gate:** Task 0.3 / Gate B passed on 2026-11-06 for the planner stage; Task 0.2 already established the transcription stage.

## Selected contract

| Property | Verified value |
|---|---|
| Endpoint | `POST https://router-api.0g.ai/v1/chat/completions?verify_tee=true` |
| Model | `0gm-1.0-35b-a3b` |
| Response format | `{"type":"json_object"}` |
| Provider trust header | `X-0G-Provider-Trust-Mode: private` |
| Request timeout | 120 seconds per call |
| Automatic schema retry | none; malformed output fails closed |
| Planner request-ID location | `x_0g_trace.request_id` in the JSON response body |

A credentialed `GET /v1/models` preflight listed `0gm-1.0-35b-a3b`. The selected model then completed the fixed, non-sensitive multilingual planner request repeatedly. The first structured-output attempt passed immediately; no initial schema failure was observed.

The request uses Node's built-in `fetch`, a fixed system instruction, a JSON-encoded transcript treated as untrusted data, temperature `0`, JSON-object response mode, TEE verification query, and private provider trust mode. The verifier also requires the provider-reported model to match the selected model and caps successful response bodies at 256 KiB. Application validation—not JSON mode alone—requires exactly these keys and rejects missing, extra, empty, or wrongly typed values:

- `priorities`: exactly three non-empty strings;
- `blocker`: one non-empty string;
- `firstStep`: one non-empty string; and
- `encouragement`: one non-empty string.

## Live results

| Run | HTTP | Duration | Exact schema | Evidence |
|---|---:|---:|---|---|
| Safe verifier 1 | 200 | 22,134 ms | valid; 3 priorities | `body:x_0g_trace.request_id`; fingerprint `sha256:4a0201f50da45ed6` |
| Safe verifier 2 | 200 | 26,918 ms | valid; 3 priorities | `body:x_0g_trace.request_id`; fingerprint `sha256:58a06741f0046fb0` |
| Live contract pair | 200 for both | 64,677 ms combined | both valid; 3 priorities each | documented location present in both; fingerprints distinct |

The verifier fingerprints only the authentic value returned at `x_0g_trace.request_id`; it does not generate a request ID. Different fingerprints across requests establish per-request evidence without publishing full identifiers. Credentials, authorization headers, generated plan text, complete request IDs, and complete upstream bodies were not printed or committed. The fixed prompt and transcript are intentionally non-sensitive test inputs committed in source for reproducibility.

The opt-in contract also ran the established live transcription check. In the same invocation, transcription passed in 3,968 ms and the two planner calls passed in 64,677 ms, so both required 0G stages returned usable request evidence.

## Reproduction

Load the credential from protected local configuration with shell tracing disabled. Set the non-secret selected model explicitly or use the default in `.env.example`:

```bash
set +x
source /path/to/protected/aaj.env
export ZERO_G_PLANNER_MODEL=0gm-1.0-35b-a3b
pnpm tsx scripts/verify-zero-g-planner.ts
RUN_0G_LIVE_TESTS=1 pnpm vitest run tests/contract/zero-g-live.test.ts
```

The planner verifier prints only status, duration, selected model, response-mode flags, schema validity, priority count, request-ID source, and a truncated SHA-256 fingerprint. The live test makes two planner requests and requires distinct fingerprints.

## Limitations

- `json_object` constrains syntax but does not enforce Aaj's schema; strict application validation remains mandatory.
- Reliability was demonstrated with one fixed, non-sensitive multilingual transcript over four calls in this verification session. It is not a general quality benchmark.
- Observed planner latency varied, and the contract pair took 64,677 ms combined. The 120-second timeout is a verification bound, not a production latency SLO.
- No automatic repair/retry is selected. A malformed or incomplete model result is rejected; a later retry policy must preserve evidence for each new provider operation.
- `x_0g_trace.request_id` is verified as the request-evidence location for this endpoint and configuration. No other response field is promoted to planner evidence.
- The successful `verify_tee=true` and private trust-mode request proves API compatibility, not a broader provider retention, confidentiality, or cryptographic-attestation claim.
