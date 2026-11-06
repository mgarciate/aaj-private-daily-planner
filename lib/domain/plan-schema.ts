import type { Plan, ProviderPlanCandidate } from "./plan-types";

export const PLAN_TEXT_LIMITS = Object.freeze({
  priority: 160,
  blocker: 200,
  firstStep: 160,
  encouragement: 140,
});

type PlanValidationPath =
  | "plan"
  | "priorities"
  | `priorities.${number}`
  | "blocker"
  | "firstStep"
  | "encouragement";

export class PlanValidationError extends Error {
  readonly code = "INVALID_PLAN" as const;

  constructor(
    message: string,
    readonly path: PlanValidationPath,
  ) {
    super(message);
    this.name = "PlanValidationError";
  }
}

const EXPECTED_KEYS = [
  "blocker",
  "encouragement",
  "firstStep",
  "priorities",
] as const;

function invalid(path: PlanValidationPath, message: string): never {
  throw new PlanValidationError(message, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseText(
  value: unknown,
  path: PlanValidationPath,
  maximumCodePoints: number,
): string {
  if (typeof value !== "string") invalid(path, `${path} must be a string`);

  const text = value.trim();
  const codePointLength = Array.from(text).length;
  if (codePointLength === 0) invalid(path, `${path} must not be empty`);
  if (codePointLength > maximumCodePoints) {
    invalid(path, `${path} must be at most ${maximumCodePoints} Unicode code points`);
  }
  return text;
}

/**
 * Produces the deterministic duplicate-comparison key: trim, normalize to
 * Unicode NFKC, then apply locale-independent Unicode lowercase conversion.
 */
export function normalizePriorityText(text: string): string {
  return text.trim().normalize("NFKC").toLowerCase();
}

/**
 * Validates the provider's exact candidate object and converts it to the Aaj
 * domain shape. Invalid provider content fails closed; nothing is dropped,
 * combined, repaired, or invented.
 */
export function parsePlanCandidate(candidate: unknown): Plan {
  if (!isRecord(candidate)) invalid("plan", "plan must be an object");

  const keys = Object.keys(candidate).sort();
  if (
    keys.length !== EXPECTED_KEYS.length ||
    keys.some((key, index) => key !== EXPECTED_KEYS[index])
  ) {
    invalid("plan", "plan must contain exactly the expected fields");
  }

  const priorities = candidate.priorities;
  if (!Array.isArray(priorities)) {
    invalid("priorities", "priorities must be an array");
  }
  if (priorities.length !== 3) {
    invalid("priorities", "priorities must contain exactly three items");
  }

  const first = parseText(priorities[0], "priorities.0", PLAN_TEXT_LIMITS.priority);
  const second = parseText(priorities[1], "priorities.1", PLAN_TEXT_LIMITS.priority);
  const third = parseText(priorities[2], "priorities.2", PLAN_TEXT_LIMITS.priority);
  const priorityTexts: ProviderPlanCandidate["priorities"] = [first, second, third];
  const duplicateKeys = priorityTexts.map(normalizePriorityText);
  if (new Set(duplicateKeys).size !== duplicateKeys.length) {
    invalid("priorities", "priorities must not contain duplicate normalized text");
  }

  return {
    priorities: [
      { id: "p1", text: first },
      { id: "p2", text: second },
      { id: "p3", text: third },
    ],
    blocker: parseText(candidate.blocker, "blocker", PLAN_TEXT_LIMITS.blocker),
    firstStep: parseText(candidate.firstStep, "firstStep", PLAN_TEXT_LIMITS.firstStep),
    encouragement: parseText(
      candidate.encouragement,
      "encouragement",
      PLAN_TEXT_LIMITS.encouragement,
    ),
  };
}
