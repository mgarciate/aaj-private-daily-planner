import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { verifyZeroGTranscription } from "../lib/server/zero-g-transcription-verifier";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
};

async function main(): Promise<void> {
  const apiKey = process.env.ZERO_G_API_KEY?.trim() ?? "";
  const fixturePath = process.argv[2]?.trim() || process.env.ZERO_G_AUDIO_FIXTURE?.trim() || "";

  if (!apiKey) throw new Error("ZERO_G_API_KEY is required");
  if (!fixturePath) throw new Error("Provide a non-sensitive fixture path as an argument or ZERO_G_AUDIO_FIXTURE");

  const extension = extname(fixturePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) throw new Error(`Unsupported fixture extension: ${extension || "none"}`);

  let bytes: Buffer;
  try {
    bytes = await readFile(fixturePath);
  } catch {
    throw new Error("Unable to read the configured audio fixture");
  }
  const result = await verifyZeroGTranscription({
    apiKey,
    audio: new Blob([new Uint8Array(bytes)], { type: mimeType }),
    fileName: `fixture${extension}`,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Verification failed before a safe result was available";
  console.error(`0G verification failed: ${message}`);
  process.exitCode = 1;
});
