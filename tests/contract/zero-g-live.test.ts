// @vitest-environment node

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyZeroGTranscription } from "../../lib/server/zero-g-transcription-verifier";

const apiKey = process.env.ZERO_G_API_KEY?.trim();
const fixturePath = process.env.ZERO_G_AUDIO_FIXTURE?.trim();
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
  it("transcribes a non-sensitive fixture and returns candidate request evidence", async () => {
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
    expect(result.candidateEvidence.length).toBeGreaterThan(0);
  }, 120_000);
});
