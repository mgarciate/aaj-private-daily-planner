import { createHash } from "node:crypto";
import {
  PLANNER_SYSTEM_PROMPT,
  normalizePlanningEvidence,
} from "../zero-g-contract";

const DEFAULT_ENDPOINT = "https://router-api.0g.ai/v1/chat/completions";
const RESPONSE_FORMAT = "json_object" as const;
const TRUST_MODE = "private" as const;
const MAX_RESPONSE_BYTES = 256 * 1024;

export const FIXED_PLANNER_TRANSCRIPT =
  "आज मुझे project outline पूरा करना है, दो pending messages का reply देना है, और शाम को 20 मिनट walk करनी है. Outline के sections का order अभी clear नहीं है.";


const EXPECTED_PLAN_KEYS = [
  "blocker",
  "encouragement",
  "firstStep",
  "priorities",
] as const;

type JsonObject = Record<string, unknown>;

export type PlannerOutput = {
  priorities: [string, string, string];
  blocker: string;
  firstStep: string;
  encouragement: string;
};

export type PlannerRequestEvidence = {
  source: "body:x_0g_trace.request_id";
  fingerprint: string;
};

export type PlannerVerificationResult = {
  status: number;
  durationMs: number;
  model: string;
  responseFormat: typeof RESPONSE_FORMAT;
  verifyTee: true;
  trustMode: typeof TRUST_MODE;
  plan: PlannerOutput;
  requestEvidence: PlannerRequestEvidence | null;
};

type VerifyPlannerOptions = {
  apiKey: string;
  model: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  transcript?: string;
};

function asJsonObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function invalidPlan(): never {
  throw new Error("0G planner returned an invalid exact plan schema");
}

export function validatePlannerOutput(value: unknown): PlannerOutput {
  const object = asJsonObject(value);
  if (!object) invalidPlan();

  const keys = Object.keys(object).sort();
  if (
    keys.length !== EXPECTED_PLAN_KEYS.length ||
    keys.some((key, index) => key !== EXPECTED_PLAN_KEYS[index])
  ) {
    invalidPlan();
  }

  const priorities = object.priorities;
  if (
    !Array.isArray(priorities) ||
    priorities.length !== 3 ||
    !priorities.every(isNonEmptyString)
  ) {
    invalidPlan();
  }
  if (
    !isNonEmptyString(object.blocker) ||
    !isNonEmptyString(object.firstStep) ||
    !isNonEmptyString(object.encouragement)
  ) {
    invalidPlan();
  }

  return {
    priorities: [priorities[0], priorities[1], priorities[2]],
    blocker: object.blocker,
    firstStep: object.firstStep,
    encouragement: object.encouragement,
  };
}

export async function fingerprintPlannerRequestId(value: string): Promise<string> {
  return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function extractMessageContent(body: JsonObject): string {
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) invalidPlan();
  const choice = asJsonObject(choices[0]);
  const message = asJsonObject(choice?.message);
  const content = message?.content;
  if (!isNonEmptyString(content)) invalidPlan();
  return content;
}

async function readBoundedResponseText(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_RESPONSE_BYTES) {
      throw new Error("0G planner response exceeded the safe size limit");
    }
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("0G planner response exceeded the safe size limit");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

async function parseSuccessfulResponse(
  response: Response,
  expectedModel: string,
): Promise<{
  model: string;
  plan: PlannerOutput;
  requestEvidence: PlannerRequestEvidence | null;
}> {
  let body: JsonObject | null = null;
  try {
    body = asJsonObject(JSON.parse(await readBoundedResponseText(response)));
  } catch (error) {
    if (error instanceof Error && error.message.includes("safe size limit")) throw error;
    invalidPlan();
  }
  if (!body) invalidPlan();

  const responseModel = body.model;
  if (!isNonEmptyString(responseModel) || responseModel !== expectedModel) {
    throw new Error("0G planner returned an unexpected model");
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(extractMessageContent(body));
  } catch {
    invalidPlan();
  }
  const plan = validatePlannerOutput(candidate);

  const normalizedEvidence = normalizePlanningEvidence({
    headers: response.headers,
    body,
  });
  const requestEvidence = normalizedEvidence.status === "available"
    ? {
        source: normalizedEvidence.source,
        fingerprint: await fingerprintPlannerRequestId(normalizedEvidence.requestId),
      }
    : null;

  return { model: responseModel, plan, requestEvidence };
}

export async function verifyZeroGPlanner({
  apiKey,
  model,
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = fetch,
  timeoutMs = 120_000,
  transcript = FIXED_PLANNER_TRANSCRIPT,
}: VerifyPlannerOptions): Promise<PlannerVerificationResult> {
  if (!apiKey.trim()) throw new Error("ZERO_G_API_KEY is required");
  if (!model.trim()) throw new Error("ZERO_G_PLANNER_MODEL is required");
  if (!transcript.trim()) throw new Error("A non-empty planner transcript is required");

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const startedAt = performance.now();
  let response: Response;

  try {
    response = await fetchImpl(`${endpoint}?verify_tee=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-0G-Provider-Trust-Mode": TRUST_MODE,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({ transcript }),
          },
        ],
        response_format: { type: RESPONSE_FORMAT },
        temperature: 0,
      }),
      signal: timeoutSignal,
    });
  } catch {
    if (timeoutSignal.aborted) {
      throw new Error(`0G planning timed out after ${timeoutMs} ms`);
    }
    throw new Error("0G planning request failed before a safe response was available");
  }

  if (!response.ok) {
    throw new Error(`0G planning failed with HTTP ${response.status}`);
  }

  let parsedResponse: Awaited<ReturnType<typeof parseSuccessfulResponse>>;
  try {
    parsedResponse = await parseSuccessfulResponse(response, model);
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new Error(`0G planning timed out after ${timeoutMs} ms`);
    }
    throw error;
  }
  const durationMs = Math.round(performance.now() - startedAt);
  return {
    status: response.status,
    durationMs,
    model: parsedResponse.model,
    responseFormat: RESPONSE_FORMAT,
    verifyTee: true,
    trustMode: TRUST_MODE,
    plan: parsedResponse.plan,
    requestEvidence: parsedResponse.requestEvidence,
  };
}
