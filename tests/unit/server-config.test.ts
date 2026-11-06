import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import {
  FIXED_TRANSCRIPTION_MODEL,
  VERIFIED_PLANNER_MODEL,
} from "../../lib/inference-models";
import { loadServerConfig } from "../../lib/server/config";
import {
  AajError,
  PUBLIC_ERROR_CODES,
  PUBLIC_ERROR_DEFINITIONS,
  createCorrelationId,
  mapErrorToPublicResponse,
  type CorrelationId,
  type PublicErrorCode,
} from "../../lib/server/errors";

const SECRET = "private-provider-key";
const CORRELATION_ID_PATTERN = /^aaj_[0-9a-f]{32}$/;

function realConfig() {
  return loadServerConfig({
    AAJ_DEMO_MODE: "false",
    ZERO_G_API_KEY: SECRET,
    ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
  });
}

describe("server inference configuration", () => {
  it("loads real mode by default with the fixed transcription and verified planner models", () => {
    const config = loadServerConfig({
      ZERO_G_API_KEY: `  ${SECRET}  `,
      ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
    });

    expect(config.mode).toBe("real");
    if (config.mode !== "real") throw new Error("expected real config");
    expect(FIXED_TRANSCRIPTION_MODEL).toBe("whisper-large-v3");
    expect(config.transcriptionModel).toBe("whisper-large-v3");
    expect(config.plannerModel).toBe("0gm-1.0-35b-a3b");
    expect(config.getZeroGApiKey()).toBe(SECRET);
  });

  it.each([undefined, "", "   \t\n"])(
    "rejects a missing or blank real-mode key (%s)",
    (apiKey) => {
      expect(() =>
        loadServerConfig({
          ZERO_G_API_KEY: apiKey,
          ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
        }),
      ).toThrowError(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    },
  );

  it("loads demo mode only when explicitly enabled", () => {
    expect(loadServerConfig({ AAJ_DEMO_MODE: "true" })).toEqual({
      mode: "demo",
      transcriptionModel: null,
      plannerModel: null,
    });
  });

  it.each(["TRUE", "1", "yes", " false "])(
    "rejects undocumented demo mode value %s",
    (value) => {
      expect(() =>
        loadServerConfig({
          AAJ_DEMO_MODE: value,
          ZERO_G_API_KEY: SECRET,
          ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
        }),
      ).toThrowError(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    },
  );

  it.each([undefined, "", "0gm-1.0", " 0gm-1.0-35b-a3b "])(
    "rejects an absent or unverified planner model (%s)",
    (model) => {
      expect(() =>
        loadServerConfig({
          ZERO_G_API_KEY: SECRET,
          ZERO_G_PLANNER_MODEL: model,
        }),
      ).toThrowError(expect.objectContaining({ code: "CONFIGURATION_ERROR" }));
    },
  );

  it("never falls back to demo mode when real configuration is invalid", () => {
    expect(() => loadServerConfig({})).toThrowError(
      expect.objectContaining({ code: "CONFIGURATION_ERROR" }),
    );
  });

  it("keeps the provider key behind only the explicit server accessor", () => {
    const config = realConfig();
    if (config.mode !== "real") throw new Error("expected real config");

    const spread = { ...config };
    const ownReflection = {
      keys: Reflect.ownKeys(config),
      descriptors: Object.getOwnPropertyDescriptors(config),
    };
    const representations = [
      Object.values(config),
      spread,
      ownReflection,
      inspect(config),
      inspect(config, { showHidden: true, depth: null }),
    ];

    for (const representation of representations) {
      expect(inspect(representation, { showHidden: true, depth: null })).not.toContain(
        SECRET,
      );
    }
    expect(JSON.stringify(config)).toBe(
      '{"mode":"real","transcriptionModel":"whisper-large-v3","plannerModel":"0gm-1.0-35b-a3b"}',
    );
    expect(config.getZeroGApiKey()).toBe(SECRET);
  });
});

describe("safe public errors", () => {
  const mappings = [
    ["INVALID_AUDIO", 400, false, "Choose a supported audio file and try again."],
    ["AUDIO_TOO_LARGE", 413, false, "The audio file is too large."],
    ["AUDIO_TOO_LONG", 400, false, "The audio recording is too long."],
    ["CONFIGURATION_ERROR", 500, false, "The service is not configured correctly."],
    ["TRANSCRIPTION_FAILED", 502, true, "We could not transcribe the audio. Please try again."],
    ["PLANNING_FAILED", 502, true, "We could not create the plan. Please try again."],
    ["INVALID_MODEL_OUTPUT", 502, true, "The plan response was invalid. Please try again."],
    ["UPSTREAM_TIMEOUT", 504, true, "The inference service took too long to respond. Please try again."],
    ["RATE_LIMITED", 429, true, "Too many requests. Please try again later."],
    ["INTERNAL_ERROR", 500, false, "Something went wrong. Please try again."],
  ] as const;

  it("defines every specified public error code exactly once", () => {
    expect(PUBLIC_ERROR_CODES).toEqual(mappings.map(([code]) => code));
    expect(new Set(PUBLIC_ERROR_CODES).size).toBe(PUBLIC_ERROR_CODES.length);
    expect(PUBLIC_ERROR_DEFINITIONS).toEqual(
      Object.fromEntries(
        mappings.map(([code, status, retryable, message]) => [
          code,
          { code, status, retryable, message },
        ]),
      ),
    );
    expect(Object.isFrozen(PUBLIC_ERROR_DEFINITIONS)).toBe(true);
    expect(Object.values(PUBLIC_ERROR_DEFINITIONS).every(Object.isFrozen)).toBe(true);
  });

  it.each(mappings)("maps %s deterministically", (code, status, retryable, message) => {
    const privateDetails = `${SECRET}; prompt=secret; transcript=private; Bearer token`;
    const correlationId = createCorrelationId();
    const mapped = mapErrorToPublicResponse(
      new AajError(code, { cause: new Error(privateDetails) }),
      correlationId,
    );

    expect(mapped.status).toBe(status);
    expect(mapped.body.error).toEqual({
      code,
      message,
      retryable,
      correlationId,
    });
    expect(mapped.body.error.message).not.toContain(privateDetails);
  });

  it("makes an AajError code runtime-immutable", () => {
    const error = new AajError("INVALID_AUDIO");

    expect(() => {
      (error as unknown as { code: string }).code = "INTERNAL_ERROR";
    }).toThrow(TypeError);
    expect(() => {
      Object.defineProperty(error, "code", { value: "constructor" });
    }).toThrow(TypeError);
    expect(error.code).toBe("INVALID_AUDIO");
  });

  it.each(["toString", "constructor", "__proto__", "NOT_A_CODE"])(
    "rejects forged own code %s",
    (forgedCode) => {
      const forged = new AajError(forgedCode as PublicErrorCode);
      expect(mapErrorToPublicResponse(forged).body.error.code).toBe("INTERNAL_ERROR");
    },
  );

  it("rejects inherited codes even on an AajError-prototype object", () => {
    const inherited = Object.create(new AajError("INVALID_AUDIO")) as AajError;

    expect(Object.hasOwn(inherited, "code")).toBe(false);
    expect(mapErrorToPublicResponse(inherited).body.error.code).toBe("INTERNAL_ERROR");
  });

  it("freezes the complete returned public response graph", () => {
    const mapped = mapErrorToPublicResponse(new AajError("INVALID_AUDIO"));
    const stableMessage = mapped.body.error.message;

    expect(Object.isFrozen(mapped)).toBe(true);
    expect(Object.isFrozen(mapped.body)).toBe(true);
    expect(Object.isFrozen(mapped.body.error)).toBe(true);
    expect(() => {
      (mapped.body.error as unknown as { message: string }).message = SECRET;
    }).toThrow(TypeError);
    expect(mapped.body.error.message).toBe(stableMessage);
  });

  it("generates closed, cryptographically random correlation IDs", () => {
    const first = createCorrelationId();
    const second = createCorrelationId();

    expect(first).toMatch(CORRELATION_ID_PATTERN);
    expect(second).toMatch(CORRELATION_ID_PATTERN);
    expect(second).not.toBe(first);
  });

  it("replaces runtime-invalid correlation IDs instead of reflecting input", () => {
    const privateInput = `provider-request-${SECRET}`;
    const mapped = mapErrorToPublicResponse(
      new Error(`unexpected ${SECRET}`),
      privateInput as CorrelationId,
    );
    const serialized = JSON.stringify(mapped);

    expect(mapped.body.error.correlationId).toMatch(CORRELATION_ID_PATTERN);
    expect(mapped.body.error.correlationId).not.toBe(privateInput);
    expect(serialized).not.toContain(privateInput);
    expect(serialized).not.toContain(SECRET);
  });

  it("redacts private upstream error details", () => {
    const privateDetails =
      "Bearer " +
      "private-provider-key; prompt=secret; transcript=private; upstream body";
    const mapped = mapErrorToPublicResponse(
      new AajError("TRANSCRIPTION_FAILED", {
        cause: new Error(privateDetails),
      }),
    );
    const serialized = JSON.stringify(mapped);

    expect(serialized).not.toContain(privateDetails);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain("prompt");
    expect(serialized).not.toContain("transcript");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("stack");
  });

  it("maps unknown failures to a stable internal error without raw messages", () => {
    const mapped = mapErrorToPublicResponse(new Error(`unexpected ${SECRET}`));

    expect(mapped.status).toBe(500);
    expect(mapped.body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      retryable: false,
      correlationId: expect.stringMatching(CORRELATION_ID_PATTERN),
    });
    expect(JSON.stringify(mapped)).not.toContain(SECRET);
  });
});
