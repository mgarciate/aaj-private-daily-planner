import "server-only";

import { parsePlanCandidate } from "../domain/plan-schema";
import type { Plan } from "../domain/plan-types";
import {
  FIXED_TRANSCRIPTION_MODEL,
  VERIFIED_PLANNER_MODEL,
} from "../inference-models";
import type { RealServerConfig } from "./config";
import { AajError, type PublicErrorCode } from "./errors";
import {
  ZeroGUpstreamError,
  zeroGAdapter,
  type ZeroGAdapter,
  type ZeroGPlanningEvidence,
  type ZeroGTranscriptionEvidence,
} from "./zero-g-adapter";

/** Final planner-input limit, measured after trimming in Unicode code points. */
export const MAX_TRANSCRIPT_CODE_POINTS = 8_000;

type PublicEvidence =
  | Readonly<{ status: "available"; requestId: string }>
  | Readonly<{ status: "unavailable" }>;

export type RealPlanSuccess = Readonly<{
  schemaVersion: 1;
  mode: "real";
  transcript: string;
  plan: Plan;
  inference: Readonly<{
    transcription: Readonly<{
      model: typeof FIXED_TRANSCRIPTION_MODEL;
      evidence: PublicEvidence;
    }>;
    planning: Readonly<{
      model: typeof VERIFIED_PLANNER_MODEL;
      evidence: PublicEvidence;
    }>;
  }>;
}>;

export type OrchestrateRealPlanInput = Readonly<{
  config: RealServerConfig;
  audio: Blob;
  fileName: string;
  adapter?: ZeroGAdapter;
}>;

function safeError(code: PublicErrorCode): never {
  throw new AajError(code);
}

function mapUpstreamFailure(
  error: ZeroGUpstreamError,
  fallbackCode: "TRANSCRIPTION_FAILED" | "PLANNING_FAILED",
): never {
  if (error.kind === "timeout") safeError("UPSTREAM_TIMEOUT");
  if (error.kind === "rate_limited") safeError("RATE_LIMITED");
  if (error.kind === "invalid_response" && error.stage === "planning") {
    safeError("INVALID_MODEL_OUTPUT");
  }
  safeError(fallbackCode);
}

function publicTranscriptionEvidence(
  evidence: ZeroGTranscriptionEvidence,
): PublicEvidence {
  if (evidence.stage !== "transcription") safeError("TRANSCRIPTION_FAILED");
  if (evidence.status === "unavailable") return { status: "unavailable" };
  if (typeof evidence.requestId !== "string" || evidence.requestId.trim().length === 0) {
    safeError("TRANSCRIPTION_FAILED");
  }
  return { status: "available", requestId: evidence.requestId };
}

function publicPlanningEvidence(evidence: ZeroGPlanningEvidence): PublicEvidence {
  if (evidence.stage !== "planning") safeError("PLANNING_FAILED");
  if (evidence.status === "unavailable") return { status: "unavailable" };
  if (typeof evidence.requestId !== "string" || evidence.requestId.trim().length === 0) {
    safeError("PLANNING_FAILED");
  }
  return { status: "available", requestId: evidence.requestId };
}

function validatedTranscript(rawTranscript: string): string {
  if (typeof rawTranscript !== "string") safeError("TRANSCRIPTION_FAILED");
  const transcript = rawTranscript.trim();
  if (
    transcript.length === 0 ||
    Array.from(transcript).length > MAX_TRANSCRIPT_CODE_POINTS
  ) {
    safeError("TRANSCRIPTION_FAILED");
  }
  return transcript;
}

/**
 * Runs exactly one transcription followed by exactly one planning operation.
 * The function is stateless: retries are fresh calls and no content or evidence
 * is logged, cached, or persisted here.
 */
export async function orchestrateRealPlan({
  config,
  audio,
  fileName,
  adapter = zeroGAdapter,
}: OrchestrateRealPlanInput): Promise<RealPlanSuccess> {
  if (
    config.mode !== "real" ||
    config.transcriptionModel !== FIXED_TRANSCRIPTION_MODEL ||
    config.plannerModel !== VERIFIED_PLANNER_MODEL
  ) {
    safeError("CONFIGURATION_ERROR");
  }

  const apiKey = config.getZeroGApiKey();
  let transcription: Awaited<ReturnType<ZeroGAdapter["transcribe"]>>;
  try {
    transcription = await adapter.transcribe({
      apiKey,
      audio,
      fileName,
      model: config.transcriptionModel,
    });
  } catch (error) {
    if (error instanceof ZeroGUpstreamError) {
      mapUpstreamFailure(error, "TRANSCRIPTION_FAILED");
    }
    safeError("TRANSCRIPTION_FAILED");
  }

  if (transcription.model !== FIXED_TRANSCRIPTION_MODEL) {
    safeError("TRANSCRIPTION_FAILED");
  }
  const transcript = validatedTranscript(transcription.transcript);
  const transcriptionEvidence = publicTranscriptionEvidence(transcription.evidence);

  let planning: Awaited<ReturnType<ZeroGAdapter["plan"]>>;
  try {
    planning = await adapter.plan({
      apiKey,
      transcript,
      model: config.plannerModel,
    });
  } catch (error) {
    if (error instanceof ZeroGUpstreamError) {
      mapUpstreamFailure(error, "PLANNING_FAILED");
    }
    safeError("PLANNING_FAILED");
  }

  if (planning.model !== VERIFIED_PLANNER_MODEL) safeError("INVALID_MODEL_OUTPUT");

  let plan: Plan;
  try {
    // This is the authoritative validation boundary. The observation verifier's
    // validatePlannerOutput helper is intentionally not used for production.
    plan = parsePlanCandidate(planning.candidate);
  } catch {
    safeError("INVALID_MODEL_OUTPUT");
  }

  return {
    schemaVersion: 1,
    mode: "real",
    transcript,
    plan,
    inference: {
      transcription: {
        model: FIXED_TRANSCRIPTION_MODEL,
        evidence: transcriptionEvidence,
      },
      planning: {
        model: VERIFIED_PLANNER_MODEL,
        evidence: publicPlanningEvidence(planning.evidence),
      },
    },
  };
}
