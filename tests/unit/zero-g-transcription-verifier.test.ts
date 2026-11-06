import { describe, expect, it, vi } from "vitest";
import {
  fingerprintCandidate,
  inspectResponseMetadata,
  verifyZeroGTranscription,
} from "../../lib/server/zero-g-transcription-verifier";

describe("0G transcription verifier", () => {
  it("fails before network I/O when the API key is missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      verifyZeroGTranscription({
        apiKey: "",
        audio: new Blob(["audio"], { type: "audio/wav" }),
        fileName: "fixture.wav",
        fetchImpl,
      }),
    ).rejects.toThrow("ZERO_G_API_KEY is required");

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports only safe metadata and fingerprints candidate IDs", async () => {
    const metadata = await inspectResponseMetadata(
      new Response(JSON.stringify({
        text: "private transcript",
        request_id: "req_secret_value",
        private_payload: "never-report",
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-request-id": "header_secret_value",
          "set-cookie": "never-report",
        },
      }),
    );

    expect(metadata.transcriptPresent).toBe(true);
    expect(metadata.transcriptLength).toBe(18);
    expect(metadata.safeHeaderNames).toEqual(["content-type", "x-request-id"]);
    expect(metadata.bodyKeys).toEqual(["request_id", "text"]);
    expect(metadata.candidateEvidence).toEqual([
      {
        source: "header:x-request-id",
        fingerprint: await fingerprintCandidate("header_secret_value"),
      },
      {
        source: "body:request_id",
        fingerprint: await fingerprintCandidate("req_secret_value"),
      },
    ]);
    expect(metadata.requestEvidence).toEqual({
      status: "available",
      source: "header:x-request-id",
      fingerprint: await fingerprintCandidate("header_secret_value"),
    });
    expect(JSON.stringify(metadata)).not.toContain("private transcript");
    expect(JSON.stringify(metadata)).not.toContain("header_secret_value");
    expect(JSON.stringify(metadata)).not.toContain("req_secret_value");
    expect(JSON.stringify(metadata)).not.toContain("set-cookie");
    expect(JSON.stringify(metadata)).not.toContain("private_payload");
  });

  it("never generates fallback evidence when the provider returns no candidate", async () => {
    const metadata = await inspectResponseMetadata(
      new Response(JSON.stringify({ text: "hello" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(metadata.candidateEvidence).toEqual([]);
    expect(metadata.requestEvidence).toEqual({ status: "unavailable" });
  });

  it("recognizes the documented 0G trace request ID as candidate evidence", async () => {
    const metadata = await inspectResponseMetadata(
      new Response(
        JSON.stringify({
          text: "hello",
          x_0g_trace: { request_id: "trace_secret_value", tee_verified: true },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    expect(metadata.candidateEvidence).toEqual([
      {
        source: "body:x_0g_trace.request_id",
        fingerprint: await fingerprintCandidate("trace_secret_value"),
      },
    ]);
    expect(metadata.requestEvidence).toEqual({
      status: "available",
      source: "body:x_0g_trace.request_id",
      fingerprint: await fingerprintCandidate("trace_secret_value"),
    });
    expect(JSON.stringify(metadata)).not.toContain("trace_secret_value");
  });

  it("does not promote legacy candidates into normalized request evidence", async () => {
    const metadata = await inspectResponseMetadata(
      new Response(JSON.stringify({ text: "hello", request_id: "legacy_body_value" }), {
        status: 200,
        headers: { "x-0g-request-id": "legacy_header_value" },
      }),
    );

    expect(metadata.candidateEvidence).toHaveLength(2);
    expect(metadata.requestEvidence).toEqual({ status: "unavailable" });
    expect(JSON.stringify(metadata)).not.toContain("legacy_body_value");
    expect(JSON.stringify(metadata)).not.toContain("legacy_header_value");
  });

  it("does not treat whitespace-only output as a transcript", async () => {
    const metadata = await inspectResponseMetadata(
      new Response(JSON.stringify({ text: "   " }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(metadata.transcriptPresent).toBe(false);
    expect(metadata.transcriptLength).toBe(0);
  });

  it("fails before network I/O when the fixture name is missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      verifyZeroGTranscription({
        apiKey: "test-only-key",
        audio: new Blob(["audio"], { type: "audio/wav" }),
        fileName: "",
        fetchImpl,
      }),
    ).rejects.toThrow("An explicit audio fixture path is required");

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("bounds a stalled upstream request with a safe timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );

    await expect(
      verifyZeroGTranscription({
        apiKey: "test-only-key",
        audio: new Blob(["audio"], { type: "audio/wav" }),
        fileName: "fixture.wav",
        fetchImpl,
        timeoutMs: 5,
      }),
    ).rejects.toThrow("0G transcription timed out after 5 ms");
  });
});
