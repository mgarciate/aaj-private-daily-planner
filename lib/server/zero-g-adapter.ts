type JsonObject = Record<string, unknown>;

type EvidenceInput = {
  headers: Headers;
  body: unknown;
};

export type ZeroGEvidenceStage = "transcription" | "planning";
export type ZeroGEvidenceSource =
  | "header:x-request-id"
  | "body:x_0g_trace.request_id";

export type ZeroGTranscriptionEvidence =
  | {
      status: "available";
      stage: "transcription";
      source: ZeroGEvidenceSource;
      requestId: string;
    }
  | {
      status: "unavailable";
      stage: "transcription";
    };

export type ZeroGPlanningEvidence =
  | {
      status: "available";
      stage: "planning";
      source: "body:x_0g_trace.request_id";
      requestId: string;
    }
  | {
      status: "unavailable";
      stage: "planning";
    };

export type ZeroGRequestEvidence =
  | ZeroGTranscriptionEvidence
  | ZeroGPlanningEvidence;

function asJsonObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readObservedTraceRequestId(body: unknown): string | null {
  const object = asJsonObject(body);
  const trace = asJsonObject(object?.x_0g_trace);
  const requestId = trace?.request_id;
  return typeof requestId === "string" && requestId.trim().length > 0
    ? requestId
    : null;
}

function unavailable<TStage extends ZeroGEvidenceStage>(
  stage: TStage,
): { status: "unavailable"; stage: TStage } {
  return { status: "unavailable", stage };
}

export function normalizeTranscriptionEvidence(
  input: EvidenceInput,
): ZeroGTranscriptionEvidence {
  // The provider-specific trace is more narrowly scoped, so it wins when both
  // observed transcription locations are present.
  const traceRequestId = readObservedTraceRequestId(input.body);
  if (traceRequestId !== null) {
    return {
      status: "available",
      stage: "transcription",
      source: "body:x_0g_trace.request_id",
      requestId: traceRequestId,
    };
  }

  const headerRequestId = input.headers.get("x-request-id");
  if (headerRequestId !== null && headerRequestId.trim().length > 0) {
    return {
      status: "available",
      stage: "transcription",
      source: "header:x-request-id",
      requestId: headerRequestId,
    };
  }

  return unavailable("transcription");
}

export function normalizePlanningEvidence(input: EvidenceInput): ZeroGPlanningEvidence {
  const traceRequestId = readObservedTraceRequestId(input.body);
  if (traceRequestId === null) return unavailable("planning");

  return {
    status: "available",
    stage: "planning",
    source: "body:x_0g_trace.request_id",
    requestId: traceRequestId,
  };
}
