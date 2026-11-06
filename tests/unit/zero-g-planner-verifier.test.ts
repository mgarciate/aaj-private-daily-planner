import { describe, expect, it, vi } from "vitest";
import {
  FIXED_PLANNER_TRANSCRIPT,
  fingerprintPlannerRequestId,
  validatePlannerOutput,
  verifyZeroGPlanner,
} from "../../lib/server/zero-g-planner-verifier";

const validPlan = {
  priorities: [
    "Finish the project outline",
    "Reply to the two pending messages",
    "Take a 20-minute walk",
  ],
  blocker: "Unclear order for the outline sections",
  firstStep: "Open the outline and write the three section headings",
  encouragement: "Start small; one clear step is enough.",
};

function successfulResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      id: "not-provider-evidence",
      model: "0gm-1.0-35b-a3b",
      choices: [{ message: { content: JSON.stringify(validPlan) } }],
      x_0g_trace: { request_id: "provider_request_secret" },
      ...overrides,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("0G planner verifier", () => {
  it("rejects missing credentials and model before network I/O", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      verifyZeroGPlanner({ apiKey: "", model: "candidate", fetchImpl }),
    ).rejects.toThrow("ZERO_G_API_KEY is required");
    await expect(
      verifyZeroGPlanner({ apiKey: "secret", model: "", fetchImpl }),
    ).rejects.toThrow("ZERO_G_PLANNER_MODEL is required");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the fixed transcript with JSON mode, TEE verification, and private trust mode", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(successfulResponse());

    await verifyZeroGPlanner({
      apiKey: "secret",
      model: "0gm-1.0-35b-a3b",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://router-api.0g.ai/v1/chat/completions?verify_tee=true");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer secret");
    expect(new Headers(init?.headers).get("x-0g-provider-trust-mode")).toBe("private");

    const request = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(request).toMatchObject({
      model: "0gm-1.0-35b-a3b",
      response_format: { type: "json_object" },
      temperature: 0,
    });
    expect(JSON.stringify(request)).toContain(FIXED_PLANNER_TRANSCRIPT);
  });

  it("returns only the strict plan and safe request metadata", async () => {
    const result = await verifyZeroGPlanner({
      apiKey: "secret",
      model: "0gm-1.0-35b-a3b",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(successfulResponse()),
    });

    expect(result.plan).toEqual(validPlan);
    expect(result).toMatchObject({
      status: 200,
      model: "0gm-1.0-35b-a3b",
      responseFormat: "json_object",
      verifyTee: true,
      trustMode: "private",
      requestEvidence: {
        source: "body:x_0g_trace.request_id",
        fingerprint: await fingerprintPlannerRequestId("provider_request_secret"),
      },
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(result)).not.toContain("provider_request_secret");
    expect(JSON.stringify(result)).not.toContain("not-provider-evidence");
  });

  it.each([
    ["missing priorities", { blocker: "b", firstStep: "f", encouragement: "e" }],
    ["too few priorities", { ...validPlan, priorities: ["one", "two"] }],
    ["too many priorities", { ...validPlan, priorities: ["one", "two", "three", "four"] }],
    ["empty priority", { ...validPlan, priorities: ["one", " ", "three"] }],
    ["wrong priority type", { ...validPlan, priorities: ["one", 2, "three"] }],
    ["empty blocker", { ...validPlan, blocker: "" }],
    ["missing firstStep", { priorities: validPlan.priorities, blocker: "b", encouragement: "e" }],
    ["wrong encouragement type", { ...validPlan, encouragement: false }],
    ["extra field", { ...validPlan, notes: "must be rejected" }],
  ])("rejects %s", (_label, candidate) => {
    expect(() => validatePlannerOutput(candidate)).toThrow("invalid exact plan schema");
  });

  it("does not invent evidence when the documented request ID is absent", async () => {
    const response = successfulResponse({ x_0g_trace: {} });
    const result = await verifyZeroGPlanner({
      apiKey: "secret",
      model: "0gm-1.0-35b-a3b",
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
    });

    expect(result.requestEvidence).toBeNull();
  });

  it("does not expose an upstream error body", async () => {
    const privateBody = "private upstream details";
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(privateBody, { status: 429 }),
    );

    let message = "";
    try {
      await verifyZeroGPlanner({ apiKey: "secret", model: "candidate", fetchImpl });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe("0G planning failed with HTTP 429");
    expect(message).not.toContain(privateBody);
  });

  it("bounds a stalled request with a safe timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("private network error")));
      }),
    );

    await expect(
      verifyZeroGPlanner({
        apiKey: "secret",
        model: "candidate",
        fetchImpl,
        timeoutMs: 5,
      }),
    ).rejects.toThrow("0G planning timed out after 5 ms");
  });
});
