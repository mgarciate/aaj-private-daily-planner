import { describe, expect, it } from "vitest";
import {
  VERIFIED_PLANNER_MODEL,
  loadServerConfig,
} from "../../lib/server/config";
import {
  AajError,
  PUBLIC_ERROR_CODES,
  mapErrorToPublicResponse,
} from "../../lib/server/errors";

const SECRET = "private-provider-key";

describe("server inference configuration", () => {
  it("loads real mode by default with the verified planner model", () => {
    const config = loadServerConfig({
      ZERO_G_API_KEY: `  ${SECRET}  `,
      ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
    });

    expect(config.mode).toBe("real");
    if (config.mode !== "real") throw new Error("expected real config");
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
    expect(loadServerConfig({ AAJ_DEMO_MODE: "true" })).toEqual({ mode: "demo" });
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

  it("does not enumerate or serialize the provider key", () => {
    const config = loadServerConfig({
      AAJ_DEMO_MODE: "false",
      ZERO_G_API_KEY: SECRET,
      ZERO_G_PLANNER_MODEL: VERIFIED_PLANNER_MODEL,
    });

    expect(Object.values(config)).not.toContain(SECRET);
    expect(JSON.stringify(config)).not.toContain(SECRET);
    expect(JSON.stringify(config)).toBe(
      '{"mode":"real","plannerModel":"0gm-1.0-35b-a3b"}',
    );
  });
});

describe("safe public errors", () => {
  const mappings = [
    ["INVALID_AUDIO", 400, false],
    ["AUDIO_TOO_LARGE", 413, false],
    ["AUDIO_TOO_LONG", 400, false],
    ["CONFIGURATION_ERROR", 500, false],
    ["TRANSCRIPTION_FAILED", 502, true],
    ["PLANNING_FAILED", 502, true],
    ["INVALID_MODEL_OUTPUT", 502, true],
    ["UPSTREAM_TIMEOUT", 504, true],
    ["RATE_LIMITED", 429, true],
    ["INTERNAL_ERROR", 500, false],
  ] as const;

  it("defines every specified public error code exactly once", () => {
    expect(PUBLIC_ERROR_CODES).toEqual(mappings.map(([code]) => code));
    expect(new Set(PUBLIC_ERROR_CODES).size).toBe(PUBLIC_ERROR_CODES.length);
  });

  it.each(mappings)("maps %s deterministically", (code, status, retryable) => {
    const mapped = mapErrorToPublicResponse(
      new AajError(code),
      "aaj-correlation-id",
    );

    expect(mapped.status).toBe(status);
    expect(mapped.body.error).toEqual({
      code,
      message: expect.any(String),
      retryable,
      correlationId: "aaj-correlation-id",
    });
    expect(mapped.body.error.message.trim()).not.toBe("");
  });

  it("redacts private upstream error details", () => {
    const privateDetails =
      "Bearer " +
      "private-provider-key; prompt=secret; transcript=private; upstream body";
    const mapped = mapErrorToPublicResponse(
      new AajError("TRANSCRIPTION_FAILED", {
        cause: new Error(privateDetails),
      }),
      "aaj-correlation-id",
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
    const mapped = mapErrorToPublicResponse(
      new Error(`unexpected ${SECRET}`),
      "aaj-correlation-id",
    );

    expect(mapped).toEqual({
      status: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
          retryable: false,
          correlationId: "aaj-correlation-id",
        },
      },
    });
    expect(JSON.stringify(mapped)).not.toContain(SECRET);
  });
});
