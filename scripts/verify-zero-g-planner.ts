import { verifyZeroGPlanner } from "../lib/server/zero-g-planner-verifier";

async function main(): Promise<void> {
  const apiKey = process.env.ZERO_G_API_KEY?.trim() ?? "";
  const model = process.env.ZERO_G_PLANNER_MODEL?.trim() ?? "";

  if (!apiKey) throw new Error("ZERO_G_API_KEY is required");
  if (!model) throw new Error("ZERO_G_PLANNER_MODEL is required");

  const result = await verifyZeroGPlanner({ apiKey, model });
  const safeObservation = {
    status: result.status,
    durationMs: result.durationMs,
    model: result.model,
    responseFormat: result.responseFormat,
    verifyTee: result.verifyTee,
    trustMode: result.trustMode,
    schemaValid: true,
    priorityCount: result.plan.priorities.length,
    requestEvidence: result.requestEvidence,
  };

  console.log(JSON.stringify(safeObservation, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Planner verification failed before a safe result was available";
  console.error(`0G planner verification failed: ${message}`);
  process.exitCode = 1;
});
