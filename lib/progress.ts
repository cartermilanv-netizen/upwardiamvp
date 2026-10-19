import { isInLocalWeek } from "@/lib/dates";
import { matchCatalog } from "@/lib/matcher";
import type { Answer, DraftAssessment, MicroAction, MissingFact, VerifiedCatalogEntry } from "@/lib/types";

export type ProgressCounts = {
  sectionsVisited: number;
  missingFacts: number;
  actionsDone: number;
  actionsDoneThisWeek: number;
};

function stored(answer: Answer<unknown> | undefined): boolean {
  return answer !== undefined;
}

function financialVisited(draft: DraftAssessment): boolean {
  if (draft.sensitiveConsent === "declined") return true;
  const financial = draft.financial;
  if (financial?.consent !== "granted") return false;
  return [
    financial.employment,
    financial.incomeRange,
    financial.housingSituation,
    financial.housingCostHardship,
    financial.foodSecurity,
    financial.foodBarriers,
    financial.utilityTrouble,
    financial.utilityTypes,
  ].some(stored);
}

function healthVisited(draft: DraftAssessment): boolean {
  if (draft.sensitiveConsent === "declined") return true;
  const health = draft.health;
  if (health?.consent !== "granted") return false;
  return [
    health.insurance,
    health.hasPcp,
    health.wantsClinicHelp,
    health.careAccessDifficulty,
    health.careBarriers,
    health.unmetSocialNeeds,
  ].some(stored);
}

export function sectionsVisited(draft: DraftAssessment): number {
  const household = [draft.household.zip, draft.household.adults, draft.household.children, draft.household.otherDependents].some(stored);
  const education = [
    draft.educationEmployment.highestEducation,
    draft.educationEmployment.trainingNeeds,
    draft.educationEmployment.careerGoal,
    draft.educationEmployment.employmentBarriers,
  ].some(stored);
  const transportation = [draft.transportation.modes, draft.transportation.reliability, draft.transportation.hardToReach].some(stored);
  const digital = [draft.digital.access, draft.digital.comfort].some(stored);
  const priorities = [draft.priorities.topGoals, draft.priorities.otherGoalText, draft.priorities.urgency].some(stored);
  return [household, financialVisited(draft), healthVisited(draft), education, transportation, digital, priorities].filter(Boolean).length;
}

export function missingFactCount(draft: DraftAssessment, catalog: readonly Partial<VerifiedCatalogEntry>[]): number {
  const facts = new Set<MissingFact>();
  for (const row of matchCatalog(draft, catalog)) {
    if (row.decision.kind !== "needs_information") continue;
    for (const fact of row.decision.missingEligibility) facts.add(fact);
  }
  return facts.size;
}

export function progressCounts(
  draft: DraftAssessment,
  catalog: readonly Partial<VerifiedCatalogEntry>[],
  actions: readonly MicroAction[],
  now: Date,
): ProgressCounts {
  const done = actions.filter((action) => action.status === "done");
  return {
    sectionsVisited: sectionsVisited(draft),
    missingFacts: missingFactCount(draft, catalog),
    actionsDone: done.length,
    actionsDoneThisWeek: done.filter((action) => action.completedAt && isInLocalWeek(action.completedAt, now)).length,
  };
}
