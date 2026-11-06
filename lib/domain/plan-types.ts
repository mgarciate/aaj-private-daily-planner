export type PriorityId = "p1" | "p2" | "p3";

export type Priority = {
  id: PriorityId;
  text: string;
};

export type Plan = {
  priorities: [
    { id: "p1"; text: string },
    { id: "p2"; text: string },
    { id: "p3"; text: string },
  ];
  blocker: string;
  firstStep: string;
  encouragement: string;
};

/** The exact JSON object requested from and returned by the planner provider. */
export type ProviderPlanCandidate = {
  priorities: [string, string, string];
  blocker: string;
  firstStep: string;
  encouragement: string;
};
