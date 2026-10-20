import { monthKey, monthLabel, plusDays, weekStart } from "@/lib/impact/constants";
import { categoryLabel, objectivesForCategory, PROGRAMS } from "@/lib/impact/catalog";
import { QUALIFYING_EVENT_TYPES, type CategoryId, type EventFact, type HpObjectiveId, type OutcomeFact, type ResidentFact } from "@/lib/impact/types";
import type { BarrierFact, RawBucket } from "@/lib/impact/types";

const QUALIFYING = new Set<string>(QUALIFYING_EVENT_TYPES);

export type TallyInput = {
  residents: readonly ResidentFact[];
  events: readonly EventFact[];
  outcomes: readonly OutcomeFact[];
  barriers: readonly BarrierFact[];
  from: string;
  to: string;
  city: string | null;
  jurisdictionId: string | null;
  programId: string | null;
  category: CategoryId | null;
  cities: readonly string[];
  categories: readonly CategoryId[];
  barrierIds: readonly string[];
};

export type RawHealth = {
  objectiveId: HpObjectiveId;
  inFilter: boolean;
  paired: number;
  baselinePositive: number;
  followUpPositive: number;
  engagement: number;
  intermediate: number;
  selfReported: number;
  verified: number;
};

export type RawTally = {
  participating: number;
  active7: number;
  active30: number;
  assessmentStarted: number;
  assessmentCompleted: number;
  resourcesDiscovered: number;
  resourcesSaved: number;
  tasksStarted: number;
  tasksCompleted: number;
  applicationsStarted: number;
  draftsSaved: number;
  submissionsConfirmed: number;
  goalsCompleted: number;
  outcomeReports: number;
  outcomesVerified: number;
  weekly: RawBucket[];
  monthly: RawBucket[];
  categories: RawBucket[];
  barriers: RawBucket[];
  cities: RawBucket[];
  funnelStarted: number;
  funnelDraft: number;
  funnelSubmitted: number;
  health: RawHealth[];
};

function dedupe(events: readonly EventFact[]): EventFact[] {
  const seen = new Set<string>();
  const rows: EventFact[] = [];
  for (const event of events) {
    if (seen.has(event.dedupeKey)) continue;
    seen.add(event.dedupeKey);
    rows.push(event);
  }
  return rows;
}

function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

function distinct(values: Iterable<string>): number {
  return new Set(values).size;
}

function eachDate(from: string, to: string, stepDays: number, keyOf: (iso: string) => string): string[] {
  const keys: string[] = [];
  let cursor = from;
  const guardLimit = 400;
  let guard = 0;
  while (cursor.slice(0, 10) <= to.slice(0, 10) && guard < guardLimit) {
    const key = keyOf(cursor);
    if (!keys.includes(key)) keys.push(key);
    cursor = plusDays(cursor, stepDays);
    guard += 1;
  }
  return keys;
}

function objectivesInFilter(category: CategoryId | null, programId: string | null): HpObjectiveId[] | "all" {
  const lists: HpObjectiveId[][] = [];
  if (category) lists.push(objectivesForCategory(category));
  if (programId) {
    const program = PROGRAMS.find((item) => item.id === programId);
    lists.push(program ? objectivesForCategory(program.category) : []);
  }
  if (lists.length === 0) return "all";
  return lists.reduce((current, next) => current.filter((id) => next.includes(id)));
}

function categoryMapsTo(category: CategoryId | null, objectiveId: HpObjectiveId): boolean {
  if (!category) return false;
  return objectivesForCategory(category).includes(objectiveId);
}

export function tally(input: TallyInput): RawTally {
  const roster = input.residents.filter((resident) => {
    if (resident.consent !== "granted" || resident.deletedAt || resident.withdrawnAt) return false;
    if (input.jurisdictionId && resident.jurisdictionId !== input.jurisdictionId) return false;
    if (input.city && resident.city !== input.city) return false;
    return true;
  });
  const rosterIds = new Set(roster.map((resident) => resident.id));
  const deduped = dedupe(input.events).filter((event) => rosterIds.has(event.residentId));
  const attributeIds = new Set(
    deduped
      .filter((event) => {
        if (input.programId && event.programId !== input.programId) return false;
        if (input.category && event.category !== input.category) return false;
        return true;
      })
      .map((event) => event.residentId),
  );
  const healthRoster = input.programId || input.category ? roster.filter((resident) => attributeIds.has(resident.id)) : roster;
  const events = deduped.filter((event) => {
    if (!inRange(event.occurredAt, input.from, input.to)) return false;
    if (input.programId && event.programId !== input.programId) return false;
    if (input.category && event.category !== input.category) return false;
    return true;
  });
  const qualifying = events.filter((event) => QUALIFYING.has(event.type));
  const participantIds = new Set(qualifying.map((event) => event.residentId));
  const participants = roster.filter((resident) => participantIds.has(resident.id));

  const active7Start = plusDays(input.to, -7);
  const active30Start = plusDays(input.to, -30);
  const active7 = distinct(
    qualifying.filter((event) => event.occurredAt >= active7Start && event.occurredAt <= input.to).map((event) => event.residentId),
  );
  const active30 = distinct(
    qualifying.filter((event) => event.occurredAt >= active30Start && event.occurredAt <= input.to).map((event) => event.residentId),
  );

  const assessmentStarted = distinct(qualifying.filter((event) => event.type === "assessment_started").map((event) => event.residentId));
  const assessmentCompleted = distinct(qualifying.filter((event) => event.type === "assessment_completed").map((event) => event.residentId));
  const resourcesDiscovered = distinct(
    qualifying.filter((event) => event.type === "resource_viewed" && event.resourceId).map((event) => `${event.residentId}:${event.resourceId}`),
  );
  const resourcesSaved = distinct(
    qualifying.filter((event) => event.type === "resource_saved" && event.resourceId).map((event) => `${event.residentId}:${event.resourceId}`),
  );
  const tasksStarted = distinct(qualifying.filter((event) => event.type === "action_started" && event.actionId).map((event) => event.actionId ?? ""));
  const tasksCompleted = distinct(qualifying.filter((event) => event.type === "action_completed" && event.actionId).map((event) => event.actionId ?? ""));
  const applicationsStarted = distinct(
    qualifying.filter((event) => event.type === "application_started" && event.applicationId).map((event) => event.applicationId ?? ""),
  );
  const draftsSaved = distinct(
    qualifying.filter((event) => event.type === "application_draft_saved" && event.applicationId).map((event) => event.applicationId ?? ""),
  );
  const submissionsConfirmed = distinct(
    qualifying
      .filter((event) => event.type === "application_submitted_confirmed" && event.applicationId)
      .map((event) => event.applicationId ?? ""),
  );
  const goalsCompleted = distinct(qualifying.filter((event) => event.type === "goal_completed" && event.goalId).map((event) => event.goalId ?? ""));

  const outcomeById = new Map(input.outcomes.map((outcome) => [outcome.id, outcome]));
  const reportedIds = new Set(
    qualifying.filter((event) => event.type === "outcome_reported" && event.outcomeId).map((event) => event.outcomeId ?? ""),
  );
  const verifiedIds = new Set(
    events
      .filter((event) => event.type === "outcome_verified" && event.outcomeId)
      .map((event) => event.outcomeId ?? "")
      .filter((outcomeId) => {
        const outcome = outcomeById.get(outcomeId);
        return Boolean(outcome && outcome.evidence === "verified" && outcome.verificationMethod && outcome.verificationSource);
      }),
  );

  const weekKeys = eachDate(input.from, input.to, 7, weekStart);
  const weekly = weekKeys.map((key) => ({
    id: key,
    label: `Week of ${key}`,
    n: distinct(qualifying.filter((event) => weekStart(event.occurredAt) === key).map((event) => event.residentId)),
  }));
  const monthKeys = eachDate(input.from, input.to, 28, monthKey);
  const monthSeen = new Set<string>();
  for (const event of qualifying) monthSeen.add(monthKey(event.occurredAt));
  for (const key of monthKeys) monthSeen.add(key);
  const monthly = [...monthSeen].sort().map((key) => ({
    id: key,
    label: monthLabel(key),
    n: distinct(qualifying.filter((event) => monthKey(event.occurredAt) === key).map((event) => event.residentId)),
  }));

  const categories = input.categories.map((category) => ({
    id: category,
    label: categoryLabel(category),
    n: distinct(
      qualifying.filter((event) => event.type === "resource_viewed" && event.category === category).map((event) => event.residentId),
    ),
  }));
  const participantIdSet = new Set(participants.map((resident) => resident.id));
  const barriers = input.barrierIds.map((barrier) => ({
    id: barrier,
    label: barrier,
    n: distinct(
      input.barriers
        .filter((row) => row.barrier === barrier && participantIdSet.has(row.residentId) && inRange(row.occurredAt, input.from, input.to))
        .map((row) => row.residentId),
    ),
  }));
  const cities = input.cities
    .filter((city) => !input.city || city === input.city)
    .map((city) => ({
      id: city,
      label: city,
      n: participants.filter((resident) => resident.city === city).length,
    }));

  const allowed = objectivesInFilter(input.category, input.programId);
  const healthObjectives: HpObjectiveId[] = ["AHS-07", "NWS-01", "AHS-04", "SDOH-01"];
  const health = healthObjectives.map((objectiveId) => healthFor(objectiveId, allowed, healthRoster, qualifying, input.outcomes));

  return {
    participating: participants.length,
    active7,
    active30,
    assessmentStarted,
    assessmentCompleted,
    resourcesDiscovered,
    resourcesSaved,
    tasksStarted,
    tasksCompleted,
    applicationsStarted,
    draftsSaved,
    submissionsConfirmed,
    goalsCompleted,
    outcomeReports: reportedIds.size,
    outcomesVerified: verifiedIds.size,
    weekly,
    monthly,
    categories,
    barriers,
    cities,
    funnelStarted: applicationsStarted,
    funnelDraft: draftsSaved,
    funnelSubmitted: submissionsConfirmed,
    health,
  };
}

function healthFor(
  objectiveId: HpObjectiveId,
  allowed: HpObjectiveId[] | "all",
  roster: readonly ResidentFact[],
  qualifying: readonly EventFact[],
  outcomes: readonly OutcomeFact[],
): RawHealth {
  const inFilter = allowed === "all" || allowed.includes(objectiveId);
  if (!inFilter) {
    return {
      objectiveId,
      inFilter: false,
      paired: 0,
      baselinePositive: 0,
      followUpPositive: 0,
      engagement: 0,
      intermediate: 0,
      selfReported: 0,
      verified: 0,
    };
  }
  const rosterIds = new Set(roster.map((resident) => resident.id));
  const byResident = new Map<string, { baseline?: OutcomeFact; follow?: OutcomeFact }>();
  for (const outcome of outcomes) {
    if (outcome.objectiveId !== objectiveId || outcome.consent !== "granted") continue;
    if (!rosterIds.has(outcome.residentId)) continue;
    if (outcome.followUpIntervalDays !== 90) continue;
    const pair = byResident.get(outcome.residentId) ?? {};
    if (outcome.phase === "baseline") pair.baseline = outcome;
    if (outcome.phase === "follow_up") pair.follow = outcome;
    byResident.set(outcome.residentId, pair);
  }
  const pairs = [...byResident.values()].filter((pair) => pair.baseline && pair.follow);
  const engagement = distinct(
    qualifying.filter((event) => categoryMapsTo(event.category, objectiveId)).map((event) => event.residentId),
  );
  const intermediate = distinct(
    qualifying
      .filter(
        (event) =>
          (event.type === "action_completed" || event.type === "application_submitted_confirmed") &&
          categoryMapsTo(event.category, objectiveId),
      )
      .map((event) => event.residentId),
  );
  return {
    objectiveId,
    inFilter: true,
    paired: pairs.length,
    baselinePositive: pairs.filter((pair) => pair.baseline?.indicator === "positive").length,
    followUpPositive: pairs.filter((pair) => pair.follow?.indicator === "positive").length,
    engagement,
    intermediate,
    selfReported: pairs.filter((pair) => pair.follow?.evidence === "self_reported").length,
    verified: pairs.filter((pair) => pair.follow?.evidence === "verified" && pair.follow.verificationMethod && pair.follow.verificationSource).length,
  };
}
