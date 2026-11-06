// @vitest-environment node

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyZeroGPlanner } from "../../lib/server/zero-g-planner-verifier";
import { verifyZeroGTranscription } from "../../lib/server/zero-g-transcription-verifier";

const apiKey = process.env.ZERO_G_API_KEY?.trim();
const fixturePath = process.env.ZERO_G_AUDIO_FIXTURE?.trim();
const plannerModel = process.env.ZERO_G_PLANNER_MODEL?.trim();
const liveEnabled = process.env.RUN_0G_LIVE_TESTS === "1";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
};

const describeLive = liveEnabled ? describe : describe.skip;

describeLive("live 0G transcription contract", () => {
  it("transcribes a non-sensitive fixture and returns allowlisted request evidence", async () => {
    expect(apiKey, "ZERO_G_API_KEY is required when RUN_0G_LIVE_TESTS=1").toBeTruthy();
    expect(
      fixturePath,
      "ZERO_G_AUDIO_FIXTURE is required when RUN_0G_LIVE_TESTS=1",
    ).toBeTruthy();

    const path = fixturePath as string;
    const extension = extname(path).toLowerCase();
    const mimeType = MIME_BY_EXTENSION[extension];
    expect(mimeType, `Unsupported live fixture extension: ${extension}`).toBeTruthy();

    const bytes = await readFile(path);
    const result = await verifyZeroGTranscription({
      apiKey: apiKey as string,
      audio: new Blob([new Uint8Array(bytes)], { type: mimeType }),
      fileName: `fixture${extension}`,
    });

    expect(result.status).toBe(200);
    expect(result.model).toBe("whisper-large-v3");
    expect(result.transcriptPresent).toBe(true);
    expect(result.transcriptLength).toBeGreaterThan(0);
    expect(result.requestEvidence.status).toBe("available");
    if (result.requestEvidence.status !== "available") {
      throw new Error("Expected normalized transcription request evidence");
    }
    expect([
      "header:x-request-id",
      "body:x_0g_trace.request_id",
    ]).toContain(result.requestEvidence.source);
    expect(result.requestEvidence.fingerprint).toMatch(/^sha256:[a-f0-9]{16}$/);
  }, 120_000);
});

describeLive("live 0G planner contract", () => {
  it("returns the exact plan schema and distinct authentic evidence twice", async () => {
    expect(apiKey, "ZERO_G_API_KEY is required when RUN_0G_LIVE_TESTS=1").toBeTruthy();
    expect(
      plannerModel,
      "ZERO_G_PLANNER_MODEL is required when RUN_0G_LIVE_TESTS=1",
    ).toBe("0gm-1.0-35b-a3b");

    const results = [];
    for (let run = 0; run < 2; run += 1) {
      const result = await verifyZeroGPlanner({
        apiKey: apiKey as string,
        model: plannerModel as string,
      });

      expect(result.status).toBe(200);
      expect(result.model).toBe("0gm-1.0-35b-a3b");
      expect(result.responseFormat).toBe("json_object");
      expect(result.verifyTee).toBe(true);
      expect(result.trustMode).toBe("private");
      expect(result.plan.priorities).toHaveLength(3);
      expect(result.plan.priorities.every((value) => value.trim().length > 0)).toBe(true);
      expect(result.plan.blocker.trim().length).toBeGreaterThan(0);
      expect(result.plan.firstStep.trim().length).toBeGreaterThan(0);
      expect(result.plan.encouragement.trim().length).toBeGreaterThan(0);
      expect(result.requestEvidence?.source).toBe("body:x_0g_trace.request_id");
      expect(result.requestEvidence?.fingerprint).toMatch(/^sha256:[a-f0-9]{16}$/);
      results.push(result);
    }

    expect(results[0].requestEvidence?.fingerprint).not.toBe(
      results[1].requestEvidence?.fingerprint,
    );
  }, 250_000);
});
