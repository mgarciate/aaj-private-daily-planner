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

const C0_OR_C1_CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const DEFAULT_IGNORABLE = new RegExp("\\p{Default_Ignorable_Code_Point}", "u");
const EXTENDED_PICTOGRAPHIC = new RegExp("\\p{Extended_Pictographic}", "u");
const EMOJI_MODIFIER = new RegExp("\\p{Emoji_Modifier}", "u");
const WHITE_SPACE = new RegExp("\\p{White_Space}", "gu");
const EMOJI_VARIATION_SELECTORS = new Set(["\ufe0e", "\ufe0f"]);
const BLACK_FLAG = "\u{1f3f4}";
const RGI_SUBDIVISION_FLAG_TAG_SEQUENCES = [
  Array.from("\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}"), // gbeng
  Array.from("\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}"), // gbsct
  Array.from("\u{e0067}\u{e0062}\u{e0077}\u{e006c}\u{e0073}\u{e007f}"), // gbwls
] as const;

function invalid(path: PlanValidationPath, message: string): never {
  throw new PlanValidationError(message, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmojiSequenceDecoration(codePoint: string): boolean {
  return EMOJI_MODIFIER.test(codePoint) || EMOJI_VARIATION_SELECTORS.has(codePoint);
}

function hasExtendedPictographicBaseBefore(
  codePoints: string[],
  startIndex: number,
): boolean {
  for (let index = startIndex; index >= 0; index -= 1) {
    const codePoint = codePoints[index];
    if (EXTENDED_PICTOGRAPHIC.test(codePoint)) return true;
    if (!isEmojiSequenceDecoration(codePoint)) return false;
  }
  return false;
}

/** Returns only indexes belonging to exact, currently recognized RGI subdivision flags. */
function findValidSubdivisionFlagTagCodePoints(codePoints: string[]): Set<number> {
  const validIndexes = new Set<number>();

  for (let baseIndex = 0; baseIndex < codePoints.length; baseIndex += 1) {
    if (codePoints[baseIndex] !== BLACK_FLAG) continue;

    for (const tagSequence of RGI_SUBDIVISION_FLAG_TAG_SEQUENCES) {
      const matches = tagSequence.every(
        (codePoint, offset) => codePoints[baseIndex + 1 + offset] === codePoint,
      );
      if (matches) {
        for (let offset = 0; offset < tagSequence.length; offset += 1) {
          validIndexes.add(baseIndex + 1 + offset);
        }
        baseIndex += tagSequence.length;
        break;
      }
    }
  }

  return validIndexes;
}

/**
 * Removes format code points that do not contribute visible content while
 * retaining emoji presentation and composition that changes what is shown.
 */
function visibleTextKey(text: string): string {
  const codePoints = Array.from(text);
  const validSubdivisionFlagTagCodePoints = findValidSubdivisionFlagTagCodePoints(codePoints);
  return codePoints
    .filter((codePoint, index) => {
      if (!DEFAULT_IGNORABLE.test(codePoint)) return true;

      if (validSubdivisionFlagTagCodePoints.has(index)) return true;

      if (codePoint === "\u200d") {
        return hasExtendedPictographicBaseBefore(codePoints, index - 1) &&
          index + 1 < codePoints.length &&
          EXTENDED_PICTOGRAPHIC.test(codePoints[index + 1]);
      }
      const previous = codePoints[index - 1];
      return EMOJI_VARIATION_SELECTORS.has(codePoint) &&
        previous !== undefined &&
        EXTENDED_PICTOGRAPHIC.test(previous);
    })
    .join("")
    .trim();
}

function parseText(
  value: unknown,
  path: PlanValidationPath,
  maximumCodePoints: number,
): string {
  if (typeof value !== "string") invalid(path, `${path} must be a string`);
  if (C0_OR_C1_CONTROL.test(value)) {
    invalid(path, `${path} must not contain C0 or C1 control characters`);
  }

  const text = value.trim();
  const codePointLength = Array.from(text).length;
  if (visibleTextKey(text).length === 0) invalid(path, `${path} must not be empty`);
  if (codePointLength > maximumCodePoints) {
    invalid(path, `${path} must be at most ${maximumCodePoints} Unicode code points`);
  }
  return text;
}

/**
 * Produces the deterministic duplicate-comparison key: trim, normalize to
 * Unicode NFKC, remove non-visible default-ignorable format code points (but
 * retain meaningful emoji ZWJ/variation sequences), remove whitespace to make
 * the anti-spoof comparison insensitive to visible versus zero-width word
 * separation, then apply JavaScript's locale-independent Unicode lowercase
 * conversion. This is deliberately not full Unicode case folding.
 */
export function normalizePriorityText(text: string): string {
  return visibleTextKey(text.trim().normalize("NFKC"))
    .replace(WHITE_SPACE, "")
    .toLowerCase();
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
