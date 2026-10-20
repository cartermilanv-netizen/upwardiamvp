import type { ReviewStatus } from "../types";
import type { ComparisonKind, FieldClass, FieldSnapshot, FieldWrite, Proposal } from "./types";

export type WriteDecision = {
  effect: "held" | "refused" | "rejected" | "not_proposed";
  reason: string;
  catalogWritten: false;
  programClosed: false;
};

const HELD: readonly FieldClass[] = ["eligibility", "income", "deadline", "application_rule"];

/**
 * The checker never writes a field. Verified fields are refused.
 * Eligibility, income, deadlines, and application rules stay pending human approval.
 * A failed fetch is not a closure.
 */
export function decideWrite(input: {
  comparisonKind: ComparisonKind;
  proposal: Proposal;
  fetchedText: string | null;
  targetReviewStatus: ReviewStatus;
  fieldClass: FieldClass;
}): WriteDecision {
  const stopped = { catalogWritten: false as const, programClosed: false as const };
  if (input.comparisonKind === "fetch_failed") {
    return { effect: "not_proposed", reason: "A failed fetch is not a program closure.", ...stopped };
  }
  if (input.proposal.status === "not_proposed" || input.proposal.evidence === null) {
    return { effect: "not_proposed", reason: "No change is proposed.", ...stopped };
  }
  const excerpt = input.proposal.evidence.excerpt;
  if (!input.fetchedText || excerpt.trim() === "" || !input.fetchedText.includes(excerpt)) {
    return { effect: "rejected", reason: "A proposed change must quote the fetched text.", ...stopped };
  }
  if (input.targetReviewStatus === "human_verified") {
    return { effect: "refused", reason: "A verified field is not overwritten.", ...stopped };
  }
  if (HELD.includes(input.fieldClass)) {
    return {
      effect: "held",
      reason: "Eligibility, income, deadlines, and application rules stay pending human approval.",
      ...stopped,
    };
  }
  return { effect: "held", reason: "This check does not write the catalog.", ...stopped };
}

export function restoreFields(current: readonly FieldSnapshot[], writes: readonly FieldWrite[]): FieldSnapshot[] {
  const restored = current.map((field) => ({ ...field }));
  for (const write of [...writes].reverse()) {
    const index = restored.findIndex((field) => field.recordId === write.recordId && field.field === write.field);
    const previous = { recordId: write.recordId, field: write.field, value: write.previous };
    if (index === -1) restored.push(previous);
    else restored[index] = previous;
  }
  return restored;
}
