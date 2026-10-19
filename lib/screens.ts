import type { MessageKey } from "@/lib/messages";
import type { DraftAssessment, SectionNumber } from "@/lib/types";

export type ScreenId =
  | "intro"
  | "zip"
  | "adults"
  | "children"
  | "otherDependents"
  | "consent"
  | "employment"
  | "income"
  | "housingSituation"
  | "housingHardship"
  | "foodSecurity"
  | "foodBarriers"
  | "utilityTrouble"
  | "utilityTypes"
  | "insurance"
  | "hasPcp"
  | "wantsClinicHelp"
  | "careAccess"
  | "careBarriers"
  | "unmetNeeds"
  | "workStatusReview"
  | "education"
  | "training"
  | "careerGoal"
  | "employmentBarriers"
  | "transportModes"
  | "reliability"
  | "hardToReach"
  | "digitalAccess"
  | "digitalComfort"
  | "goals"
  | "urgency"
  | "review"
  | "results";

export type ScreenKind =
  | "intro"
  | "consent"
  | "single"
  | "multi"
  | "count"
  | "text"
  | "goals"
  | "work"
  | "review"
  | "results";

export type OptionDef = { value: string; labelKey: MessageKey };

const EMPLOYMENT: OptionDef[] = [
  { value: "full_time", labelKey: "assessment.option.employment.full_time" },
  { value: "part_time", labelKey: "assessment.option.employment.part_time" },
  { value: "looking", labelKey: "assessment.option.employment.looking" },
  { value: "not_working", labelKey: "assessment.option.employment.not_working" },
  { value: "self_employed", labelKey: "assessment.option.employment.self_employed" },
];

const INCOME: OptionDef[] = [
  { value: "under_15k", labelKey: "assessment.option.income.under_15k" },
  { value: "15_to_29k", labelKey: "assessment.option.income.15_to_29k" },
  { value: "30_to_49k", labelKey: "assessment.option.income.30_to_49k" },
  { value: "50_to_74k", labelKey: "assessment.option.income.50_to_74k" },
  { value: "75k_or_more", labelKey: "assessment.option.income.75k_or_more" },
];

const HOUSING: OptionDef[] = [
  { value: "rent", labelKey: "assessment.option.housing.rent" },
  { value: "own", labelKey: "assessment.option.housing.own" },
  { value: "staying_with_someone", labelKey: "assessment.option.housing.staying_with_someone" },
  { value: "temporary", labelKey: "assessment.option.housing.temporary" },
  { value: "unhoused", labelKey: "assessment.option.housing.unhoused" },
  { value: "other", labelKey: "assessment.option.housing.other" },
];

const HARDSHIP: OptionDef[] = [
  { value: "yes", labelKey: "assessment.option.hardship.yes" },
  { value: "sometimes", labelKey: "assessment.option.hardship.sometimes" },
  { value: "no", labelKey: "assessment.option.hardship.no" },
];

const FOOD: OptionDef[] = [
  { value: "enough", labelKey: "assessment.option.food.enough" },
  { value: "sometimes_not_enough", labelKey: "assessment.option.food.sometimes_not_enough" },
  { value: "often_not_enough", labelKey: "assessment.option.food.often_not_enough" },
];

const FOOD_BARRIERS: OptionDef[] = [
  { value: "cost", labelKey: "assessment.option.foodBarrier.cost" },
  { value: "transport", labelKey: "assessment.option.foodBarrier.transport" },
  { value: "no_kitchen", labelKey: "assessment.option.foodBarrier.no_kitchen" },
  { value: "benefits_stopped", labelKey: "assessment.option.foodBarrier.benefits_stopped" },
  { value: "other", labelKey: "assessment.option.foodBarrier.other" },
];

const YES_NO: OptionDef[] = [
  { value: "yes", labelKey: "assessment.option.yesno.yes" },
  { value: "no", labelKey: "assessment.option.yesno.no" },
];

const UTILITIES: OptionDef[] = [
  { value: "electric", labelKey: "assessment.option.utility.electric" },
  { value: "gas", labelKey: "assessment.option.utility.gas" },
  { value: "water", labelKey: "assessment.option.utility.water" },
  { value: "phone", labelKey: "assessment.option.utility.phone" },
  { value: "internet", labelKey: "assessment.option.utility.internet" },
];

const INSURANCE: OptionDef[] = [
  { value: "employer_or_family", labelKey: "assessment.option.insurance.employer_or_family" },
  { value: "medi_cal", labelKey: "assessment.option.insurance.medi_cal" },
  { value: "medicare", labelKey: "assessment.option.insurance.medicare" },
  { value: "marketplace", labelKey: "assessment.option.insurance.marketplace" },
  { value: "other", labelKey: "assessment.option.insurance.other" },
  { value: "none", labelKey: "assessment.option.insurance.none" },
];

const CARE: OptionDef[] = [
  { value: "yes", labelKey: "assessment.option.care.yes" },
  { value: "no", labelKey: "assessment.option.care.no" },
  { value: "not_needed", labelKey: "assessment.option.care.not_needed" },
];

const CARE_BARRIERS: OptionDef[] = [
  { value: "cost", labelKey: "assessment.option.careBarrier.cost" },
  { value: "no_insurance", labelKey: "assessment.option.careBarrier.no_insurance" },
  { value: "transport", labelKey: "assessment.option.careBarrier.transport" },
  { value: "hours", labelKey: "assessment.option.careBarrier.hours" },
  { value: "appointment", labelKey: "assessment.option.careBarrier.appointment" },
  { value: "language", labelKey: "assessment.option.careBarrier.language" },
  { value: "childcare", labelKey: "assessment.option.careBarrier.childcare" },
  { value: "portal", labelKey: "assessment.option.careBarrier.portal" },
];

const NEEDS: OptionDef[] = [
  { value: "food", labelKey: "assessment.option.need.food" },
  { value: "housing", labelKey: "assessment.option.need.housing" },
  { value: "utilities", labelKey: "assessment.option.need.utilities" },
  { value: "transportation", labelKey: "assessment.option.need.transportation" },
  { value: "family_care", labelKey: "assessment.option.need.family_care" },
  { value: "coverage_or_doctor", labelKey: "assessment.option.need.coverage_or_doctor" },
  { value: "none", labelKey: "assessment.option.need.none" },
];

const EDUCATION: OptionDef[] = [
  { value: "less_than_hs", labelKey: "assessment.option.education.less_than_hs" },
  { value: "hs_or_ged", labelKey: "assessment.option.education.hs_or_ged" },
  { value: "some_college", labelKey: "assessment.option.education.some_college" },
  { value: "certificate", labelKey: "assessment.option.education.certificate" },
  { value: "associate", labelKey: "assessment.option.education.associate" },
  { value: "bachelor_or_higher", labelKey: "assessment.option.education.bachelor_or_higher" },
];

const TRAINING: OptionDef[] = [
  { value: "ged", labelKey: "assessment.option.training.ged" },
  { value: "english", labelKey: "assessment.option.training.english" },
  { value: "certificate", labelKey: "assessment.option.training.certificate" },
  { value: "digital_skills", labelKey: "assessment.option.training.digital_skills" },
  { value: "resume", labelKey: "assessment.option.training.resume" },
  { value: "business", labelKey: "assessment.option.training.business" },
  { value: "none", labelKey: "assessment.option.training.none" },
];

const WORK_BARRIERS: OptionDef[] = [
  { value: "schedule", labelKey: "assessment.option.workBarrier.schedule" },
  { value: "childcare", labelKey: "assessment.option.workBarrier.childcare" },
  { value: "transportation", labelKey: "assessment.option.workBarrier.transportation" },
  { value: "skills", labelKey: "assessment.option.workBarrier.skills" },
  { value: "language", labelKey: "assessment.option.workBarrier.language" },
  { value: "health_or_disability", labelKey: "assessment.option.workBarrier.health_or_disability" },
  { value: "background_check", labelKey: "assessment.option.workBarrier.background_check" },
  { value: "no_computer", labelKey: "assessment.option.workBarrier.no_computer" },
  { value: "none", labelKey: "assessment.option.workBarrier.none" },
];

const MODES: OptionDef[] = [
  { value: "own_car", labelKey: "assessment.option.mode.own_car" },
  { value: "ride", labelKey: "assessment.option.mode.ride" },
  { value: "transit", labelKey: "assessment.option.mode.transit" },
  { value: "bike_or_walk", labelKey: "assessment.option.mode.bike_or_walk" },
  { value: "rideshare", labelKey: "assessment.option.mode.rideshare" },
  { value: "cannot_get_there", labelKey: "assessment.option.mode.cannot_get_there" },
];

const RELIABILITY: OptionDef[] = [
  { value: "usually", labelKey: "assessment.option.reliability.usually" },
  { value: "sometimes", labelKey: "assessment.option.reliability.sometimes" },
  { value: "rarely", labelKey: "assessment.option.reliability.rarely" },
];

const DESTINATIONS: OptionDef[] = [
  { value: "work", labelKey: "assessment.option.destination.work" },
  { value: "school", labelKey: "assessment.option.destination.school" },
  { value: "medical", labelKey: "assessment.option.destination.medical" },
  { value: "grocery", labelKey: "assessment.option.destination.grocery" },
  { value: "benefits_office", labelKey: "assessment.option.destination.benefits_office" },
  { value: "not_hard", labelKey: "assessment.option.destination.not_hard" },
];

const ACCESS: OptionDef[] = [
  { value: "wifi_home", labelKey: "assessment.option.access.wifi_home" },
  { value: "wifi_elsewhere", labelKey: "assessment.option.access.wifi_elsewhere" },
  { value: "smartphone", labelKey: "assessment.option.access.smartphone" },
  { value: "computer", labelKey: "assessment.option.access.computer" },
  { value: "tablet", labelKey: "assessment.option.access.tablet" },
  { value: "shared_computer", labelKey: "assessment.option.access.shared_computer" },
  { value: "none", labelKey: "assessment.option.access.none" },
];

const COMFORT: OptionDef[] = [
  { value: "comfortable", labelKey: "assessment.option.comfort.comfortable" },
  { value: "with_help", labelKey: "assessment.option.comfort.with_help" },
  { value: "uncomfortable", labelKey: "assessment.option.comfort.uncomfortable" },
];

const GOALS: OptionDef[] = [
  { value: "housing", labelKey: "assessment.option.goal.housing" },
  { value: "food", labelKey: "assessment.option.goal.food" },
  { value: "utilities", labelKey: "assessment.option.goal.utilities" },
  { value: "health", labelKey: "assessment.option.goal.health" },
  { value: "job", labelKey: "assessment.option.goal.job" },
  { value: "training", labelKey: "assessment.option.goal.training" },
  { value: "transportation", labelKey: "assessment.option.goal.transportation" },
  { value: "digital", labelKey: "assessment.option.goal.digital" },
  { value: "family_care", labelKey: "assessment.option.goal.family_care" },
  { value: "other", labelKey: "assessment.option.goal.other" },
];

const URGENCY: OptionDef[] = [
  { value: "this_week", labelKey: "assessment.option.urgency.this_week" },
  { value: "this_month", labelKey: "assessment.option.urgency.this_month" },
  { value: "planning_ahead", labelKey: "assessment.option.urgency.planning_ahead" },
];

const OPTIONS: Partial<Record<ScreenId, OptionDef[]>> = {
  employment: EMPLOYMENT,
  income: INCOME,
  housingSituation: HOUSING,
  housingHardship: HARDSHIP,
  foodSecurity: FOOD,
  foodBarriers: FOOD_BARRIERS,
  utilityTrouble: YES_NO,
  utilityTypes: UTILITIES,
  insurance: INSURANCE,
  hasPcp: YES_NO,
  wantsClinicHelp: YES_NO,
  careAccess: CARE,
  careBarriers: CARE_BARRIERS,
  unmetNeeds: NEEDS,
  education: EDUCATION,
  training: TRAINING,
  employmentBarriers: WORK_BARRIERS,
  transportModes: MODES,
  reliability: RELIABILITY,
  hardToReach: DESTINATIONS,
  digitalAccess: ACCESS,
  digitalComfort: COMFORT,
  goals: GOALS,
  urgency: URGENCY,
};

const EXCLUSIVE: Partial<Record<ScreenId, string[]>> = {
  unmetNeeds: ["none"],
  training: ["none"],
  employmentBarriers: ["none"],
  transportModes: ["cannot_get_there"],
  hardToReach: ["not_hard"],
  digitalAccess: ["none"],
};

const KIND: Record<ScreenId, ScreenKind> = {
  intro: "intro",
  zip: "text",
  adults: "count",
  children: "count",
  otherDependents: "count",
  consent: "consent",
  employment: "single",
  income: "single",
  housingSituation: "single",
  housingHardship: "single",
  foodSecurity: "single",
  foodBarriers: "multi",
  utilityTrouble: "single",
  utilityTypes: "multi",
  insurance: "single",
  hasPcp: "single",
  wantsClinicHelp: "single",
  careAccess: "single",
  careBarriers: "multi",
  unmetNeeds: "multi",
  workStatusReview: "work",
  education: "single",
  training: "multi",
  careerGoal: "text",
  employmentBarriers: "multi",
  transportModes: "multi",
  reliability: "single",
  hardToReach: "multi",
  digitalAccess: "multi",
  digitalComfort: "single",
  goals: "goals",
  urgency: "single",
  review: "review",
  results: "results",
};

const SECTION: Record<ScreenId, SectionNumber | null> = {
  intro: null,
  zip: 1,
  adults: 1,
  children: 1,
  otherDependents: 1,
  consent: null,
  employment: 2,
  income: 2,
  housingSituation: 2,
  housingHardship: 2,
  foodSecurity: 2,
  foodBarriers: 2,
  utilityTrouble: 2,
  utilityTypes: 2,
  insurance: 3,
  hasPcp: 3,
  wantsClinicHelp: 3,
  careAccess: 3,
  careBarriers: 3,
  unmetNeeds: 3,
  workStatusReview: 4,
  education: 4,
  training: 4,
  careerGoal: 4,
  employmentBarriers: 4,
  transportModes: 5,
  reliability: 5,
  hardToReach: 5,
  digitalAccess: 6,
  digitalComfort: 6,
  goals: 7,
  urgency: 7,
  review: null,
  results: null,
};

const TITLE: Record<ScreenId, MessageKey> = {
  intro: "assessment.intro.title",
  zip: "assessment.household.zip.title",
  adults: "assessment.household.adults.title",
  children: "assessment.household.children.title",
  otherDependents: "assessment.household.otherDependents.title",
  consent: "assessment.consent.title",
  employment: "assessment.financial.employment.title",
  income: "assessment.financial.income.title",
  housingSituation: "assessment.financial.housing.title",
  housingHardship: "assessment.financial.housingHardship.title",
  foodSecurity: "assessment.financial.food.title",
  foodBarriers: "assessment.financial.foodBarriers.title",
  utilityTrouble: "assessment.financial.utilities.title",
  utilityTypes: "assessment.financial.utilityTypes.title",
  insurance: "assessment.health.insurance.title",
  hasPcp: "assessment.health.pcp.title",
  wantsClinicHelp: "assessment.health.clinic.title",
  careAccess: "assessment.health.care.title",
  careBarriers: "assessment.health.careBarriers.title",
  unmetNeeds: "assessment.health.needs.title",
  workStatusReview: "assessment.education.workReview.title",
  education: "assessment.education.level.title",
  training: "assessment.education.training.title",
  careerGoal: "assessment.education.career.title",
  employmentBarriers: "assessment.education.barriers.title",
  transportModes: "assessment.transport.modes.title",
  reliability: "assessment.transport.reliability.title",
  hardToReach: "assessment.transport.destinations.title",
  digitalAccess: "assessment.digital.access.title",
  digitalComfort: "assessment.digital.comfort.title",
  goals: "assessment.priorities.goals.title",
  urgency: "assessment.priorities.urgency.title",
  review: "assessment.review.title",
  results: "assessment.results.title",
};

const HINT: Partial<Record<ScreenId, MessageKey>> = {
  income: "assessment.financial.income.hint",
  goals: "assessment.priorities.goals.hint",
};

const SECTION_NAME: Record<SectionNumber, MessageKey> = {
  1: "assessment.section.household",
  2: "assessment.section.financial",
  3: "assessment.section.health",
  4: "assessment.section.education",
  5: "assessment.section.transportation",
  6: "assessment.section.digital",
  7: "assessment.section.priorities",
};

export function screenKind(screen: ScreenId): ScreenKind {
  return KIND[screen];
}

export function screenSection(screen: ScreenId): SectionNumber | null {
  return SECTION[screen];
}

export function sectionNameKey(section: SectionNumber): MessageKey {
  return SECTION_NAME[section];
}

export function screenTitleKey(screen: ScreenId): MessageKey {
  return TITLE[screen];
}

export function screenHintKey(screen: ScreenId): MessageKey | null {
  return HINT[screen] ?? null;
}

export function screenOptions(screen: ScreenId, draft: DraftAssessment | null): OptionDef[] {
  if (screen === "employmentBarriers" && draft?.sensitiveConsent !== "granted") {
    return WORK_BARRIERS.filter((option) => option.value !== "health_or_disability");
  }
  return OPTIONS[screen] ?? [];
}

export function screenExclusive(screen: ScreenId): string[] {
  return EXCLUSIVE[screen] ?? [];
}

export function optionLabelKey(screen: ScreenId, value: string): MessageKey | null {
  const match = (OPTIONS[screen] ?? []).find((option) => option.value === value);
  return match?.labelKey ?? null;
}

export function allowsOptOut(screen: ScreenId): boolean {
  const kind = screenKind(screen);
  return kind === "single" || kind === "multi" || kind === "count" || kind === "text" || kind === "goals";
}

export function allowsSkip(screen: ScreenId): boolean {
  return allowsOptOut(screen);
}
