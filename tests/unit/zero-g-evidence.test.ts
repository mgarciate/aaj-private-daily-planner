import { describe, expect, it } from "vitest";
import {
  MAX_PROVIDER_REQUEST_ID_CODE_POINTS,
  normalizePlanningEvidence,
  normalizeTranscriptionEvidence,
} from "../../lib/zero-g-contract";
import {
  PLANNING_TRACE_REQUEST_ID,
  TRANSCRIPTION_HEADER_REQUEST_ID,
  TRANSCRIPTION_TRACE_REQUEST_ID,
  planningWithTraceEvidence,
  transcriptionWithHeaderEvidence,
  transcriptionWithTraceEvidence,
} from "../fixtures/zero-g";

describe("authentic 0G evidence normalization", () => {
  it.each([
    ["transcription body", normalizeTranscriptionEvidence, "body"],
    ["transcription header", normalizeTranscriptionEvidence, "header"],
    ["planning body", normalizePlanningEvidence, "body"],
  ] as const)(
    "accepts exactly the final request-ID bound for %s and preserves it",
    (_label, normalize, location) => {
      const requestId = (location === "header" ? "x" : "😀").repeat(
        MAX_PROVIDER_REQUEST_ID_CODE_POINTS,
      );
      const input = location === "header"
        ? { headers: new Headers({ "x-request-id": requestId }), body: {} }
        : {
            headers: new Headers(),
            body: { x_0g_trace: { request_id: requestId } },
          };

      const evidence = normalize(input);
      expect(evidence).toEqual(expect.objectContaining({
        status: "available",
        requestId,
      }));
      expect(Object.isFrozen(evidence)).toBe(true);
    },
  );

  it.each([
    ["transcription body", normalizeTranscriptionEvidence, "body", "transcription"],
    ["transcription header", normalizeTranscriptionEvidence, "header", "transcription"],
    ["planning body", normalizePlanningEvidence, "body", "planning"],
  ] as const)(
    "makes %s evidence unavailable above the final request-ID bound",
    (_label, normalize, location, stage) => {
      const requestId = (location === "header" ? "x" : "😀").repeat(
        MAX_PROVIDER_REQUEST_ID_CODE_POINTS + 1,
      );
      const input = location === "header"
        ? { headers: new Headers({ "x-request-id": requestId }), body: {} }
        : {
            headers: new Headers(),
            body: { x_0g_trace: { request_id: requestId } },
          };

      const evidence = normalize(input);
      expect(evidence).toEqual({ status: "unavailable", stage });
      expect(Object.isFrozen(evidence)).toBe(true);
    },
  );

  it("accepts the observed transcription x-request-id header and preserves its exact value", () => {
    expect(normalizeTranscriptionEvidence(transcriptionWithHeaderEvidence)).toEqual({
      status: "available",
      stage: "transcription",
      source: "header:x-request-id",
      requestId: TRANSCRIPTION_HEADER_REQUEST_ID,
    });
  });

  it("accepts the observed transcription trace body and preserves its exact value", () => {
    expect(normalizeTranscriptionEvidence(transcriptionWithTraceEvidence)).toEqual({
      status: "available",
      stage: "transcription",
      source: "body:x_0g_trace.request_id",
      requestId: TRANSCRIPTION_TRACE_REQUEST_ID,
    });
  });

  it("prefers the provider-specific trace body when both observed transcription locations exist", () => {
    expect(
      normalizeTranscriptionEvidence({
        headers: transcriptionWithHeaderEvidence.headers,
        body: transcriptionWithTraceEvidence.body,
      }),
    ).toEqual({
      status: "available",
      stage: "transcription",
      source: "body:x_0g_trace.request_id",
      requestId: TRANSCRIPTION_TRACE_REQUEST_ID,
    });
  });

  it("falls back to the observed transcription header when the trace value is blank", () => {
    expect(
      normalizeTranscriptionEvidence({
        headers: transcriptionWithHeaderEvidence.headers,
        body: { x_0g_trace: { request_id: "  " } },
      }),
    ).toEqual({
      status: "available",
      stage: "transcription",
      source: "header:x-request-id",
      requestId: TRANSCRIPTION_HEADER_REQUEST_ID,
    });
  });

  it("accepts only the observed planning trace body and preserves its exact value", () => {
    expect(normalizePlanningEvidence(planningWithTraceEvidence)).toEqual({
      status: "available",
      stage: "planning",
      source: "body:x_0g_trace.request_id",
      requestId: PLANNING_TRACE_REQUEST_ID,
    });
  });

  it.each([
    ["missing transcription ID", normalizeTranscriptionEvidence, { headers: new Headers(), body: {} }],
    [
      "blank transcription IDs",
      normalizeTranscriptionEvidence,
      {
        headers: new Headers({ "x-request-id": " \t " }),
        body: { x_0g_trace: { request_id: "\n" } },
      },
    ],
    ["missing planning ID", normalizePlanningEvidence, { headers: new Headers(), body: {} }],
    [
      "blank planning ID",
      normalizePlanningEvidence,
      { headers: new Headers(), body: { x_0g_trace: { request_id: "  " } } },
    ],
  ])("returns explicit unavailable evidence for %s", (_label, normalize, input) => {
    expect(normalize(input)).toEqual({
      status: "unavailable",
      stage: normalize === normalizePlanningEvidence ? "planning" : "transcription",
    });
  });

  it.each([
    ["Aaj correlation ID", { correlationId: "aaj-correlation-uuid" }],
    ["generic body ID", { id: "generic-provider-looking-id" }],
    ["timestamp", { created: 1_799_999_999 }],
    ["hash", { hash: "sha256:not-evidence" }],
    ["UUID", { uuid: "123e4567-e89b-12d3-a456-426614174000" }],
    ["model ID", { model: "0gm-1.0-35b-a3b" }],
    ["unknown nested field", { trace: { request_id: "unknown-location" } }],
    ["legacy top-level request ID", { request_id: "legacy-unobserved-location" }],
  ])("does not turn %s into transcription evidence", (_label, body) => {
    expect(normalizeTranscriptionEvidence({ headers: new Headers(), body })).toEqual({
      status: "unavailable",
      stage: "transcription",
    });
  });

  it("does not treat unobserved headers or fields as planning evidence", () => {
    expect(
      normalizePlanningEvidence({
        headers: new Headers({
          "x-request-id": "planning-header-is-not-observed",
          "x-trace-id": "legacy-candidate-is-not-evidence",
        }),
        body: {
          request_id: "legacy-top-level-is-not-evidence",
          future_request_id: "unknown-field-is-not-evidence",
        },
      }),
    ).toEqual({ status: "unavailable", stage: "planning" });
  });

  it("does not promote legacy candidate headers to transcription evidence", () => {
    expect(
      normalizeTranscriptionEvidence({
        headers: new Headers({
          "x-0g-request-id": "legacy-candidate",
          "x-trace-id": "legacy-candidate",
          "x-0g-trace-id": "legacy-candidate",
        }),
        body: {},
      }),
    ).toEqual({ status: "unavailable", stage: "transcription" });
  });

  it("rejects non-string values at allowlisted locations", () => {
    expect(
      normalizeTranscriptionEvidence({
        headers: new Headers(),
        body: { x_0g_trace: { request_id: 123 } },
      }),
    ).toEqual({ status: "unavailable", stage: "transcription" });
    expect(
      normalizePlanningEvidence({
        headers: new Headers(),
        body: { x_0g_trace: { request_id: { id: "nested" } } },
      }),
    ).toEqual({ status: "unavailable", stage: "planning" });
  });
});
