import { createHash } from "node:crypto";
import { normalizeTranscriptionEvidence } from "./zero-g-adapter";

const DEFAULT_ENDPOINT = "https://router-api.0g.ai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3";
const SAFE_HEADER_NAMES = new Set([
  "content-type",
  "x-request-id",
  "x-0g-request-id",
  "x-trace-id",
  "x-0g-trace-id",
]);
const CANDIDATE_HEADER_NAMES = [
  "x-request-id",
  "x-0g-request-id",
  "x-trace-id",
  "x-0g-trace-id",
] as const;
const CANDIDATE_BODY_KEYS = ["request_id", "requestId"] as const;
const SAFE_BODY_KEYS = new Set([
  "text",
  "model",
  "request_id",
  "requestId",
  "tee_verified",
  "trace",
  "x_0g_trace",
]);

type JsonObject = Record<string, unknown>;

export type CandidateEvidence = {
  source: string;
  fingerprint: string;
};

export type TranscriptionRequestEvidence =
  | {
      status: "available";
      source: "header:x-request-id" | "body:x_0g_trace.request_id";
      fingerprint: string;
    }
  | {
      status: "unavailable";
    };

export type SafeResponseMetadata = {
  status: number;
  transcriptPresent: boolean;
  transcriptLength: number;
  safeHeaderNames: string[];
  bodyKeys: string[];
  candidateEvidence: CandidateEvidence[];
  requestEvidence: TranscriptionRequestEvidence;
};

export type VerificationResult = SafeResponseMetadata & {
  durationMs: number;
  model: string;
};

type VerifyOptions = {
  apiKey: string;
  audio: Blob;
  fileName: string;
  endpoint?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function asJsonObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readNonEmptyString(object: JsonObject | null, key: string): string | null {
  const value = object?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function fingerprintCandidate(value: string): Promise<string> {
  return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export async function inspectResponseMetadata(
  response: Response,
): Promise<SafeResponseMetadata> {
  const rawBody = await response.text();
  let body: JsonObject | null = null;

  try {
    body = asJsonObject(JSON.parse(rawBody));
  } catch {
    body = null;
  }

  const transcript = readNonEmptyString(body, "text");
  const safeHeaderNames = [...response.headers.keys()]
    .map((name) => name.toLowerCase())
    .filter((name) => SAFE_HEADER_NAMES.has(name))
    .sort();
  const bodyKeys = body
    ? Object.keys(body)
        .filter((key) => SAFE_BODY_KEYS.has(key))
        .sort()
    : [];
  const candidates: Array<{ source: string; value: string }> = [];

  for (const name of CANDIDATE_HEADER_NAMES) {
    const value = response.headers.get(name);
    if (value) candidates.push({ source: `header:${name}`, value });
  }

  for (const key of CANDIDATE_BODY_KEYS) {
    const value = readNonEmptyString(body, key);
    if (value) candidates.push({ source: `body:${key}`, value });
  }

  const zeroGTrace = asJsonObject(body?.x_0g_trace);
  const traceRequestId = readNonEmptyString(zeroGTrace, "request_id");
  if (traceRequestId) {
    candidates.push({
      source: "body:x_0g_trace.request_id",
      value: traceRequestId,
    });
  }

  const normalizedEvidence = normalizeTranscriptionEvidence({
    headers: response.headers,
    body,
  });
  const requestEvidence: TranscriptionRequestEvidence =
    normalizedEvidence.status === "available"
      ? {
          status: "available",
          source: normalizedEvidence.source,
          fingerprint: await fingerprintCandidate(normalizedEvidence.requestId),
        }
      : { status: "unavailable" };

  return {
    status: response.status,
    transcriptPresent: transcript !== null,
    transcriptLength: transcript?.length ?? 0,
    safeHeaderNames,
    bodyKeys,
    candidateEvidence: await Promise.all(
      candidates.map(async ({ source, value }) => ({
        source,
        fingerprint: await fingerprintCandidate(value),
      })),
    ),
    requestEvidence,
  };
}

export async function verifyZeroGTranscription({
  apiKey,
  audio,
  fileName,
  endpoint = DEFAULT_ENDPOINT,
  model = DEFAULT_MODEL,
  fetchImpl = fetch,
  timeoutMs = 120_000,
}: VerifyOptions): Promise<VerificationResult> {
  if (!apiKey.trim()) throw new Error("ZERO_G_API_KEY is required");
  if (!fileName.trim()) throw new Error("An explicit audio fixture path is required");
  if (audio.size === 0) throw new Error("The audio fixture must not be empty");

  const form = new FormData();
  form.append("model", model);
  form.append("file", audio, fileName);
  const startedAt = performance.now();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  let response: Response;

  try {
    response = await fetchImpl(`${endpoint}?verify_tee=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-0G-Provider-Trust-Mode": "private",
      },
      body: form,
      signal: timeoutSignal,
    });
  } catch {
    if (timeoutSignal.aborted) {
      throw new Error(`0G transcription timed out after ${timeoutMs} ms`);
    }
    throw new Error("0G transcription request failed before a safe response was available");
  }

  const metadata = await inspectResponseMetadata(response);
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    throw new Error(`0G transcription failed with HTTP ${response.status}`);
  }

  return { ...metadata, durationMs, model };
}
