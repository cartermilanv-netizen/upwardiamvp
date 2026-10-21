import { DEMO_AS_OF, FOLLOW_UP_DAYS, plusDays } from "@/lib/impact/constants";
import {
  BARRIER_LABELS,
  PLACEMENTS,
  PRIMARY_CATEGORIES,
  resourceFor,
} from "@/lib/impact/catalog";
import { idempotencyKey } from "@/lib/impact/idempotency";
import { needForImpactCategory } from "@/lib/impact/needs";
import { assertVerification } from "@/lib/impact/verify";
import type {
  ActionFact,
  ApplicationFact,
  ApplicationStatus,
  BarrierFact,
  CategoryId,
  EventFact,
  GoalFact,
  HpObjectiveId,
  OutcomeFact,
  OutcomeType,
  ResidentFact,
} from "@/lib/impact/types";

const WEEK_OFFSETS = [2, 10, 18, 30, 45, 70] as const;
const COMMON_BARRIERS = ["transportation", "cost", "hours", "childcare", "no_device"] as const;

export type DemoDataset = {
  residents: ResidentFact[];
  events: EventFact[];
  outcomes: OutcomeFact[];
  barriers: BarrierFact[];
  goals: GoalFact[];
  actions: ActionFact[];
  applications: ApplicationFact[];
};

function residentId(n: number): string {
  return `demo-r-${String(n).padStart(4, "0")}`;
}

function applicationStage(n: number): "none" | ApplicationStatus {
  const slot = n % 10;
  if (slot <= 1) return "submitted_confirmed";
  if (slot <= 4) return "draft_saved";
  if (slot <= 7) return "started";
  return "none";
}

function goalTypeFor(category: CategoryId): string {
  if (category === "education") return "training";
  return category;
}

function actionTypeFor(category: CategoryId): string {
  if (category === "food") return "food_resource";
  if (category === "health") return "care_navigation";
  if (category === "housing") return "housing_navigation";
  if (category === "education") return "training_step";
  if (category === "transportation") return "ride_step";
  return "utility_step";
}

function objectivesFor(category: CategoryId): HpObjectiveId[] {
  if (category === "food") return ["NWS-01"];
  if (category === "health") return ["AHS-07", "AHS-04"];
  if (category === "housing" || category === "education") return ["SDOH-01"];
  return [];
}

function outcomeTypeFor(objective: HpObjectiveId, category: CategoryId): OutcomeType {
  if (objective === "AHS-07") return "usual_source_of_care";
  if (objective === "NWS-01") return "food_access";
  if (objective === "AHS-04") return "accessed_resource";
  if (category === "housing") return "housing";
  return "education_or_workforce";
}

function indicator(n: number, objective: HpObjectiveId, phase: "baseline" | "follow_up"): "positive" | "negative" {
  const salt = objective === "AHS-07" ? 1 : objective === "NWS-01" ? 2 : objective === "AHS-04" ? 3 : 4;
  if (phase === "baseline") return (n + salt) % 7 < 3 ? "positive" : "negative";
  return (n + salt) % 7 < 5 ? "positive" : "negative";
}

function pushEvent(events: EventFact[], event: Omit<EventFact, "dedupeKey" | "source" | "serverConfirmed"> & { serverConfirmed?: boolean }): void {
  const needId =
    event.needId ??
    (event.category && (event.type === "resource_viewed" || event.type === "resource_saved") ? needForImpactCategory(event.category) : null);
  const row: EventFact = {
    ...event,
    needId,
    serverConfirmed: event.type === "outcome_verified" || event.type === "application_submitted_confirmed",
    source: "demo_fixture",
    dedupeKey: "",
  };
  row.dedupeKey = idempotencyKey(row);
  events.push(row);
}

export function buildDemoDataset(asOf = DEMO_AS_OF): DemoDataset {
  const residents: ResidentFact[] = [];
  const events: EventFact[] = [];
  const outcomes: OutcomeFact[] = [];
  const barriers: BarrierFact[] = [];
  const goals: GoalFact[] = [];
  const actions: ActionFact[] = [];
  const applications: ApplicationFact[] = [];
  let n = 0;

  for (const place of PLACEMENTS) {
    for (let i = 0; i < place.count; i += 1) {
      addParticipant(n, place, asOf, { residents, events, outcomes, barriers, goals, actions, applications });
      n += 1;
    }
  }

  addExcluded(residents, events, asOf);
  return { residents, events, outcomes, barriers, goals, actions, applications };
}

function addParticipant(
  n: number,
  place: { organizationId: string; jurisdictionId: string; city: string },
  asOf: string,
  bag: DemoDataset,
): void {
  const id = residentId(n);
  const when = plusDays(asOf, -WEEK_OFFSETS[n % WEEK_OFFSETS.length]);
  const category = PRIMARY_CATEGORIES[n % PRIMARY_CATEGORIES.length] ?? "food";
  const primary = resourceFor(category);
  bag.residents.push({
    id,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    consent: "granted",
    consentedAt: plusDays(asOf, -120),
    withdrawnAt: null,
    deletedAt: null,
  });

  pushEvent(bag.events, baseEvent(id, place, "assessment_started", when));
  if (n % 5 !== 0) pushEvent(bag.events, baseEvent(id, place, "assessment_completed", when));
  if (n === 0) pushEvent(bag.events, { ...baseEvent(id, place, "assessment_started", when), id: "dup-assessment" });

  pushEvent(bag.events, {
    ...baseEvent(id, place, "resource_viewed", when),
    id: `${id}-view-primary`,
    resourceId: primary.id,
    programId: primary.programId,
    category,
  });
  if (n === 1) {
    pushEvent(bag.events, {
      ...baseEvent(id, place, "resource_viewed", when),
      id: "dup-view",
      resourceId: primary.id,
      programId: primary.programId,
      category,
    });
  }
  if (n % 2 === 0) {
    pushEvent(bag.events, {
      ...baseEvent(id, place, "resource_saved", when),
      id: `${id}-save`,
      resourceId: primary.id,
      programId: primary.programId,
      category,
    });
  }
  if (n % 5 === 0) {
    const ride = resourceFor("transportation");
    pushEvent(bag.events, {
      ...baseEvent(id, place, "resource_viewed", when),
      id: `${id}-view-ride`,
      resourceId: ride.id,
      programId: ride.programId,
      category: "transportation",
    });
  }
  if (n % 7 === 0) {
    const utility = resourceFor("utilities");
    pushEvent(bag.events, {
      ...baseEvent(id, place, "resource_viewed", when),
      id: `${id}-view-utility`,
      resourceId: utility.id,
      programId: utility.programId,
      category: "utilities",
    });
  }
  if (n % 4 === 0) {
    pushEvent(bag.events, {
      ...baseEvent(id, place, "chat_session_started", when),
      id: `${id}-chat`,
      sessionId: `chat-${id}`,
    });
  }

  const actionId = `action-${id}`;
  const completed = n % 3 !== 1;
  bag.actions.push({
    id: actionId,
    residentId: id,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    actionType: actionTypeFor(category),
    goalId: `goal-${id}`,
    startedAt: when,
    completedAt: completed ? when : null,
  });
  pushEvent(bag.events, { ...baseEvent(id, place, "action_started", when), id: `${id}-action-start`, actionId, category, programId: primary.programId });
  if (completed) {
    pushEvent(bag.events, { ...baseEvent(id, place, "action_completed", when), id: `${id}-action-done`, actionId, category, programId: primary.programId });
  }

  const stage = applicationStage(n);
  if (stage !== "none") {
    const applicationId = `application-${id}`;
    bag.applications.push({
      id: applicationId,
      residentId: id,
      organizationId: place.organizationId,
      jurisdictionId: place.jurisdictionId,
      programId: primary.programId,
      status: stage,
    });
    pushEvent(bag.events, {
      ...baseEvent(id, place, "application_started", when),
      id: `${id}-app-start`,
      applicationId,
      programId: primary.programId,
      category,
    });
    if (stage === "draft_saved" || stage === "submitted_confirmed") {
      pushEvent(bag.events, {
        ...baseEvent(id, place, "application_draft_saved", when),
        id: `${id}-app-draft`,
        applicationId,
        programId: primary.programId,
        category,
      });
      if (n === 2) {
        pushEvent(bag.events, {
          ...baseEvent(id, place, "application_draft_saved", when),
          id: "dup-draft",
          applicationId,
          programId: primary.programId,
          category,
        });
      }
    }
    if (stage === "submitted_confirmed") {
      pushEvent(bag.events, {
        ...baseEvent(id, place, "application_submitted_confirmed", when),
        id: `${id}-app-submit`,
        applicationId,
        programId: primary.programId,
        category,
      });
    }
  }

  const goalStatus = n % 5 === 0 ? "completed" : "active";
  const objective = objectivesFor(category)[0] ?? null;
  bag.goals.push({
    id: `goal-${id}`,
    residentId: id,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    goalType: goalTypeFor(category),
    status: goalStatus,
    objectiveId: objective,
    completedAt: goalStatus === "completed" ? when : null,
  });
  if (goalStatus === "completed") {
    pushEvent(bag.events, { ...baseEvent(id, place, "goal_completed", when), id: `${id}-goal`, goalId: `goal-${id}`, category, programId: primary.programId });
  }

  const barrier = n < 6 ? "language" : COMMON_BARRIERS[n % COMMON_BARRIERS.length] ?? "cost";
  bag.barriers.push({
    id: `barrier-${id}`,
    residentId: id,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    barrier,
    occurredAt: when,
  });

  for (const objectiveId of objectivesFor(category)) {
    addOutcomePair(n, id, place, category, objectiveId, when, bag.outcomes, bag.events);
  }
  addExtraOutcome(n, id, place, when, bag.outcomes, bag.events);
}

function addOutcomePair(
  n: number,
  residentIdValue: string,
  place: { organizationId: string; jurisdictionId: string; city: string },
  category: CategoryId,
  objectiveId: HpObjectiveId,
  when: string,
  outcomes: OutcomeFact[],
  events: EventFact[],
): void {
  const verified = n % 3 !== 0;
  const method = verified ? "partner_roster_check" : null;
  const source = verified ? "Fictional partner notice" : null;
  const followId = `outcome-${residentIdValue}-${objectiveId}-follow`;
  const baseId = `outcome-${residentIdValue}-${objectiveId}-base`;
  const outcomeType = outcomeTypeFor(objectiveId, category);
  outcomes.push({
    id: baseId,
    residentId: residentIdValue,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    outcomeType,
    objectiveId,
    phase: "baseline",
    indicator: indicator(n, objectiveId, "baseline"),
    followUpIntervalDays: FOLLOW_UP_DAYS,
    consent: "granted",
    evidence: "self_reported",
    source: "demo_fixture",
    verificationMethod: null,
    verificationSource: null,
    recordedOn: plusDays(when, -FOLLOW_UP_DAYS),
  });
  const followEvidence = verified ? "verified" : "self_reported";
  assertVerification(followEvidence, method, source);
  outcomes.push({
    id: followId,
    residentId: residentIdValue,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    outcomeType,
    objectiveId,
    phase: "follow_up",
    indicator: indicator(n, objectiveId, "follow_up"),
    followUpIntervalDays: FOLLOW_UP_DAYS,
    consent: "granted",
    evidence: followEvidence,
    source: "demo_fixture",
    verificationMethod: method,
    verificationSource: source,
    recordedOn: when,
  });
  pushEvent(events, {
    ...baseEvent(residentIdValue, place, "outcome_reported", when),
    id: `${followId}-reported`,
    outcomeId: followId,
    category,
    programId: resourceFor(category).programId,
  });
  if (verified) {
    pushEvent(events, {
      ...baseEvent(residentIdValue, place, "outcome_verified", when),
      id: `${followId}-verified`,
      outcomeId: followId,
      category,
      programId: resourceFor(category).programId,
    });
  }
}

function addExtraOutcome(
  n: number,
  residentIdValue: string,
  place: { organizationId: string; jurisdictionId: string; city: string },
  when: string,
  outcomes: OutcomeFact[],
  events: EventFact[],
): void {
  const extras: OutcomeType[] = ["health_insurance", "received_benefit", "submitted_application", "individual_goal"];
  const outcomeType = extras[n % extras.length] ?? "individual_goal";
  if (n % 4 !== 0) return;
  const id = `outcome-${residentIdValue}-extra`;
  outcomes.push({
    id,
    residentId: residentIdValue,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    outcomeType,
    objectiveId: null,
    phase: null,
    indicator: null,
    followUpIntervalDays: FOLLOW_UP_DAYS,
    consent: "granted",
    evidence: "self_reported",
    source: "demo_fixture",
    verificationMethod: null,
    verificationSource: null,
    recordedOn: when,
  });
  pushEvent(events, { ...baseEvent(residentIdValue, place, "outcome_reported", when), id: `${id}-reported`, outcomeId: id });
}

function baseEvent(
  residentIdValue: string,
  place: { organizationId: string; jurisdictionId: string; city: string },
  type: EventFact["type"],
  when: string,
): EventFact {
  return {
    id: `${type}-${residentIdValue}`,
    dedupeKey: "",
    residentId: residentIdValue,
    organizationId: place.organizationId,
    jurisdictionId: place.jurisdictionId,
    city: place.city,
    type,
    occurredAt: when,
    source: "demo_fixture",
    resourceId: null,
    programId: null,
    category: null,
    needId: null,
    serverConfirmed: false,
    goalId: null,
    actionId: null,
    applicationId: null,
    outcomeId: null,
    sessionId: null,
  };
}

function addExcluded(residents: ResidentFact[], events: EventFact[], asOf: string): void {
  const withdrawnAt = plusDays(asOf, -10);
  for (let i = 0; i < 6; i += 1) {
    const id = `demo-r-withdrawn-${i}`;
    const place = { organizationId: "org_harborlight", jurisdictionId: "jur_harbor", city: "North Harbor" };
    residents.push({
      id,
      ...place,
      consent: "withdrawn",
      consentedAt: plusDays(asOf, -120),
      withdrawnAt,
      deletedAt: null,
    });
    pushEvent(events, { ...baseEvent(id, place, "resource_viewed", plusDays(asOf, -2)), id: `${id}-view`, resourceId: "res_market", programId: "prog_market", category: "food" });
  }
  for (let i = 0; i < 4; i += 1) {
    const id = `demo-r-declined-${i}`;
    residents.push({
      id,
      organizationId: "org_cedar",
      jurisdictionId: "jur_cedar",
      city: "Cedar Flats",
      consent: "declined",
      consentedAt: null,
      withdrawnAt: null,
      deletedAt: null,
    });
  }
  for (let i = 0; i < 3; i += 1) {
    const id = `demo-r-deleted-${i}`;
    const place = { organizationId: "org_pier", jurisdictionId: "jur_harbor", city: "Pierpoint" };
    residents.push({
      id,
      ...place,
      consent: "withdrawn",
      consentedAt: plusDays(asOf, -120),
      withdrawnAt: plusDays(asOf, -5),
      deletedAt: plusDays(asOf, -5),
    });
    pushEvent(events, { ...baseEvent(id, place, "assessment_started", plusDays(asOf, -2)), id: `${id}-started` });
  }
}

export const BARRIER_IDS = Object.keys(BARRIER_LABELS);
