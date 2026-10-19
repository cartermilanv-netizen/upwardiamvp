import { digitalFlags, hasDigitalFlag, hasTransportationBarrier } from "@/lib/barriers";
import { verifiedDateLabel } from "@/lib/dates";
import { joinClauses, t, type MessageKey } from "@/lib/messages";
import type {
  CatalogCategory,
  Channel,
  DraftAssessment,
  GoalId,
  IncomeRange,
  MatchDecision,
  MissingFact,
  RuleId,
  TrainingNeed,
  VerifiedCatalogEntry,
} from "@/lib/types";

export type WhyCopy = {
  heading: string;
  lines: string[];
  text: string;
};

export type ChannelChoice = {
  channel: Channel;
  barrierNote: "transportation" | "digital" | "both" | null;
  inPersonOptional: boolean;
  askBecauseNoPhone: boolean;
  trustedPersonOnline: boolean;
  homeWifiNote: boolean;
};

export type MatchRow = {
  entry: VerifiedCatalogEntry;
  decision: MatchDecision;
  why: WhyCopy;
  channel: ChannelChoice | null;
  category: CatalogCategory;
};

const RULES: RuleId[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"];

const RULE_CATEGORIES: Record<RuleId, CatalogCategory[]> = {
  R1: ["food"],
  R2: ["housing"],
  R3: ["utilities"],
  R4: ["health_coverage"],
  R5: ["care_access"],
  R6: ["employment", "training"],
  R7: ["transportation"],
  R8: ["digital"],
  R9: ["family_care"],
};

const FACT_ORDER: MissingFact[] = [
  "zip",
  "children",
  "income_range",
  "insurance",
  "catalog_service_area",
  "catalog_income_rule",
];

const INCOME_ORDER: IncomeRange[] = ["under_15k", "15_to_29k", "30_to_49k", "50_to_74k", "75k_or_more"];

const GOAL_CATEGORIES: Record<GoalId, CatalogCategory[]> = {
  housing: ["housing"],
  food: ["food"],
  utilities: ["utilities"],
  health: ["health_coverage", "care_access"],
  job: ["employment"],
  training: ["training"],
  transportation: ["transportation"],
  digital: ["digital"],
  family_care: ["family_care"],
  other: [],
};

const TRAINING_KEYWORDS: { need: TrainingNeed; needles: string[]; key: MessageKey }[] = [
  { need: "ged", needles: ["ged", "high school"], key: "assessment.why.training.ged" },
  { need: "english", needles: ["english"], key: "assessment.why.training.english" },
  { need: "certificate", needles: ["certificate"], key: "assessment.why.training.certificate" },
  { need: "digital_skills", needles: ["computer"], key: "assessment.why.training.digital_skills" },
  { need: "resume", needles: ["resume", "interview"], key: "assessment.why.training.resume" },
  { need: "business", needles: ["business"], key: "assessment.why.training.business" },
];

type Focus = "employment" | "training";

type Signal = {
  rule: RuleId;
  key: MessageKey;
  vars?: Record<string, string>;
  focus?: Focus;
};

function sensitiveOpen(draft: DraftAssessment): boolean {
  return draft.sensitiveConsent === "granted";
}

function financial(draft: DraftAssessment) {
  if (!sensitiveOpen(draft) || draft.financial?.consent !== "granted") return null;
  return draft.financial;
}

function health(draft: DraftAssessment) {
  if (!sensitiveOpen(draft) || draft.health?.consent !== "granted") return null;
  return draft.health;
}

function goals(draft: DraftAssessment): GoalId[] {
  const answer = draft.priorities.topGoals;
  return answer?.status === "answered" ? answer.value : [];
}

function hasGoal(draft: DraftAssessment, goal: GoalId): boolean {
  return goals(draft).includes(goal);
}

export function goalIndexForCategory(selected: readonly GoalId[], category: CatalogCategory): number {
  let best = 100;
  selected.forEach((goal, index) => {
    if (GOAL_CATEGORIES[goal].includes(category)) best = Math.min(best, index);
  });
  return best;
}

function signals(draft: DraftAssessment): Signal[] {
  const found: Signal[] = [];
  const money = financial(draft);
  const care = health(draft);

  if (money?.foodSecurity?.status === "answered" && money.foodSecurity.value === "often_not_enough") {
    found.push({ rule: "R1", key: "assessment.why.food.often" });
  }
  if (money?.foodSecurity?.status === "answered" && money.foodSecurity.value === "sometimes_not_enough") {
    found.push({ rule: "R1", key: "assessment.why.food.sometimes" });
  }
  if (care?.unmetSocialNeeds?.status === "answered" && care.unmetSocialNeeds.value.includes("food")) {
    found.push({ rule: "R1", key: "assessment.why.food.need" });
  }
  if (hasGoal(draft, "food")) found.push({ rule: "R1", key: "assessment.why.food.goal" });

  if (money?.housingSituation?.status === "answered" && money.housingSituation.value === "unhoused") {
    found.push({ rule: "R2", key: "assessment.why.housing.unhoused" });
  }
  if (money?.housingCostHardship?.status === "answered" && money.housingCostHardship.value === "yes") {
    found.push({ rule: "R2", key: "assessment.why.housing.yes" });
  }
  if (money?.housingCostHardship?.status === "answered" && money.housingCostHardship.value === "sometimes") {
    found.push({ rule: "R2", key: "assessment.why.housing.sometimes" });
  }
  if (care?.unmetSocialNeeds?.status === "answered" && care.unmetSocialNeeds.value.includes("housing")) {
    found.push({ rule: "R2", key: "assessment.why.housing.need" });
  }
  if (hasGoal(draft, "housing")) found.push({ rule: "R2", key: "assessment.why.housing.goal" });

  if (money?.utilityTrouble?.status === "answered" && money.utilityTrouble.value === "yes") {
    found.push({ rule: "R3", key: "assessment.why.utilities.yes" });
  }
  if (hasGoal(draft, "utilities")) found.push({ rule: "R3", key: "assessment.why.utilities.goal" });

  if (care?.insurance?.status === "answered" && care.insurance.value === "none") {
    found.push({ rule: "R4", key: "assessment.why.coverage.none" });
  }
  if (care?.unmetSocialNeeds?.status === "answered" && care.unmetSocialNeeds.value.includes("coverage_or_doctor")) {
    found.push({ rule: "R4", key: "assessment.why.coverage.need" });
    found.push({ rule: "R5", key: "assessment.why.care.need" });
  }
  if (hasGoal(draft, "health")) found.push({ rule: "R4", key: "assessment.why.coverage.goal" });

  if (care?.hasPcp?.status === "answered" && care.hasPcp.value === "no" && care.wantsClinicHelp?.status === "answered" && care.wantsClinicHelp.value === "yes") {
    found.push({ rule: "R5", key: "assessment.why.care.clinic" });
  }
  if (care?.careAccessDifficulty?.status === "answered" && care.careAccessDifficulty.value === "yes") {
    found.push({ rule: "R5", key: "assessment.why.care.difficulty" });
  }

  if (money?.employment?.status === "answered" && money.employment.value === "looking") {
    found.push({ rule: "R6", key: "assessment.why.work.looking", focus: "employment" });
  }
  const workBarriers = draft.educationEmployment.employmentBarriers;
  if (workBarriers?.status === "answered" && workBarriers.value.includes("skills")) {
    found.push({ rule: "R6", key: "assessment.why.work.skills", focus: "employment" });
  }
  const training = draft.educationEmployment.trainingNeeds;
  if (training?.status === "answered" && training.value.some((value) => value !== "none")) {
    found.push({ rule: "R6", key: "assessment.why.training.generic", focus: "training" });
  }
  if (hasGoal(draft, "job")) found.push({ rule: "R6", key: "assessment.why.work.goalJob", focus: "employment" });
  if (hasGoal(draft, "training")) found.push({ rule: "R6", key: "assessment.why.work.goalTraining", focus: "training" });

  if (hasTransportationBarrier(draft)) {
    const modes = draft.transportation.modes;
    if (modes?.status === "answered" && modes.value.includes("cannot_get_there")) {
      found.push({ rule: "R7", key: "assessment.why.transport.cannot" });
    }
    const reliability = draft.transportation.reliability;
    if (reliability?.status === "answered" && reliability.value === "rarely") {
      found.push({ rule: "R7", key: "assessment.why.transport.rarely" });
    }
    const destinations = draft.transportation.hardToReach;
    if (destinations?.status === "answered" && destinations.value.some((value) => value !== "not_hard")) {
      const places = joinClauses(
        destinations.value
          .filter((value) => value !== "not_hard")
          .map((value) => t(`assessment.option.destination.${value}`)),
      );
      found.push({ rule: "R7", key: "assessment.why.transport.destinations", vars: { places } });
    }
    if (care?.careBarriers?.status === "answered" && care.careBarriers.value.includes("transport")) {
      found.push({ rule: "R7", key: "assessment.why.transport.care" });
    }
    if (workBarriers?.status === "answered" && workBarriers.value.includes("transportation")) {
      found.push({ rule: "R7", key: "assessment.why.transport.work" });
    }
  }
  if (hasGoal(draft, "transportation")) found.push({ rule: "R7", key: "assessment.why.transport.goal" });

  const digital = digitalFlags(draft);
  if (digital.none) found.push({ rule: "R8", key: "assessment.why.digital.none" });
  if (draft.digital.comfort?.status === "answered" && draft.digital.comfort.value === "uncomfortable") {
    found.push({ rule: "R8", key: "assessment.why.digital.uncomfort" });
  } else if (digital.uncomfort) {
    found.push({ rule: "R8", key: "assessment.why.digital.withHelp" });
  }
  if (digital.intermittent) found.push({ rule: "R8", key: "assessment.why.digital.intermittent" });
  if (hasGoal(draft, "digital")) found.push({ rule: "R8", key: "assessment.why.digital.goal" });

  if (workBarriers?.status === "answered" && workBarriers.value.includes("childcare")) {
    found.push({ rule: "R9", key: "assessment.why.family.barrier" });
  }
  if (care?.unmetSocialNeeds?.status === "answered" && care.unmetSocialNeeds.value.includes("family_care")) {
    found.push({ rule: "R9", key: "assessment.why.family.need" });
  }
  if (hasGoal(draft, "family_care")) found.push({ rule: "R9", key: "assessment.why.family.goal" });

  return found;
}

export function firedRuleIds(draft: DraftAssessment): RuleId[] {
  const present = new Set(signals(draft).map((signal) => signal.rule));
  return RULES.filter((rule) => present.has(rule));
}

export function isUsableCatalogRow(row: {
  verified?: unknown;
  sourceName?: unknown;
  claimText?: unknown;
  lastVerified?: unknown;
  name?: unknown;
}): boolean {
  if (row.verified !== true) return false;
  if (typeof row.sourceName !== "string" || row.sourceName.trim() === "") return false;
  if (typeof row.claimText !== "string" || row.claimText.trim() === "") return false;
  if (typeof row.name !== "string" || row.name.trim() === "") return false;
  if (typeof row.lastVerified !== "string" || Number.isNaN(Date.parse(row.lastVerified))) return false;
  return true;
}

function compareIncome(household: IncomeRange, ceiling: IncomeRange): "below" | "overlap" | "above" {
  const householdIndex = INCOME_ORDER.indexOf(household);
  const ceilingIndex = INCOME_ORDER.indexOf(ceiling);
  if (householdIndex > ceilingIndex) return "above";
  if (householdIndex < ceilingIndex) return "below";
  return "overlap";
}

function categoryFor(rule: RuleId, entry: VerifiedCatalogEntry, signal: Signal | undefined): CatalogCategory {
  const available = RULE_CATEGORIES[rule].filter((category) => entry.categories.includes(category));
  if (available.length === 1) return available[0] ?? RULE_CATEGORIES[rule][0];
  if (signal?.focus === "training" && available.includes("training")) return "training";
  if (available.includes("employment")) return "employment";
  return available[0] ?? RULE_CATEGORIES[rule][0];
}

function trainingSentence(draft: DraftAssessment, entry: VerifiedCatalogEntry): { key: MessageKey } | null {
  const training = draft.educationEmployment.trainingNeeds;
  if (training?.status !== "answered") return null;
  const claim = entry.claimText.toLowerCase();
  const categoryNames = entry.categories.join(" ").toLowerCase();
  for (const item of TRAINING_KEYWORDS) {
    if (!training.value.includes(item.need)) continue;
    const mentioned = item.needles.some((needle) => claim.includes(needle) || categoryNames.includes(needle));
    if (mentioned) return { key: item.key };
  }
  return null;
}

function sentenceFor(draft: DraftAssessment, entry: VerifiedCatalogEntry, rule: RuleId): Signal {
  const matching = signals(draft).filter((signal) => signal.rule === rule);
  const picked = matching[0] ?? { rule, key: "assessment.why.food.goal" as MessageKey };
  if (rule === "R6" && picked.focus === "training") {
    const specific = trainingSentence(draft, entry);
    if (specific) return { ...picked, key: specific.key };
  }
  return picked;
}

function missingFactLabels(facts: MissingFact[]): string {
  return joinClauses(facts.map((fact) => t(`assessment.missingFact.${fact}`)));
}

export function whyCopy(draft: DraftAssessment, entry: VerifiedCatalogEntry, decision: MatchDecision, category: CatalogCategory): WhyCopy {
  const heading = t("assessment.why.heading");
  const signal = decision.ruleId === "none" ? undefined : sentenceFor(draft, entry, decision.ruleId);
  const first = signal ? t(signal.key, signal.vars) : "";
  const second = t("assessment.why.catalog", {
    name: entry.name,
    category: t(`assessment.category.${category}`),
    claimText: entry.claimText,
    sourceName: entry.sourceName,
    lastVerified: verifiedDateLabel(entry.lastVerified),
  });
  const lines = [first, second];
  if (decision.kind === "needs_information" && decision.missingEligibility.length > 0) {
    lines.push(t("assessment.why.missing", { facts: missingFactLabels(decision.missingEligibility) }));
  }
  return { heading, lines, text: [heading, ...lines].join("\n") };
}

function sortFacts(facts: MissingFact[]): MissingFact[] {
  return [...facts].sort((a, b) => FACT_ORDER.indexOf(a) - FACT_ORDER.indexOf(b));
}

function pickRule(draft: DraftAssessment, entry: VerifiedCatalogEntry, rules: RuleId[]): RuleId {
  const selected = goals(draft);
  return [...rules].sort((a, b) => {
    const aCategories = RULE_CATEGORIES[a].filter((category) => entry.categories.includes(category));
    const bCategories = RULE_CATEGORIES[b].filter((category) => entry.categories.includes(category));
    const aIndex = Math.min(...aCategories.map((category) => goalIndexForCategory(selected, category)));
    const bIndex = Math.min(...bCategories.map((category) => goalIndexForCategory(selected, category)));
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  })[0] ?? rules[0];
}

export function chooseChannel(draft: DraftAssessment, entry: VerifiedCatalogEntry): ChannelChoice | null {
  const channels = entry.channels;
  if (channels.length === 0) return null;
  const has = (channel: Channel) => channels.includes(channel);
  const transport = hasTransportationBarrier(draft);
  const digital = digitalFlags(draft);
  const strongDigital = digital.none || digital.uncomfort;
  const note = (transportNote: boolean, digitalNote: boolean): ChannelChoice["barrierNote"] => {
    if (transportNote && digitalNote) return "both";
    if (transportNote) return "transportation";
    if (digitalNote) return "digital";
    return null;
  };

  if (transport && (has("phone") || has("mail"))) {
    return {
      channel: has("phone") ? "phone" : "mail",
      barrierNote: note(true, strongDigital),
      inPersonOptional: has("in_person"),
      askBecauseNoPhone: false,
      trustedPersonOnline: false,
      homeWifiNote: false,
    };
  }
  if (transport && channels.length === 1 && has("in_person")) {
    return {
      channel: "in_person",
      barrierNote: note(true, strongDigital),
      inPersonOptional: false,
      askBecauseNoPhone: true,
      trustedPersonOnline: false,
      homeWifiNote: false,
    };
  }
  if (strongDigital && (has("phone") || has("in_person") || has("mail"))) {
    const channel = has("phone") ? "phone" : has("in_person") ? "in_person" : "mail";
    return {
      channel,
      barrierNote: note(transport && channel === "in_person", true),
      inPersonOptional: false,
      askBecauseNoPhone: false,
      trustedPersonOnline: false,
      homeWifiNote: false,
    };
  }
  if (strongDigital && has("online") && channels.every((channel) => channel === "online")) {
    return {
      channel: "online",
      barrierNote: note(false, true),
      inPersonOptional: false,
      askBecauseNoPhone: false,
      trustedPersonOnline: true,
      homeWifiNote: false,
    };
  }
  const order: Channel[] = ["phone", "online", "in_person", "mail"];
  const channel = order.find(has) ?? channels[0];
  const homeWifiNote = digital.intermittent && channel === "online";
  return {
    channel,
    barrierNote: note(false, homeWifiNote),
    inPersonOptional: false,
    askBecauseNoPhone: false,
    trustedPersonOnline: false,
    homeWifiNote,
  };
}

function zipAnswered(draft: DraftAssessment): string | null {
  const zip = draft.household.zip;
  if (zip?.status !== "answered") return null;
  return zip.value;
}

function childrenAnswered(draft: DraftAssessment): number | null {
  const children = draft.household.children;
  if (children?.status !== "answered") return null;
  return children.value;
}

export function decideEntry(draft: DraftAssessment, entry: VerifiedCatalogEntry): MatchRow {
  const active = firedRuleIds(draft).filter((rule) => RULE_CATEGORIES[rule].some((category) => entry.categories.includes(category)));
  if (active.length === 0) {
    const decision: MatchDecision = { kind: "not_applicable", ruleId: "none" };
    const category = entry.categories[0] ?? "food";
    return { entry, decision, why: whyCopy(draft, entry, decision, category), channel: null, category };
  }
  const ruleId = pickRule(draft, entry, active);
  const signal = sentenceFor(draft, entry, ruleId);
  const category = categoryFor(ruleId, entry, signal);

  const outside = outsideServiceArea(draft, entry);
  if (outside) {
    return row(draft, entry, { kind: "not_applicable", ruleId }, category);
  }
  if (entry.eligibility.requiresChildren === true && childrenAnswered(draft) === 0) {
    return row(draft, entry, { kind: "not_applicable", ruleId }, category);
  }
  const income = incomeRelation(draft, entry);
  if (income === "above") {
    return row(draft, entry, { kind: "not_applicable", ruleId }, category);
  }

  const missing: MissingFact[] = [];
  if (entry.eligibility.requiresZipInServiceArea) {
    const area = entry.serviceAreaZips;
    const zip = zipAnswered(draft);
    if (area === "unknown") {
      missing.push("catalog_service_area");
      if (!zip) missing.push("zip");
    } else if (!zip) {
      missing.push("zip");
    }
  }
  if (entry.eligibility.requiresChildren === true && childrenAnswered(draft) === null) missing.push("children");
  if (entry.eligibility.incomeCeiling) {
    if (!incomeAnswered(draft)) missing.push("income_range");
    else if (income === "overlap") missing.push("catalog_income_rule");
  }
  if (active.includes("R4") && entry.categories.includes("health_coverage") && !insuranceAnswered(draft)) {
    missing.push("insurance");
  }

  const missingEligibility = sortFacts(missing);
  if (missingEligibility.length > 0) {
    return row(draft, entry, { kind: "needs_information", ruleId, missingEligibility }, category);
  }
  return row(draft, entry, { kind: "possible_help", ruleId, missingEligibility: [] }, category);
}

function row(draft: DraftAssessment, entry: VerifiedCatalogEntry, decision: MatchDecision, category: CatalogCategory): MatchRow {
  return {
    entry,
    decision,
    category,
    why: whyCopy(draft, entry, decision, category),
    channel: decision.kind === "not_applicable" ? null : chooseChannel(draft, entry),
  };
}

function outsideServiceArea(draft: DraftAssessment, entry: VerifiedCatalogEntry): boolean {
  if (!entry.eligibility.requiresZipInServiceArea) return false;
  if (entry.serviceAreaZips === "unknown") return false;
  const zip = zipAnswered(draft);
  if (!zip) return false;
  return !entry.serviceAreaZips.includes(zip);
}

function incomeAnswered(draft: DraftAssessment): boolean {
  const money = financial(draft);
  return money?.incomeRange?.status === "answered";
}

function incomeRelation(draft: DraftAssessment, entry: VerifiedCatalogEntry): "below" | "overlap" | "above" | "missing" | "none" {
  const ceiling = entry.eligibility.incomeCeiling;
  if (!ceiling) return "none";
  const money = financial(draft);
  if (money?.incomeRange?.status !== "answered") return "missing";
  return compareIncome(money.incomeRange.value, ceiling);
}

function insuranceAnswered(draft: DraftAssessment): boolean {
  const care = health(draft);
  return care?.insurance?.status === "answered";
}

export function matchCatalog(draft: DraftAssessment, catalog: readonly Partial<VerifiedCatalogEntry>[]): MatchRow[] {
  const rows: MatchRow[] = [];
  for (const candidate of catalog) {
    if (!isUsableCatalogRow(candidate)) continue;
    rows.push(decideEntry(draft, candidate as VerifiedCatalogEntry));
  }
  return rows;
}

export function hasDigitalBarrier(draft: DraftAssessment): boolean {
  return hasDigitalFlag(draft);
}
