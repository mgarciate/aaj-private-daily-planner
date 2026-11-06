import { describe, expect, it } from "vitest";
import {
  PLAN_TEXT_LIMITS,
  PlanValidationError,
  normalizePriorityText,
  parsePlanCandidate,
} from "../../lib/domain/plan-schema";

const validCandidate = {
  priorities: [
    "Finish the project outline",
    "Reply to the pending messages",
    "Take a 20-minute walk",
  ],
  blocker: "The outline order is unclear",
  firstStep: "Open the outline document",
  encouragement: "One clear step is enough.",
};

describe("daily plan schema", () => {
  it("trims valid provider text and assigns stable ordered priority IDs", () => {
    expect(
      parsePlanCandidate({
        priorities: ["  First  ", " Second ", " Third "],
        blocker: "  Blocker  ",
        firstStep: "  First step  ",
        encouragement: "  Keep going.  ",
      }),
    ).toEqual({
      priorities: [
        { id: "p1", text: "First" },
        { id: "p2", text: "Second" },
        { id: "p3", text: "Third" },
      ],
      blocker: "Blocker",
      firstStep: "First step",
      encouragement: "Keep going.",
    });
  });

  it.each([
    ["a missing priorities field", { ...validCandidate, priorities: undefined }],
    ["fewer priorities", { ...validCandidate, priorities: ["one", "two"] }],
    ["a fourth priority", { ...validCandidate, priorities: ["one", "two", "three", "four"] }],
    ["a missing blocker", { priorities: validCandidate.priorities, firstStep: "step", encouragement: "go" }],
    ["an extra top-level field", { ...validCandidate, notes: "do not drop this silently" }],
  ])("rejects %s", (_label, candidate) => {
    expect(() => parsePlanCandidate(candidate)).toThrow(PlanValidationError);
  });

  it.each([
    ["the candidate", null],
    ["priorities", { ...validCandidate, priorities: "not an array" }],
    ["a priority", { ...validCandidate, priorities: ["one", 2, "three"] }],
    ["blocker", { ...validCandidate, blocker: false }],
    ["firstStep", { ...validCandidate, firstStep: { text: "step" } }],
    ["encouragement", { ...validCandidate, encouragement: ["go"] }],
  ])("rejects the wrong type for %s", (_label, candidate) => {
    expect(() => parsePlanCandidate(candidate)).toThrow(PlanValidationError);
  });

  it.each([
    ["priority", { ...validCandidate, priorities: ["one", " \n\t ", "three"] }],
    ["blocker", { ...validCandidate, blocker: "  " }],
    ["firstStep", { ...validCandidate, firstStep: "\n" }],
    ["encouragement", { ...validCandidate, encouragement: "\t" }],
  ])("rejects an empty or whitespace-only %s", (_label, candidate) => {
    expect(() => parsePlanCandidate(candidate)).toThrow(PlanValidationError);
  });

  it.each([
    ["priority", { ...validCandidate, priorities: ["one", "\u200b\u2060", "three"] }],
    ["blocker", { ...validCandidate, blocker: " \u200b\u2060 " }],
    ["firstStep", { ...validCandidate, firstStep: "\u200b" }],
    ["encouragement", { ...validCandidate, encouragement: "\u2060" }],
  ])("rejects a default-ignorable-only %s", (_label, candidate) => {
    expect(() => parsePlanCandidate(candidate)).toThrow(PlanValidationError);
  });

  it.each([
    ["priority", { ...validCandidate, priorities: ["one", "two\u0000", "three"] }],
    ["blocker", { ...validCandidate, blocker: "blocked\u0085" }],
    ["firstStep", { ...validCandidate, firstStep: "open\nfile" }],
    ["encouragement", { ...validCandidate, encouragement: "go\t" }],
  ])("rejects C0/C1 controls in %s", (_label, candidate) => {
    expect(() => parsePlanCandidate(candidate)).toThrow(PlanValidationError);
  });

  it.each([
    ["case and surrounding whitespace", ["Call Sam", " call sam ", "Walk"]],
    ["Unicode normalization and case", ["Café", "CAFE\u0301", "Walk"]],
    ["visible versus zero-width word separation", ["Call Sam", "Call\u200bSam", "Walk"]],
    ["inserted default-ignorable text", ["CallSam", "CallS\u200bam", "Walk"]],
  ])("rejects duplicate priorities after %s normalization", (_label, priorities) => {
    expect(() => parsePlanCandidate({ ...validCandidate, priorities })).toThrow(
      PlanValidationError,
    );
  });

  it("preserves meaningful emoji composition in duplicate comparison", () => {
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: ["Plan 👩‍💻 session", "Plan 👩💻 session", "Review ✈ route"],
      }),
    ).not.toThrow();
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: ["Review ✈️ route", "Review ✈ route", "Walk"],
      }),
    ).not.toThrow();
  });

  it.each([
    ["emoji modifier", "Plan 👩🏽‍💻 session", "Plan 👩🏽💻 session"],
    ["variation selector", "Recover ❤️‍🔥 energy", "Recover ❤️🔥 energy"],
  ])("preserves a ZWJ after an emoji %s", (_label, joined, unjoined) => {
    expect(normalizePriorityText(joined)).not.toBe(normalizePriorityText(unjoined));
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [joined, unjoined, "Walk"],
      }),
    ).not.toThrow();
  });

  it("ignores a ZWJ whose right side is not an immediate pictographic base", () => {
    const malformedJoined = "Plan 👩\u200d\ufe0f💻 session";
    const unjoined = "Plan 👩💻 session";

    expect(normalizePriorityText(malformedJoined)).toBe(normalizePriorityText(unjoined));
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [malformedJoined, unjoined, "Walk"],
      }),
    ).toThrow(PlanValidationError);
  });

  it.each([
    ["England", "\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}"],
    ["Scotland", "\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}"],
    ["Wales", "\u{e0067}\u{e0062}\u{e0077}\u{e006c}\u{e0073}\u{e007f}"],
  ])("preserves the RGI subdivision flag for %s in duplicate keys", (_label, tags) => {
    const blackFlag = "\u{1f3f4}";
    const subdivisionFlag = `${blackFlag}${tags}`;

    expect(normalizePriorityText(subdivisionFlag)).not.toBe(normalizePriorityText(blackFlag));
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [`Visit ${subdivisionFlag}`, `Visit ${blackFlag}`, "Walk"],
      }),
    ).not.toThrow();
  });

  it.each([
    ["a non-flag pictograph", "\u{1f469}\u{e0078}\u{e007f}", "\u{1f469}"],
    ["a tag space", "\u{1f3f4}\u{e0020}\u{e007f}", "\u{1f3f4}"],
    [
      "uppercase TAG GBENG",
      "\u{1f3f4}\u{e0047}\u{e0042}\u{e0045}\u{e004e}\u{e0047}\u{e007f}",
      "\u{1f3f4}",
    ],
    [
      "an arbitrary lowercase black-flag tag",
      "\u{1f3f4}\u{e0067}\u{e0062}\u{e0078}\u{e0078}\u{e0078}\u{e007f}",
      "\u{1f3f4}",
    ],
  ])("ignores %s even when terminated", (_label, tagged, base) => {
    expect(normalizePriorityText(tagged)).toBe(normalizePriorityText(base));
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [`Visit ${tagged}`, `Visit ${base}`, "Walk"],
      }),
    ).toThrow(PlanValidationError);
  });

  it("ignores incomplete and unattached emoji tag code points", () => {
    const blackFlag = "\u{1f3f4}";
    const unterminatedEnglandFlag = `${blackFlag}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}`;
    const unattachedTagSequence = "\u{e0067}\u{e007f}";

    expect(normalizePriorityText(unterminatedEnglandFlag)).toBe(
      normalizePriorityText(blackFlag),
    );
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [unterminatedEnglandFlag, blackFlag, "Walk"],
      }),
    ).toThrow(PlanValidationError);
    expect(() =>
      parsePlanCandidate({ ...validCandidate, blocker: unattachedTagSequence }),
    ).toThrow(PlanValidationError);
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [`Call${unattachedTagSequence}Sam`, "CallSam", "Walk"],
      }),
    ).toThrow(PlanValidationError);
  });

  it("uses lowercase comparison rather than full Unicode case folding", () => {
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: ["Straße", "STRASSE", "Walk"],
      }),
    ).not.toThrow();
  });

  it("counts Unicode code points rather than UTF-16 code units", () => {
    const maxPriority = "😀".repeat(PLAN_TEXT_LIMITS.priority);

    expect(
      parsePlanCandidate({
        ...validCandidate,
        priorities: [maxPriority, "second", "third"],
      }).priorities[0].text,
    ).toBe(maxPriority);
    expect(() =>
      parsePlanCandidate({
        ...validCandidate,
        priorities: [`${maxPriority}😀`, "second", "third"],
      }),
    ).toThrow(PlanValidationError);
  });

  it.each([
    ["priority", "priority", 160],
    ["blocker", "blocker", 200],
    ["firstStep", "firstStep", 160],
    ["encouragement", "encouragement", 140],
  ] as const)("enforces the final %s limit after trimming", (_label, field, limit) => {
    const accepted = ` ${"x".repeat(limit)} `;
    const rejected = ` ${"x".repeat(limit + 1)} `;

    const acceptedCandidate = field === "priority"
      ? { ...validCandidate, priorities: [accepted, "second", "third"] }
      : { ...validCandidate, [field]: accepted };
    const rejectedCandidate = field === "priority"
      ? { ...validCandidate, priorities: [rejected, "second", "third"] }
      : { ...validCandidate, [field]: rejected };

    expect(() => parsePlanCandidate(acceptedCandidate)).not.toThrow();
    expect(() => parsePlanCandidate(rejectedCandidate)).toThrow(PlanValidationError);
  });
});
