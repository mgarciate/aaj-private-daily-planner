import "server-only";

import { MAX_AUDIO_BYTES } from "../audio-policy";
import {
  FIXED_TRANSCRIPTION_MODEL,
  VERIFIED_PLANNER_MODEL,
} from "../inference-models";
import {
  PLANNER_SYSTEM_PROMPT,
  normalizePlanningEvidence,
  normalizeTranscriptionEvidence,
  type ZeroGEvidenceStage,
  type ZeroGPlanningEvidence,
  type ZeroGTranscriptionEvidence,
} from "../zero-g-contract";

type JsonObject = Record<string, unknown>;

export type ZeroGTranscriptionResult = Readonly<{
  transcript: string;
  model: typeof FIXED_TRANSCRIPTION_MODEL;
  evidence: ZeroGTranscriptionEvidence;
}>;

export type ZeroGPlanningResult = Readonly<{
  candidate: unknown;
  model: typeof VERIFIED_PLANNER_MODEL;
  evidence: ZeroGPlanningEvidence;
}>;

export type ZeroGTranscriptionInput = Readonly<{
  apiKey: string;
  audio: Blob;
  fileName: string;
  model: typeof FIXED_TRANSCRIPTION_MODEL;
}>;

export type ZeroGPlanningInput = Readonly<{
  apiKey: string;
  transcript: string;
  model: typeof VERIFIED_PLANNER_MODEL;
}>;

export type ZeroGAdapter = Readonly<{
  transcribe(input: ZeroGTranscriptionInput): Promise<ZeroGTranscriptionResult>;
  plan(input: ZeroGPlanningInput): Promise<ZeroGPlanningResult>;
}>;

export type ZeroGUpstreamFailureKind =
  | "timeout"
  | "rate_limited"
  | "request_failed"
  | "invalid_response";

export class ZeroGUpstreamError extends Error {
  constructor(
    readonly stage: ZeroGEvidenceStage,
    readonly kind: ZeroGUpstreamFailureKind,
  ) {
    super(`0G ${stage} ${kind}`);
    this.name = "ZeroGUpstreamError";
  }
}

const DEFAULT_BASE_URL = "https://router-api.0g.ai";
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_SUCCESS_RESPONSE_BYTES = 256 * 1024;
const RESPONSE_FORMAT = "json_object" as const;
const TRUST_MODE = "private" as const;
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

function asJsonObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function deepFreezeJson<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;

  const pending: object[] = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const child of Object.values(current)) {
      if (typeof child === "object" && child !== null) pending.push(child);
    }
    Object.freeze(current);
  }

  return value;
}

function fail(stage: ZeroGEvidenceStage, kind: ZeroGUpstreamFailureKind): never {
  throw new ZeroGUpstreamError(stage, kind);
}

async function readBoundedJson(
  response: Response,
  stage: ZeroGEvidenceStage,
): Promise<JsonObject> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_SUCCESS_RESPONSE_BYTES) {
      fail(stage, "invalid_response");
    }
  }

  if (!response.body) fail(stage, "invalid_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_SUCCESS_RESPONSE_BYTES) {
      await reader.cancel();
      fail(stage, "invalid_response");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const body = asJsonObject(JSON.parse(new TextDecoder().decode(bytes)));
    if (!body) fail(stage, "invalid_response");
    return body;
  } catch (error) {
    if (error instanceof ZeroGUpstreamError) throw error;
    fail(stage, "invalid_response");
  }
}

function mapHttpFailure(stage: ZeroGEvidenceStage, status: number): never {
  fail(stage, status === 429 ? "rate_limited" : "request_failed");
}

async function fetchWithSafeFailure(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  stage: ZeroGEvidenceStage,
  signal: AbortSignal,
): Promise<Response> {
  try {
    return await fetchImpl(input, init);
  } catch {
    fail(stage, signal.aborted ? "timeout" : "request_failed");
  }
}

function readPlannerCandidate(body: JsonObject): unknown {
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) fail("planning", "invalid_response");
  const choice = asJsonObject(choices[0]);
  const message = asJsonObject(choice?.message);
  const content = message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    fail("planning", "invalid_response");
  }

  try {
    return JSON.parse(content);
  } catch {
    fail("planning", "invalid_response");
  }
}

export type CreateZeroGAdapterOptions = Readonly<{
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}>;

/** Creates a stateless adapter. Each method call performs exactly one provider request. */
export function createZeroGAdapter({
  fetchImpl = fetch,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CreateZeroGAdapterOptions = {}): ZeroGAdapter {
  return Object.freeze({
    async transcribe(input: ZeroGTranscriptionInput): Promise<ZeroGTranscriptionResult> {
      if (
        input.model !== FIXED_TRANSCRIPTION_MODEL ||
        !input.apiKey.trim() ||
        input.audio.size === 0 ||
        input.audio.size > MAX_AUDIO_BYTES ||
        !SAFE_FILE_NAME.test(input.fileName)
      ) {
        fail("transcription", "request_failed");
      }

      const form = new FormData();
      form.append("model", FIXED_TRANSCRIPTION_MODEL);
      form.append("file", input.audio, input.fileName);
      const signal = AbortSignal.timeout(timeoutMs);
      const response = await fetchWithSafeFailure(
        fetchImpl,
        `${baseUrl}/v1/audio/transcriptions?verify_tee=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "X-0G-Provider-Trust-Mode": TRUST_MODE,
          },
          body: form,
          signal,
        },
        "transcription",
        signal,
      );
      if (!response.ok) mapHttpFailure("transcription", response.status);

      let body: JsonObject;
      try {
        body = await readBoundedJson(response, "transcription");
      } catch (error) {
        if (signal.aborted) fail("transcription", "timeout");
        if (error instanceof ZeroGUpstreamError) throw error;
        fail("transcription", "request_failed");
      }
      const transcript = body.text;
      if (typeof transcript !== "string") fail("transcription", "invalid_response");
      if (body.model !== undefined && body.model !== FIXED_TRANSCRIPTION_MODEL) {
        fail("transcription", "invalid_response");
      }

      return Object.freeze({
        transcript,
        model: FIXED_TRANSCRIPTION_MODEL,
        evidence: normalizeTranscriptionEvidence({ headers: response.headers, body }),
      });
    },

    async plan(input: ZeroGPlanningInput): Promise<ZeroGPlanningResult> {
      if (
        input.model !== VERIFIED_PLANNER_MODEL ||
        !input.apiKey.trim() ||
        !input.transcript.trim()
      ) {
        fail("planning", "request_failed");
      }

      const signal = AbortSignal.timeout(timeoutMs);
      const response = await fetchWithSafeFailure(
        fetchImpl,
        `${baseUrl}/v1/chat/completions?verify_tee=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json",
            "X-0G-Provider-Trust-Mode": TRUST_MODE,
          },
          body: JSON.stringify({
            model: VERIFIED_PLANNER_MODEL,
            messages: [
              { role: "system", content: PLANNER_SYSTEM_PROMPT },
              {
                role: "user",
                content: JSON.stringify({ transcript: input.transcript }),
              },
            ],
            response_format: { type: RESPONSE_FORMAT },
            temperature: 0,
          }),
          signal,
        },
        "planning",
        signal,
      );
      if (!response.ok) mapHttpFailure("planning", response.status);

      let body: JsonObject;
      try {
        body = await readBoundedJson(response, "planning");
      } catch (error) {
        if (signal.aborted) fail("planning", "timeout");
        if (error instanceof ZeroGUpstreamError) throw error;
        fail("planning", "request_failed");
      }
      if (body.model !== VERIFIED_PLANNER_MODEL) fail("planning", "invalid_response");

      const candidate = deepFreezeJson(readPlannerCandidate(body));
      return Object.freeze({
        candidate,
        model: VERIFIED_PLANNER_MODEL,
        evidence: normalizePlanningEvidence({ headers: response.headers, body }),
      });
    },
  });
}

export const zeroGAdapter = createZeroGAdapter();
