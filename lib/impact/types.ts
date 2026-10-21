export const EVENT_TYPES = [
  "assessment_started",
  "assessment_completed",
  "resource_viewed",
  "resource_saved",
  "need_selected",
  "chat_session_started",
  "action_started",
  "action_completed",
  "application_started",
  "application_draft_saved",
  "application_submitted_confirmed",
  "goal_completed",
  "outcome_reported",
  "outcome_verified",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const QUALIFYING_EVENT_TYPES = [
  "assessment_started",
  "assessment_completed",
  "resource_viewed",
  "resource_saved",
  "need_selected",
  "chat_session_started",
  "action_started",
  "action_completed",
  "application_started",
  "application_draft_saved",
  "application_submitted_confirmed",
  "goal_completed",
  "outcome_reported",
] as const satisfies readonly EventType[];

export type QualifyingEventType = (typeof QUALIFYING_EVENT_TYPES)[number];

export const OUTCOME_TYPES = [
  "accessed_resource",
  "submitted_application",
  "received_benefit",
  "usual_source_of_care",
  "health_insurance",
  "food_access",
  "housing",
  "education_or_workforce",
  "individual_goal",
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const ROLES = ["super_admin", "government_admin", "organization_admin"] as const;
export type ImpactRole = (typeof ROLES)[number];

export const HP_OBJECTIVE_IDS = ["AHS-07", "NWS-01", "AHS-04", "SDOH-01"] as const;
export type HpObjectiveId = (typeof HP_OBJECTIVE_IDS)[number];

export const CATEGORY_IDS = ["food", "health", "housing", "education", "transportation", "utilities"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type ConsentState = "granted" | "declined" | "withdrawn";
export type GoalStatus = "active" | "completed";
export type ApplicationStatus = "started" | "draft_saved" | "submitted_confirmed";
export type EvidenceKind = "self_reported" | "verified";
export type OutcomePhase = "baseline" | "follow_up";
export type Indicator = "positive" | "negative";
export const EVENT_SOURCES = ["demo_fixture", "resident_event", "self_reported_outcome", "externally_verified_outcome"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];
export type OutcomeSource = "demo_fixture" | "self_reported_outcome" | "externally_verified_outcome";
export type DatasetMode = "demo" | "live";

export type Principal = {
  userId: string;
  email: string;
  displayName: string;
  role: ImpactRole;
  organizationId: string | null;
  jurisdictionId: string | null;
};

export type ResidentFact = {
  id: string;
  organizationId: string;
  jurisdictionId: string;
  city: string;
  consent: ConsentState;
  consentedAt: string | null;
  withdrawnAt: string | null;
  deletedAt: string | null;
};

export type EventFact = {
  id: string;
  dedupeKey: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  city: string;
  type: EventType;
  occurredAt: string;
  source: EventSource;
  resourceId: string | null;
  programId: string | null;
  category: CategoryId | null;
  needId: string | null;
  serverConfirmed: boolean;
  goalId: string | null;
  actionId: string | null;
  applicationId: string | null;
  outcomeId: string | null;
  sessionId: string | null;
};

export type OutcomeFact = {
  id: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  city: string;
  outcomeType: OutcomeType;
  objectiveId: HpObjectiveId | null;
  phase: OutcomePhase | null;
  indicator: Indicator | null;
  followUpIntervalDays: number;
  consent: "granted";
  evidence: EvidenceKind;
  source: OutcomeSource;
  verificationMethod: string | null;
  verificationSource: string | null;
  recordedOn: string;
};

export type BarrierFact = {
  id: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  city: string;
  barrier: string;
  occurredAt: string;
};

export type GoalFact = {
  id: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  goalType: string;
  status: GoalStatus;
  objectiveId: HpObjectiveId | null;
  completedAt: string | null;
};

export type ActionFact = {
  id: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  actionType: string;
  goalId: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ApplicationFact = {
  id: string;
  residentId: string;
  organizationId: string;
  jurisdictionId: string;
  programId: string;
  status: ApplicationStatus;
};

export type CountCell = {
  value: number | null;
  suppressed: boolean;
};

export type RateCell = {
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  suppressed: boolean;
  unavailable: boolean;
};

export type LabeledCount = {
  id: string;
  label: string;
  count: CountCell;
};

export type RangePreset = "30" | "90" | "180" | "custom";

export type AppliedFilters = {
  from: string;
  to: string;
  city: string | null;
  jurisdictionId: string | null;
  programId: string | null;
  category: CategoryId | null;
  range: RangePreset;
  dataset: DatasetMode;
};

export type FilterOption = { id: string; label: string };

export type HealthBlock = {
  objectiveId: HpObjectiveId;
  inFilter: boolean;
  engagement: CountCell;
  intermediate: CountCell;
  selfReported: CountCell;
  verified: CountCell;
  baseline: RateCell;
  followUp: RateCell;
};

export type SyntheticActivity = {
  eventType: "action_started";
  needId: string;
  needLabel: string;
  summary: string;
};

export type ImpactReport = {
  demonstration: boolean;
  dataset: DatasetMode;
  disclaimer: string;
  separation: {
    demo: CountCell;
    live: CountCell;
    note: string;
  };
  syntheticActivity: SyntheticActivity | null;
  asOf: string;
  role: ImpactRole;
  scopeLabel: string;
  organizationLabel: string | null;
  applied: AppliedFilters;
  populationHidden: boolean;
  empty: boolean;
  hideReason: string | null;
  participating: CountCell;
  active7: CountCell;
  active30: CountCell;
  assessmentsCompleted: CountCell;
  assessmentCompletion: RateCell;
  resourcesDiscovered: CountCell;
  resourcesSaved: CountCell;
  tasksStarted: CountCell;
  tasksCompleted: CountCell;
  actionCompletion: RateCell;
  applicationsStarted: CountCell;
  draftsSaved: CountCell;
  submissionsConfirmed: CountCell;
  goalsCompleted: CountCell;
  outcomeReports: CountCell;
  outcomesVerified: CountCell;
  weekly: LabeledCount[];
  monthly: LabeledCount[];
  categories: LabeledCount[];
  needs: LabeledCount[];
  barriers: LabeledCount[];
  cities: LabeledCount[];
  funnel: {
    started: CountCell;
    draft: CountCell;
    submitted: CountCell;
    dropBeforeDraft: CountCell;
    dropBeforeSubmit: CountCell;
  };
  health: HealthBlock[];
  options: {
    cities: FilterOption[];
    programs: FilterOption[];
    categories: FilterOption[];
    jurisdictions: FilterOption[];
    lockJurisdiction: boolean;
  };
};

export type RawBucket = { id: string; label: string; n: number };
