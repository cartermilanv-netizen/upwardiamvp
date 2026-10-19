import { hasTransportationBarrier, digitalFlags } from "@/lib/barriers";
import { joinClauses, t, type MessageKey } from "@/lib/messages";
import {
  allowsSkip,
  optionLabelKey,
  type ScreenId,
} from "@/lib/screens";
import type {
  Answer,
  DraftAssessment,
  EmploymentBarrier,
  FinancialDraft,
  GoalId,
  HealthDraft,
  PrototypeStorage,
  SocialNeed,
} from "@/lib/types";

export type OptOut = "not_sure" | "prefer_not_to_answer";

export type Pending =
  | { kind: "storage"; value: PrototypeStorage | null }
  | { kind: "consent"; value: "granted" | "declined" | null }
  | { kind: "single"; value: string | null; opt: OptOut | null }
  | { kind: "multi"; values: string[]; opt: OptOut | null }
  | { kind: "count"; value: number | null; opt: OptOut | null }
  | { kind: "text"; value: string; opt: OptOut | null }
  | { kind: "goals"; values: GoalId[]; otherText: string; opt: OptOut | null }
  | { kind: "none" };

export type ReviewItem = {
  screen: ScreenId;
  labelKey: MessageKey;
  value: string;
};

export type ReviewGroup = {
  id: string;
  titleKey: MessageKey;
  items: ReviewItem[];
  optIn: boolean;
};

const NOT_APPLICABLE: Answer<never> = { status: "not_applicable" };

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}`;
}

export function createDraft(storage: PrototypeStorage, now = new Date()): DraftAssessment {
  const iso = now.toISOString();
  return {
    schemaVersion: 1,
    id: createId(),
    locale: "en",
    createdAt: iso,
    updatedAt: iso,
    prototypeStorage: storage,
    household: {},
    educationEmployment: {},
    transportation: {},
    digital: {},
    priorities: {},
  };
}

export function toggleMulti<T extends string>(current: readonly T[], value: T, exclusive: readonly T[], max?: number): T[] {
  if (exclusive.includes(value)) {
    if (current.length === 1 && current[0] === value) return [];
    return [value];
  }
  const withoutExclusive = current.filter((item) => !exclusive.includes(item));
  if (withoutExclusive.includes(value)) return withoutExclusive.filter((item) => item !== value);
  if (max !== undefined && withoutExclusive.length >= max) return [...withoutExclusive];
  return [...withoutExclusive, value];
}

function touch(draft: DraftAssessment, now: Date): DraftAssessment {
  return { ...draft, updatedAt: now.toISOString() };
}

function grantedFinancial(draft: DraftAssessment): Extract<FinancialDraft, { consent: "granted" }> {
  if (draft.financial?.consent === "granted") return draft.financial;
  return { consent: "granted" };
}

function grantedHealth(draft: DraftAssessment): Extract<HealthDraft, { consent: "granted" }> {
  if (draft.health?.consent === "granted") return draft.health;
  return { consent: "granted" };
}

function stripDisability(draft: DraftAssessment): DraftAssessment {
  const barriers = draft.educationEmployment.employmentBarriers;
  if (barriers?.status !== "answered") return draft;
  const filtered = barriers.value.filter((value) => value !== "health_or_disability");
  if (filtered.length === barriers.value.length) return draft;
  const employmentBarriers = filtered.length === 0 ? undefined : { status: "answered" as const, value: filtered };
  return {
    ...draft,
    educationEmployment: { ...draft.educationEmployment, employmentBarriers },
  };
}

function declineConsent(draft: DraftAssessment): DraftAssessment {
  return stripDisability({
    ...draft,
    sensitiveConsent: "declined",
    financial: { consent: "declined" },
    health: { consent: "declined" },
  });
}

function grantConsent(draft: DraftAssessment): DraftAssessment {
  if (draft.sensitiveConsent === "granted" && draft.financial?.consent === "granted" && draft.health?.consent === "granted") {
    return draft;
  }
  return {
    ...draft,
    sensitiveConsent: "granted",
    financial: { consent: "granted" },
    health: { consent: "granted" },
  };
}

function normalize(draft: DraftAssessment): DraftAssessment {
  if (draft.sensitiveConsent === "declined") return declineConsent(draft);
  let next = draft;
  if (next.financial?.consent === "granted") {
    next = { ...next, financial: normalizeFinancial(next.financial) };
  }
  if (next.health?.consent === "granted") {
    next = { ...next, health: normalizeHealth(next.health) };
  }
  next = {
    ...next,
    transportation: normalizeTransport(next.transportation),
    priorities: normalizePriorities(next.priorities),
  };
  return next;
}

function normalizeFinancial(financial: Extract<FinancialDraft, { consent: "granted" }>): Extract<FinancialDraft, { consent: "granted" }> {
  const next = { ...financial };
  const housing = next.housingSituation;
  if (housing && (housing.status !== "answered" || housing.value === "unhoused")) {
    next.housingCostHardship = NOT_APPLICABLE;
  } else if (housing?.status === "answered" && next.housingCostHardship?.status === "not_applicable") {
    delete next.housingCostHardship;
  }
  const food = next.foodSecurity;
  if (food && (food.status !== "answered" || food.value === "enough")) {
    next.foodBarriers = NOT_APPLICABLE;
  } else if (food?.status === "answered" && (food.value === "sometimes_not_enough" || food.value === "often_not_enough") && next.foodBarriers?.status === "not_applicable") {
    delete next.foodBarriers;
  }
  const utilities = next.utilityTrouble;
  if (utilities && (utilities.status !== "answered" || utilities.value !== "yes")) {
    next.utilityTypes = NOT_APPLICABLE;
  } else if (utilities?.status === "answered" && utilities.value === "yes" && next.utilityTypes?.status === "not_applicable") {
    delete next.utilityTypes;
  }
  return next;
}

function normalizeHealth(health: Extract<HealthDraft, { consent: "granted" }>): Extract<HealthDraft, { consent: "granted" }> {
  const next = { ...health };
  const pcp = next.hasPcp;
  if (pcp && (pcp.status !== "answered" || pcp.value !== "no")) {
    next.wantsClinicHelp = NOT_APPLICABLE;
  } else if (pcp?.status === "answered" && pcp.value === "no" && next.wantsClinicHelp?.status === "not_applicable") {
    delete next.wantsClinicHelp;
  }
  const care = next.careAccessDifficulty;
  if (care && (care.status !== "answered" || care.value !== "yes")) {
    next.careBarriers = NOT_APPLICABLE;
  } else if (care?.status === "answered" && care.value === "yes" && next.careBarriers?.status === "not_applicable") {
    delete next.careBarriers;
  }
  return next;
}

function normalizeTransport(transport: DraftAssessment["transportation"]): DraftAssessment["transportation"] {
  const modes = transport.modes;
  if (!modes) return transport;
  const cannot = modes.status === "answered" && modes.value.includes("cannot_get_there");
  if (modes.status !== "answered" || cannot) {
    return { ...transport, reliability: NOT_APPLICABLE };
  }
  if (transport.reliability?.status === "not_applicable") {
    const next = { ...transport };
    delete next.reliability;
    return next;
  }
  return transport;
}

function normalizePriorities(priorities: DraftAssessment["priorities"]): DraftAssessment["priorities"] {
  const goals = priorities.topGoals;
  if (!goals) return priorities;
  const wantsOther = goals.status === "answered" && goals.value.includes("other");
  if (!wantsOther) return { ...priorities, otherGoalText: NOT_APPLICABLE };
  if (priorities.otherGoalText?.status === "not_applicable") {
    const next = { ...priorities };
    delete next.otherGoalText;
    return next;
  }
  return priorities;
}

function optAnswer(): Answer<never> {
  return { status: "skipped" };
}

function fromOpt(opt: OptOut | "skipped"): Answer<never> {
  return { status: opt };
}

function answered<T>(value: T): Answer<T> {
  return { status: "answered", value };
}

export function blankPending(screen: ScreenId): Pending {
  switch (screen) {
    case "intro":
      return { kind: "storage", value: null };
    case "consent":
      return { kind: "consent", value: null };
    case "zip":
    case "careerGoal":
      return { kind: "text", value: "", opt: null };
    case "adults":
    case "children":
    case "otherDependents":
      return { kind: "count", value: null, opt: null };
    case "goals":
      return { kind: "goals", values: [], otherText: "", opt: null };
    case "foodBarriers":
    case "utilityTypes":
    case "careBarriers":
    case "unmetNeeds":
    case "training":
    case "employmentBarriers":
    case "transportModes":
    case "hardToReach":
    case "digitalAccess":
      return { kind: "multi", values: [], opt: null };
    case "workStatusReview":
    case "review":
    case "results":
      return { kind: "none" };
    default:
      return { kind: "single", value: null, opt: null };
  }
}

function optOf(answer: Answer<unknown> | undefined): OptOut | null {
  if (answer?.status === "not_sure" || answer?.status === "prefer_not_to_answer") return answer.status;
  return null;
}

export function readPending(draft: DraftAssessment | null, screen: ScreenId): Pending {
  const blank = blankPending(screen);
  if (!draft) return blank;
  if (screen === "intro") return { kind: "storage", value: draft.prototypeStorage };
  if (screen === "consent") return { kind: "consent", value: draft.sensitiveConsent ?? null };
  const answer = getAnswer(draft, screen);
  if (!answer || answer.status === "skipped" || answer.status === "not_applicable") return blank;
  const opt = optOf(answer);
  if (blank.kind === "text") {
    return { kind: "text", value: answer.status === "answered" ? String(answer.value ?? "") : "", opt };
  }
  if (blank.kind === "count") {
    return { kind: "count", value: answer.status === "answered" && typeof answer.value === "number" ? answer.value : null, opt };
  }
  if (blank.kind === "single") {
    return { kind: "single", value: answer.status === "answered" ? String(answer.value) : null, opt };
  }
  if (blank.kind === "multi") {
    return { kind: "multi", values: answer.status === "answered" && Array.isArray(answer.value) ? answer.value.map(String) : [], opt };
  }
  if (blank.kind === "goals") {
    const other = draft.priorities.otherGoalText;
    return {
      kind: "goals",
      values: answer.status === "answered" && Array.isArray(answer.value) ? (answer.value as GoalId[]) : [],
      otherText: other?.status === "answered" ? other.value : "",
      opt,
    };
  }
  return blank;
}

export function getAnswer(draft: DraftAssessment, screen: ScreenId): Answer<unknown> | undefined {
  const financial = draft.financial?.consent === "granted" ? draft.financial : undefined;
  const health = draft.health?.consent === "granted" ? draft.health : undefined;
  switch (screen) {
    case "zip":
      return draft.household.zip;
    case "adults":
      return draft.household.adults;
    case "children":
      return draft.household.children;
    case "otherDependents":
      return draft.household.otherDependents;
    case "employment":
      return financial?.employment;
    case "income":
      return financial?.incomeRange;
    case "housingSituation":
      return financial?.housingSituation;
    case "housingHardship":
      return financial?.housingCostHardship;
    case "foodSecurity":
      return financial?.foodSecurity;
    case "foodBarriers":
      return financial?.foodBarriers;
    case "utilityTrouble":
      return financial?.utilityTrouble;
    case "utilityTypes":
      return financial?.utilityTypes;
    case "insurance":
      return health?.insurance;
    case "hasPcp":
      return health?.hasPcp;
    case "wantsClinicHelp":
      return health?.wantsClinicHelp;
    case "careAccess":
      return health?.careAccessDifficulty;
    case "careBarriers":
      return health?.careBarriers;
    case "unmetNeeds":
      return health?.unmetSocialNeeds;
    case "education":
      return draft.educationEmployment.highestEducation;
    case "training":
      return draft.educationEmployment.trainingNeeds;
    case "careerGoal":
      return draft.educationEmployment.careerGoal;
    case "employmentBarriers":
      return draft.educationEmployment.employmentBarriers;
    case "transportModes":
      return draft.transportation.modes;
    case "reliability":
      return draft.transportation.reliability;
    case "hardToReach":
      return draft.transportation.hardToReach;
    case "digitalAccess":
      return draft.digital.access;
    case "digitalComfort":
      return draft.digital.comfort;
    case "goals":
      return draft.priorities.topGoals;
    case "urgency":
      return draft.priorities.urgency;
    default:
      return undefined;
  }
}

function withHousehold(draft: DraftAssessment, patch: DraftAssessment["household"]): DraftAssessment {
  return { ...draft, household: { ...draft.household, ...patch } };
}

function withFinancial(draft: DraftAssessment, patch: Partial<Extract<FinancialDraft, { consent: "granted" }>>): DraftAssessment {
  return { ...draft, financial: { ...grantedFinancial(draft), ...patch } };
}

function withHealth(draft: DraftAssessment, patch: Partial<Extract<HealthDraft, { consent: "granted" }>>): DraftAssessment {
  return { ...draft, health: { ...grantedHealth(draft), ...patch } };
}

function withEducation(draft: DraftAssessment, patch: Partial<DraftAssessment["educationEmployment"]>): DraftAssessment {
  return { ...draft, educationEmployment: { ...draft.educationEmployment, ...patch } };
}

function withTransport(draft: DraftAssessment, patch: Partial<DraftAssessment["transportation"]>): DraftAssessment {
  return { ...draft, transportation: { ...draft.transportation, ...patch } };
}

function withDigital(draft: DraftAssessment, patch: Partial<DraftAssessment["digital"]>): DraftAssessment {
  return { ...draft, digital: { ...draft.digital, ...patch } };
}

function withPriorities(draft: DraftAssessment, patch: Partial<DraftAssessment["priorities"]>): DraftAssessment {
  return { ...draft, priorities: { ...draft.priorities, ...patch } };
}

type FieldAnswer = Answer<string> | Answer<number> | Answer<string[]> | Answer<GoalId[]>;

function assign(draft: DraftAssessment, screen: ScreenId, answer: FieldAnswer): DraftAssessment {
  switch (screen) {
    case "zip":
      return withHousehold(draft, { zip: answer as Answer<string> });
    case "adults":
      return withHousehold(draft, { adults: answer as Answer<number> });
    case "children":
      return withHousehold(draft, { children: answer as Answer<number> });
    case "otherDependents":
      return withHousehold(draft, { otherDependents: answer as Answer<number> });
    case "employment":
      return withFinancial(draft, { employment: answer as Extract<FinancialDraft, { consent: "granted" }>["employment"] });
    case "income":
      return withFinancial(draft, { incomeRange: answer as Extract<FinancialDraft, { consent: "granted" }>["incomeRange"] });
    case "housingSituation":
      return withFinancial(draft, { housingSituation: answer as Extract<FinancialDraft, { consent: "granted" }>["housingSituation"] });
    case "housingHardship":
      return withFinancial(draft, { housingCostHardship: answer as Extract<FinancialDraft, { consent: "granted" }>["housingCostHardship"] });
    case "foodSecurity":
      return withFinancial(draft, { foodSecurity: answer as Extract<FinancialDraft, { consent: "granted" }>["foodSecurity"] });
    case "foodBarriers":
      return withFinancial(draft, { foodBarriers: answer as Extract<FinancialDraft, { consent: "granted" }>["foodBarriers"] });
    case "utilityTrouble":
      return withFinancial(draft, { utilityTrouble: answer as Extract<FinancialDraft, { consent: "granted" }>["utilityTrouble"] });
    case "utilityTypes":
      return withFinancial(draft, { utilityTypes: answer as Extract<FinancialDraft, { consent: "granted" }>["utilityTypes"] });
    case "insurance":
      return withHealth(draft, { insurance: answer as Extract<HealthDraft, { consent: "granted" }>["insurance"] });
    case "hasPcp":
      return withHealth(draft, { hasPcp: answer as Extract<HealthDraft, { consent: "granted" }>["hasPcp"] });
    case "wantsClinicHelp":
      return withHealth(draft, { wantsClinicHelp: answer as Extract<HealthDraft, { consent: "granted" }>["wantsClinicHelp"] });
    case "careAccess":
      return withHealth(draft, { careAccessDifficulty: answer as Extract<HealthDraft, { consent: "granted" }>["careAccessDifficulty"] });
    case "careBarriers":
      return withHealth(draft, { careBarriers: answer as Extract<HealthDraft, { consent: "granted" }>["careBarriers"] });
    case "unmetNeeds":
      return withHealth(draft, { unmetSocialNeeds: answer as Extract<HealthDraft, { consent: "granted" }>["unmetSocialNeeds"] });
    case "education":
      return withEducation(draft, { highestEducation: answer as DraftAssessment["educationEmployment"]["highestEducation"] });
    case "training":
      return withEducation(draft, { trainingNeeds: answer as DraftAssessment["educationEmployment"]["trainingNeeds"] });
    case "careerGoal":
      return withEducation(draft, { careerGoal: answer as Answer<string> });
    case "employmentBarriers":
      return withEducation(draft, { employmentBarriers: answer as Answer<EmploymentBarrier[]> });
    case "transportModes":
      return withTransport(draft, { modes: answer as DraftAssessment["transportation"]["modes"] });
    case "reliability":
      return withTransport(draft, { reliability: answer as DraftAssessment["transportation"]["reliability"] });
    case "hardToReach":
      return withTransport(draft, { hardToReach: answer as DraftAssessment["transportation"]["hardToReach"] });
    case "digitalAccess":
      return withDigital(draft, { access: answer as DraftAssessment["digital"]["access"] });
    case "digitalComfort":
      return withDigital(draft, { comfort: answer as DraftAssessment["digital"]["comfort"] });
    case "goals":
      return withPriorities(draft, { topGoals: answer as Answer<GoalId[]> });
    case "urgency":
      return withPriorities(draft, { urgency: answer as DraftAssessment["priorities"]["urgency"] });
    default:
      return draft;
  }
}

export function validatePending(screen: ScreenId, pending: Pending): MessageKey | null {
  if (screen === "intro" && pending.kind === "storage") {
    return pending.value ? null : "assessment.error.storage";
  }
  if (screen === "consent" && pending.kind === "consent") {
    return pending.value ? null : "assessment.error.consent";
  }
  if (pending.kind === "text") {
    if (pending.opt) return null;
    if (screen === "zip" && !/^\d{5}$/.test(pending.value.trim())) return "assessment.error.zip";
    if (screen === "careerGoal" && pending.value.length > 200) return "assessment.error.career";
    return null;
  }
  if (pending.kind === "count") {
    if (pending.opt) return null;
    if (pending.value === null || !Number.isInteger(pending.value) || pending.value < 0 || pending.value > 20) {
      return "assessment.error.count";
    }
    return null;
  }
  if (pending.kind === "single") {
    if (pending.opt || pending.value) return null;
    return "assessment.error.chooseOrSkip";
  }
  if (pending.kind === "multi") {
    if (pending.opt || pending.values.length > 0) return null;
    return "assessment.error.chooseOrSkip";
  }
  if (pending.kind === "goals") {
    if (pending.opt) return null;
    if (pending.values.length < 1 || pending.values.length > 3) return "assessment.error.goals";
    if (pending.otherText.length > 120) return "assessment.error.otherGoal";
    return null;
  }
  return null;
}

export function commitPending(
  draft: DraftAssessment | null,
  screen: ScreenId,
  pending: Pending,
  now = new Date(),
): { draft: DraftAssessment | null; error: MessageKey | null } {
  const error = validatePending(screen, pending);
  if (error) return { draft, error };
  if (screen === "intro" && pending.kind === "storage" && pending.value) {
    const next = draft ? { ...draft, prototypeStorage: pending.value } : createDraft(pending.value, now);
    return { draft: touch(next, now), error: null };
  }
  if (!draft) return { draft, error: "assessment.error.chooseOrSkip" };
  let next = draft;
  if (screen === "consent" && pending.kind === "consent" && pending.value) {
    next = pending.value === "granted" ? grantConsent(next) : declineConsent(next);
    return { draft: touch(normalize(next), now), error: null };
  }
  if (pending.kind === "text") {
    if (pending.opt) next = assign(next, screen, fromOpt(pending.opt));
    else next = assign(next, screen, answered(pending.value.trim()));
  } else if (pending.kind === "count") {
    if (pending.opt) next = assign(next, screen, fromOpt(pending.opt));
    else if (pending.value !== null) next = assign(next, screen, answered(pending.value));
  } else if (pending.kind === "single") {
    if (pending.opt) next = assign(next, screen, fromOpt(pending.opt));
    else if (pending.value) next = assign(next, screen, answered(pending.value));
  } else if (pending.kind === "multi") {
    if (pending.opt) next = assign(next, screen, fromOpt(pending.opt));
    else next = assign(next, screen, answered(pending.values));
  } else if (pending.kind === "goals") {
    if (pending.opt) {
      next = withPriorities(assign(next, "goals", fromOpt(pending.opt)), { otherGoalText: NOT_APPLICABLE });
    } else {
      const text = pending.otherText.trim().slice(0, 120);
      next = withPriorities(assign(next, "goals", answered(pending.values)), {
        otherGoalText: pending.values.includes("other") ? answered(text) : NOT_APPLICABLE,
      });
    }
  }
  return { draft: touch(normalize(next), now), error: null };
}

export function commitSkip(draft: DraftAssessment, screen: ScreenId, now = new Date()): DraftAssessment {
  if (!allowsSkip(screen)) return draft;
  let next = assign(draft, screen, optAnswer());
  if (screen === "goals") next = withPriorities(next, { otherGoalText: NOT_APPLICABLE });
  return touch(normalize(next), now);
}

export function applicableScreens(draft: DraftAssessment): ScreenId[] {
  const screens: ScreenId[] = ["intro", "zip", "adults", "children", "otherDependents", "consent"];
  if (draft.sensitiveConsent !== "granted" && draft.sensitiveConsent !== "declined") return screens;
  if (draft.sensitiveConsent === "granted") {
    screens.push("employment", "income", "housingSituation");
    if (needsHousingHardship(draft)) screens.push("housingHardship");
    screens.push("foodSecurity");
    if (needsFoodBarriers(draft)) screens.push("foodBarriers");
    screens.push("utilityTrouble");
    if (needsUtilityTypes(draft)) screens.push("utilityTypes");
    screens.push("insurance", "hasPcp");
    if (needsClinic(draft)) screens.push("wantsClinicHelp");
    screens.push("careAccess");
    if (needsCareBarriers(draft)) screens.push("careBarriers");
    screens.push("unmetNeeds");
  }
  if (hasAnsweredEmployment(draft)) screens.push("workStatusReview");
  screens.push("education", "training", "careerGoal", "employmentBarriers", "transportModes");
  if (needsReliability(draft)) screens.push("reliability");
  screens.push("hardToReach", "digitalAccess", "digitalComfort", "goals", "urgency", "review", "results");
  return screens;
}

function financialGranted(draft: DraftAssessment): Extract<FinancialDraft, { consent: "granted" }> | null {
  return draft.sensitiveConsent === "granted" && draft.financial?.consent === "granted" ? draft.financial : null;
}

function healthGranted(draft: DraftAssessment): Extract<HealthDraft, { consent: "granted" }> | null {
  return draft.sensitiveConsent === "granted" && draft.health?.consent === "granted" ? draft.health : null;
}

function needsHousingHardship(draft: DraftAssessment): boolean {
  const housing = financialGranted(draft)?.housingSituation;
  return housing?.status === "answered" && housing.value !== "unhoused";
}

function needsFoodBarriers(draft: DraftAssessment): boolean {
  const food = financialGranted(draft)?.foodSecurity;
  return food?.status === "answered" && (food.value === "sometimes_not_enough" || food.value === "often_not_enough");
}

function needsUtilityTypes(draft: DraftAssessment): boolean {
  const utilities = financialGranted(draft)?.utilityTrouble;
  return utilities?.status === "answered" && utilities.value === "yes";
}

function needsClinic(draft: DraftAssessment): boolean {
  const pcp = healthGranted(draft)?.hasPcp;
  return pcp?.status === "answered" && pcp.value === "no";
}

function needsCareBarriers(draft: DraftAssessment): boolean {
  const care = healthGranted(draft)?.careAccessDifficulty;
  return care?.status === "answered" && care.value === "yes";
}

function needsReliability(draft: DraftAssessment): boolean {
  const modes = draft.transportation.modes;
  if (modes?.status !== "answered") return false;
  return !modes.value.includes("cannot_get_there");
}

function hasAnsweredEmployment(draft: DraftAssessment): boolean {
  return financialGranted(draft)?.employment?.status === "answered";
}

export function isScreenSatisfied(draft: DraftAssessment, screen: ScreenId): boolean {
  if (screen === "intro" || screen === "workStatusReview" || screen === "review" || screen === "results") return true;
  if (screen === "consent") return draft.sensitiveConsent === "granted" || draft.sensitiveConsent === "declined";
  return getAnswer(draft, screen) !== undefined;
}

export function nextScreen(draft: DraftAssessment, current: ScreenId): ScreenId {
  const screens = applicableScreens(draft);
  const index = screens.indexOf(current);
  if (index < 0) return screens[0] ?? "intro";
  return screens[Math.min(index + 1, screens.length - 1)] ?? current;
}

export function prevScreen(draft: DraftAssessment, current: ScreenId): ScreenId {
  const screens = applicableScreens(draft);
  const index = screens.indexOf(current);
  if (index <= 0) return screens[0] ?? "intro";
  return screens[index - 1] ?? current;
}

export function advance(draft: DraftAssessment, from: ScreenId, returnTo: ScreenId | null): ScreenId {
  if (returnTo === "review") {
    const screens = applicableScreens(draft);
    const start = screens.indexOf(from);
    const reviewAt = screens.indexOf("review");
    for (let index = start + 1; index < reviewAt; index += 1) {
      const screen = screens[index];
      if (screen && !isScreenSatisfied(draft, screen)) return screen;
    }
    return "review";
  }
  if (returnTo === "workStatusReview") {
    return applicableScreens(draft).includes("workStatusReview") ? "workStatusReview" : "education";
  }
  return nextScreen(draft, from);
}

export function resumeScreen(draft: DraftAssessment): ScreenId {
  for (const screen of applicableScreens(draft)) {
    if (screen === "intro" || screen === "results") continue;
    if (!isScreenSatisfied(draft, screen)) return screen;
  }
  return "review";
}

export function showInternetBillHint(draft: DraftAssessment): boolean {
  const financial = financialGranted(draft);
  const types = financial?.utilityTypes;
  return types?.status === "answered" && types.value.includes("internet");
}

export function showCareTransportHint(draft: DraftAssessment): boolean {
  const health = healthGranted(draft);
  const barriers = health?.careBarriers;
  return barriers?.status === "answered" && barriers.value.includes("transport");
}

export function employmentSummary(draft: DraftAssessment): string | null {
  const employment = financialGranted(draft)?.employment;
  if (employment?.status !== "answered") return null;
  const key = optionLabelKey("employment", employment.value);
  return key ? t(key) : null;
}

export function suggestedGoals(draft: DraftAssessment): GoalId[] {
  const goals: GoalId[] = [];
  const add = (goal: GoalId) => {
    if (!goals.includes(goal)) goals.push(goal);
  };
  const financial = financialGranted(draft);
  const health = healthGranted(draft);
  if (financial?.foodSecurity?.status === "answered" && financial.foodSecurity.value !== "enough") add("food");
  if (financial?.housingSituation?.status === "answered" && financial.housingSituation.value === "unhoused") add("housing");
  if (financial?.housingCostHardship?.status === "answered" && financial.housingCostHardship.value !== "no") add("housing");
  if (financial?.utilityTrouble?.status === "answered" && financial.utilityTrouble.value === "yes") add("utilities");
  if (health?.insurance?.status === "answered" && health.insurance.value === "none") add("health");
  if (health?.wantsClinicHelp?.status === "answered" && health.wantsClinicHelp.value === "yes") add("health");
  if (health?.careAccessDifficulty?.status === "answered" && health.careAccessDifficulty.value === "yes") add("health");
  if (health?.unmetSocialNeeds?.status === "answered") {
    for (const need of health.unmetSocialNeeds.value as SocialNeed[]) {
      if (need === "food") add("food");
      if (need === "housing") add("housing");
      if (need === "utilities") add("utilities");
      if (need === "transportation") add("transportation");
      if (need === "family_care") add("family_care");
      if (need === "coverage_or_doctor") add("health");
    }
  }
  if (financial?.employment?.status === "answered" && financial.employment.value === "looking") add("job");
  const training = draft.educationEmployment.trainingNeeds;
  if (training?.status === "answered" && training.value.some((value) => value !== "none")) add("training");
  if (hasTransportationBarrier(draft)) add("transportation");
  const digital = digitalFlags(draft);
  if (digital.none || digital.uncomfort || digital.intermittent) add("digital");
  const barriers = draft.educationEmployment.employmentBarriers;
  if (barriers?.status === "answered" && barriers.value.includes("childcare")) add("family_care");
  return goals;
}

const REVIEW_FIELDS: { section: 1 | 2 | 3 | 4 | 5 | 6 | 7; screen: ScreenId; labelKey: MessageKey }[] = [
  { section: 1, screen: "zip", labelKey: "assessment.field.zip" },
  { section: 1, screen: "adults", labelKey: "assessment.field.adults" },
  { section: 1, screen: "children", labelKey: "assessment.field.children" },
  { section: 1, screen: "otherDependents", labelKey: "assessment.field.otherDependents" },
  { section: 2, screen: "employment", labelKey: "assessment.field.employment" },
  { section: 2, screen: "income", labelKey: "assessment.field.income" },
  { section: 2, screen: "housingSituation", labelKey: "assessment.field.housing" },
  { section: 2, screen: "housingHardship", labelKey: "assessment.field.housingHardship" },
  { section: 2, screen: "foodSecurity", labelKey: "assessment.field.food" },
  { section: 2, screen: "foodBarriers", labelKey: "assessment.field.foodBarriers" },
  { section: 2, screen: "utilityTrouble", labelKey: "assessment.field.utilities" },
  { section: 2, screen: "utilityTypes", labelKey: "assessment.field.utilityTypes" },
  { section: 3, screen: "insurance", labelKey: "assessment.field.insurance" },
  { section: 3, screen: "hasPcp", labelKey: "assessment.field.pcp" },
  { section: 3, screen: "wantsClinicHelp", labelKey: "assessment.field.clinic" },
  { section: 3, screen: "careAccess", labelKey: "assessment.field.care" },
  { section: 3, screen: "careBarriers", labelKey: "assessment.field.careBarriers" },
  { section: 3, screen: "unmetNeeds", labelKey: "assessment.field.needs" },
  { section: 4, screen: "employment", labelKey: "assessment.field.employment" },
  { section: 4, screen: "education", labelKey: "assessment.field.education" },
  { section: 4, screen: "training", labelKey: "assessment.field.training" },
  { section: 4, screen: "careerGoal", labelKey: "assessment.field.career" },
  { section: 4, screen: "employmentBarriers", labelKey: "assessment.field.workBarriers" },
  { section: 5, screen: "transportModes", labelKey: "assessment.field.modes" },
  { section: 5, screen: "reliability", labelKey: "assessment.field.reliability" },
  { section: 5, screen: "hardToReach", labelKey: "assessment.field.destinations" },
  { section: 6, screen: "digitalAccess", labelKey: "assessment.field.access" },
  { section: 6, screen: "digitalComfort", labelKey: "assessment.field.comfort" },
  { section: 7, screen: "goals", labelKey: "assessment.field.goals" },
  { section: 7, screen: "urgency", labelKey: "assessment.field.urgency" },
];

const SECTION_TITLE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, MessageKey> = {
  1: "assessment.section.household",
  2: "assessment.section.financial",
  3: "assessment.section.health",
  4: "assessment.section.education",
  5: "assessment.section.transportation",
  6: "assessment.section.digital",
  7: "assessment.section.priorities",
};

export function formatAnswer(screen: ScreenId, answer: Answer<unknown>): string {
  if (answer.status === "skipped") return t("assessment.status.skipped");
  if (answer.status === "not_sure") return t("assessment.status.notSure");
  if (answer.status === "prefer_not_to_answer") return t("assessment.status.preferNot");
  if (answer.status === "not_applicable") return t("assessment.status.notApplicable");
  if (typeof answer.value === "number") return String(answer.value);
  if (typeof answer.value === "string") {
    if (screen === "zip" || screen === "careerGoal") {
      return answer.value.trim() ? answer.value : t("assessment.education.career.empty");
    }
    const key = optionLabelKey(screen, answer.value);
    return key ? t(key) : answer.value;
  }
  if (Array.isArray(answer.value)) {
    const labels = answer.value.map((value) => {
      const key = optionLabelKey(screen, String(value));
      return key ? t(key) : String(value);
    });
    return labels.length ? joinClauses(labels) : t("assessment.status.noneSelected");
  }
  return "";
}

export function reviewGroups(draft: DraftAssessment): ReviewGroup[] {
  const groups: ReviewGroup[] = [];
  if (draft.sensitiveConsent === "declined") {
    groups.push({
      id: "skipped-topics",
      titleKey: "assessment.review.skippedTopics",
      items: [],
      optIn: true,
    });
  }
  for (const section of [1, 2, 3, 4, 5, 6, 7] as const) {
    if ((section === 2 || section === 3) && draft.sensitiveConsent === "declined") continue;
    const items: ReviewItem[] = [];
    for (const field of REVIEW_FIELDS.filter((item) => item.section === section)) {
      if (field.section === 4 && field.screen === "employment" && !hasAnsweredEmployment(draft)) continue;
      const answer = getAnswer(draft, field.screen);
      if (!answer || answer.status === "not_applicable") continue;
      items.push({ screen: field.screen, labelKey: field.labelKey, value: formatAnswer(field.screen, answer) });
    }
    const other = draft.priorities.otherGoalText;
    if (section === 7 && other && other.status !== "not_applicable") {
      const value = other.status === "answered"
        ? (other.value.trim() || t("assessment.status.noneSelected"))
        : formatAnswer("goals", other);
      items.push({ screen: "goals", labelKey: "assessment.field.otherGoal", value });
    }
    if (items.length === 0) continue;
    groups.push({ id: `section-${section}`, titleKey: SECTION_TITLE[section], items, optIn: false });
  }
  return groups;
}

export function serializeAssessment(draft: DraftAssessment): DraftAssessment {
  return normalize(draft);
}
