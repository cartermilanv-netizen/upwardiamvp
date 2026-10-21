import { requiredProgress } from "@/lib/applications/logic";
import type { ApplicationSnapshot } from "@/lib/applications/types";
import { DEFAULT_MONTHLY_CAP, EXAMPLE_MILESTONE_DOLLARS, JOURNEY_RESIDENT_ID } from "@/lib/journey/constants";
import type {
  ActionKind,
  GoalChoice,
  JourneyAction,
  JourneyDomain,
  JourneyGoal,
  JourneyNotice,
  JourneyReward,
  JourneyState,
  NoticeKind,
  ReminderPreferences,
  RewardCampaign,
  RewardNotice,
  RewardReason,
  RewardStatus,
} from "@/lib/journey/types";
import { DOMAIN_LABEL, JOURNEY_DOMAINS } from "@/lib/journey/types";

export const ASSESSMENT_GOAL_DOMAIN: Record<string, JourneyDomain | null> = {
  housing: "housing",
  food: "food",
  utilities: "financial_stability",
  health: "healthcare",
  job: "employment",
  training: "education",
  transportation: "transportation",
  digital: "digital_access",
  family_care: "healthcare",
  other: null,
};

const CATALOG_DOMAIN: readonly [string, JourneyDomain][] = [
  ["food", "food"],
  ["housing", "housing"],
  ["utilities", "financial_stability"],
  ["health_coverage", "healthcare"],
  ["care_access", "healthcare"],
  ["employment", "employment"],
  ["training", "education"],
  ["transportation", "transportation"],
  ["digital", "digital_access"],
  ["family_care", "healthcare"],
];

const RESIDENT_DEADLINE_FIELDS = new Set(["residentDeadline", "applicationDeadline"]);

const CHOICE_NOTE: Record<GoalChoice, string> = {
  active: "Marked active.",
  completed: "Marked complete. This is not an outcome.",
  skipped: "Skipped. Progress on this goal was kept.",
  postponed: "Postponed. Progress on this goal was kept.",
  stuck: "Marked stuck. Progress on this goal was kept.",
};

const REWARD_TEXT: Record<RewardReason, string> = {
  created: "A demonstration reward is pending. This is not money, and it has not been paid.",
  duplicate: "This step already has a demonstration reward. A second one was not added.",
  cap: "The monthly demonstration cap was reached. No reward was added.",
  not_eligible: "This step is not eligible for a demonstration reward.",
  not_verified: "A reward waits for verification. Completing a step does not create one.",
  excluded: "Clicks, extra disclosure, extra applications, and benefit decisions are not rewarded.",
  outside_period: "This campaign period does not cover that month. No reward was added.",
};

export type PublishedFact = { recordId: string; field: string; value: unknown };

export type ApplicationProgressLink = {
  draftId: string;
  programId: string;
  programName: string;
  status: string;
  filled: number;
  required: number;
};

export type DeadlineFact = { recordId: string; field: string; date: string };

export function defaultPreferences(): ReminderPreferences {
  return {
    taskReminders: true,
    applicationPrepReminders: true,
    deadlines: true,
    savedResourceChanges: true,
    goalMilestones: true,
    rewardVerification: true,
  };
}

export function stamp(day: string, hour = 15): string {
  return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthKey(day: string): string {
  return day.slice(0, 7);
}

export function domainForCatalogCategories(categories: readonly string[]): JourneyDomain | null {
  for (const [category, domain] of CATALOG_DOMAIN) {
    if (categories.includes(category)) return domain;
  }
  return null;
}

export function isDomain(value: string): value is JourneyDomain {
  return (JOURNEY_DOMAINS as readonly string[]).includes(value);
}

function counted(action: JourneyAction): boolean {
  return action.status === "completed_self_reported" || action.status === "pending_verification" || action.status === "verified";
}

export function derivedProgress(actions: readonly JourneyAction[], goalId: string): number {
  const mine = actions.filter((action) => action.goalId === goalId);
  if (mine.length === 0) return 0;
  return Math.round((mine.filter(counted).length / mine.length) * 100);
}

function replaceGoal(state: JourneyState, goalId: string, update: (goal: JourneyGoal) => JourneyGoal): JourneyState {
  let changed = false;
  const goals = state.goals.map((goal) => {
    if (goal.id !== goalId) return goal;
    const next = update(goal);
    if (next !== goal) changed = true;
    return next;
  });
  if (!changed) return state;
  return { ...state, goals };
}

function patchAction(state: JourneyState, actionId: string, update: (action: JourneyAction) => JourneyAction): JourneyState {
  let changed = false;
  const actions = state.actions.map((action) => {
    if (action.id !== actionId) return action;
    const next = update(action);
    if (next !== action) changed = true;
    return next;
  });
  if (!changed) return state;
  return { ...state, actions };
}

function syncGoalProgress(state: JourneyState, goalId: string, today: string, note: string): JourneyState {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal) return state;
  const progress = goal.choice === "completed" ? 100 : derivedProgress(state.actions, goalId);
  if (progress === goal.progress) return state;
  return replaceGoal(state, goalId, (current) => ({
    ...current,
    progress,
    updatedAt: stamp(today),
    history: [...current.history, { at: stamp(today), choice: current.choice, progress, note }],
  }));
}

export function setGoalChoice(state: JourneyState, goalId: string, choice: GoalChoice, today: string): JourneyState {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal || goal.choice === choice) return state;
  const progress = choice === "completed" ? 100 : derivedProgress(state.actions, goalId);
  return replaceGoal(state, goalId, (current) => ({
    ...current,
    choice,
    progress,
    outcomeReported: current.outcomeReported,
    updatedAt: stamp(today),
    history: [...current.history, { at: stamp(today), choice, progress, note: CHOICE_NOTE[choice] }],
  }));
}

export function reportOutcome(state: JourneyState, goalId: string, today: string): JourneyState {
  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal || goal.outcomeReported) return state;
  return replaceGoal(state, goalId, (current) => ({
    ...current,
    outcomeReported: true,
    updatedAt: stamp(today),
    history: [
      ...current.history,
      {
        at: stamp(today),
        choice: current.choice,
        progress: current.progress,
        note: "Outcome reported by you. Preparatory steps are not outcomes. This was not sent anywhere.",
      },
    ],
  }));
}

export function createManualGoal(
  state: JourneyState,
  input: { domain: JourneyDomain; title: string; priority: boolean },
  today: string,
): JourneyState {
  const title = input.title.trim();
  if (title.length < 3 || !isDomain(input.domain)) return state;
  const goalSeq = state.goalSeq + 1;
  const goal: JourneyGoal = {
    id: `goal-${goalSeq}`,
    residentId: state.residentId,
    domain: input.domain,
    title,
    priority: input.priority,
    choice: "active",
    progress: 0,
    source: "manual",
    programId: null,
    outcomeReported: false,
    history: [{ at: stamp(today), choice: "active", progress: 0, note: "Goal added by you." }],
    createdAt: stamp(today),
    updatedAt: stamp(today),
  };
  return { ...state, goalSeq, goals: [...state.goals, goal] };
}

export function addAssessmentGoals(state: JourneyState, goalIds: readonly string[], today: string): JourneyState {
  let next = state;
  for (const goalId of goalIds) {
    const domain = ASSESSMENT_GOAL_DOMAIN[goalId];
    if (!domain) continue;
    if (next.goals.some((goal) => goal.domain === domain)) continue;
    const goalSeq = next.goalSeq + 1;
    const goal: JourneyGoal = {
      id: `goal-assessment-${domain}`,
      residentId: next.residentId,
      domain,
      title: `Work on ${DOMAIN_LABEL[domain].toLowerCase()}`,
      priority: true,
      choice: "active",
      progress: 0,
      source: "assessment",
      programId: null,
      outcomeReported: false,
      history: [{ at: stamp(today), choice: "active", progress: 0, note: "Added from assessment priorities. Answers were not copied." }],
      createdAt: stamp(today),
      updatedAt: stamp(today),
    };
    next = { ...next, goalSeq, goals: [...next.goals, goal] };
  }
  return next;
}

export function addSavedResourceGoal(
  state: JourneyState,
  input: { programId: string; name: string; categories: readonly string[] },
  today: string,
): JourneyState {
  if (state.goals.some((goal) => goal.programId === input.programId)) return state;
  const domain = domainForCatalogCategories(input.categories);
  if (!domain) return state;
  const goalSeq = state.goalSeq + 1;
  const actionSeq = state.actionSeq + 1;
  const createdAt = stamp(today);
  const goal: JourneyGoal = {
    id: `goal-program-${input.programId}`,
    residentId: state.residentId,
    domain,
    title: `Follow the steps for ${input.name}`,
    priority: false,
    choice: "active",
    progress: 0,
    source: "saved_resource",
    programId: input.programId,
    outcomeReported: false,
    history: [{ at: createdAt, choice: "active", progress: 0, note: "Added because you saved a resource." }],
    createdAt,
    updatedAt: createdAt,
  };
  const action: JourneyAction = {
    id: `act-${actionSeq}`,
    goalId: goal.id,
    residentId: state.residentId,
    programId: input.programId,
    campaignId: null,
    description: `Read the published details for ${input.name}, then decide if you want help preparing.`,
    type: "preparation",
    status: "not_started",
    residentChoice: "none",
    dueDate: null,
    completionDate: null,
    verificationMethod: "none",
    verificationStatus: "not_required",
    eligibleRewardAmount: 0,
    instructionSource: "published_program",
    countsAsOutcome: false,
    exclusion: null,
    createdAt,
  };
  return { ...state, goalSeq, actionSeq, goals: [...state.goals, goal], actions: [...state.actions, action] };
}

export function createTask(
  state: JourneyState,
  input: { goalId: string; description: string; type: ActionKind; dueDate: string | null; wantsReward: boolean },
  today: string,
): JourneyState {
  const description = input.description.trim();
  const goal = state.goals.find((item) => item.id === input.goalId);
  if (!goal || description.length < 3) return state;
  const campaign = state.campaigns[0] ?? null;
  const rewarded = input.type === "milestone" && input.wantsReward && campaign !== null;
  const actionSeq = state.actionSeq + 1;
  const action: JourneyAction = {
    id: `act-${actionSeq}`,
    goalId: goal.id,
    residentId: state.residentId,
    programId: goal.programId,
    campaignId: rewarded && campaign ? campaign.id : null,
    description,
    type: input.type,
    status: "not_started",
    residentChoice: "none",
    dueDate: input.dueDate,
    completionDate: null,
    verificationMethod: rewarded ? "partner_review" : "none",
    verificationStatus: rewarded ? "unverified" : "not_required",
    eligibleRewardAmount: rewarded && campaign ? campaign.milestoneDollars : 0,
    instructionSource: "resident",
    countsAsOutcome: false,
    exclusion: null,
    createdAt: stamp(today),
  };
  const withAction = { ...state, actionSeq, actions: [...state.actions, action] };
  return syncGoalProgress(withAction, goal.id, today, "A smaller task was added.");
}

export function startAction(state: JourneyState, actionId: string): JourneyState {
  return patchAction(state, actionId, (action) => {
    if (action.status !== "not_started") return action;
    return { ...action, status: "in_progress" };
  });
}

export function chooseAction(state: JourneyState, actionId: string, choice: "complete" | "skip" | "postpone" | "stuck", today: string): JourneyState {
  if (choice === "complete") return completeAction(state, actionId, today);
  const current = state.actions.find((action) => action.id === actionId);
  if (!current || current.residentChoice === choice) return state;
  const next = patchAction(state, actionId, (action) => ({
    ...action,
    residentChoice: choice,
    dueDate: choice === "postpone" ? addDays(action.dueDate ?? today, 7) : action.dueDate,
    status: choice === "stuck" && action.status === "not_started" ? "in_progress" : action.status,
  }));
  return next;
}

export function completeAction(state: JourneyState, actionId: string, today: string): JourneyState {
  const current = state.actions.find((action) => action.id === actionId);
  if (!current) return state;
  if (current.status === "verified" || current.status === "rejected" || current.status === "pending_verification") return state;
  if (current.status === "completed_self_reported" && current.residentChoice === "complete") return state;
  const next = patchAction(state, actionId, (action) => ({
    ...action,
    status: action.status === "not_started" || action.status === "in_progress" ? "completed_self_reported" : action.status,
    residentChoice: "complete",
    completionDate: action.completionDate ?? today,
    verificationStatus: action.eligibleRewardAmount > 0 && action.verificationStatus === "not_required" ? "unverified" : action.verificationStatus,
  }));
  return syncGoalProgress(next, current.goalId, today, "A step was checked off. This is not an outcome.");
}

export function requestVerification(state: JourneyState, actionId: string): JourneyState {
  return patchAction(state, actionId, (action) => {
    if (action.status !== "completed_self_reported" || action.eligibleRewardAmount <= 0 || action.exclusion) return action;
    return { ...action, status: "pending_verification", verificationStatus: "pending", verificationMethod: "partner_review" };
  });
}

function noticeFor(reason: RewardReason, capScope: RewardNotice["capScope"]): RewardNotice {
  return { reason, capScope, text: REWARD_TEXT[reason] };
}

export function monthRewardTotal(rewards: readonly JourneyReward[], residentId: string, month: string, campaignId?: string): number {
  return rewards.reduce((sum, reward) => {
    if (reward.residentId !== residentId || reward.month !== month) return sum;
    if (campaignId && reward.campaignId !== campaignId) return sum;
    return sum + reward.amountDollars;
  }, 0);
}

export function attachReward(state: JourneyState, actionId: string, today: string): JourneyState {
  const action = state.actions.find((item) => item.id === actionId);
  if (!action) return { ...state, rewardNotice: noticeFor("not_eligible", null) };
  if (action.exclusion || action.type !== "milestone") return { ...state, rewardNotice: noticeFor("excluded", null) };
  if (action.eligibleRewardAmount <= 0) return { ...state, rewardNotice: noticeFor("not_eligible", null) };
  if (action.status !== "verified") return { ...state, rewardNotice: noticeFor("not_verified", null) };
  if (state.rewards.some((reward) => reward.actionId === action.id)) {
    return { ...state, rewardNotice: noticeFor("duplicate", null) };
  }
  const campaign = state.campaigns.find((item) => item.id === action.campaignId) ?? null;
  if (!campaign) return { ...state, rewardNotice: noticeFor("not_eligible", null) };
  const month = monthKey(today);
  if (month < campaign.periodStart || month > campaign.periodEnd) {
    return { ...state, rewardNotice: noticeFor("outside_period", null) };
  }
  if (!Number.isInteger(action.eligibleRewardAmount) || action.eligibleRewardAmount !== campaign.milestoneDollars) {
    return { ...state, rewardNotice: noticeFor("not_eligible", null) };
  }
  const residentUsed = monthRewardTotal(state.rewards, action.residentId, month);
  if (residentUsed + action.eligibleRewardAmount > state.residentMonthlyCapDollars) {
    return { ...state, rewardNotice: noticeFor("cap", "resident") };
  }
  const campaignUsed = monthRewardTotal(state.rewards, action.residentId, month, campaign.id);
  if (campaignUsed + action.eligibleRewardAmount > campaign.monthlyCapDollars) {
    return { ...state, rewardNotice: noticeFor("cap", "campaign") };
  }
  const reward: JourneyReward = {
    id: `reward-${action.id}`,
    residentId: action.residentId,
    actionId: action.id,
    campaignId: campaign.id,
    amountDollars: action.eligibleRewardAmount,
    status: "pending",
    month,
    demonstration: true,
    createdAt: stamp(today),
  };
  return { ...state, rewards: [...state.rewards, reward], rewardNotice: noticeFor("created", null) };
}

export function verifyAction(state: JourneyState, actionId: string, today: string): JourneyState {
  const action = state.actions.find((item) => item.id === actionId);
  if (!action) return { ...state, rewardNotice: noticeFor("not_eligible", null) };
  if (action.status === "verified") return attachReward(state, actionId, today);
  if (action.status !== "pending_verification" && action.status !== "completed_self_reported") {
    return { ...state, rewardNotice: noticeFor("not_verified", null) };
  }
  const verified = patchAction(state, actionId, (current) => ({
    ...current,
    status: "verified",
    verificationStatus: "verified",
    verificationMethod: current.verificationMethod === "none" ? "partner_review" : current.verificationMethod,
    completionDate: current.completionDate ?? today,
    residentChoice: "complete",
  }));
  const progressed = syncGoalProgress(verified, action.goalId, today, "A step was verified. This is not an outcome.");
  return attachReward(progressed, actionId, today);
}

export function rejectAction(state: JourneyState, actionId: string, today: string): JourneyState {
  const action = state.actions.find((item) => item.id === actionId);
  if (!action || action.status === "rejected") return state;
  const rejected = patchAction(state, actionId, (current) => ({
    ...current,
    status: "rejected",
    verificationStatus: "rejected",
    completionDate: null,
  }));
  const rewards = rejected.rewards.filter((reward) => reward.actionId !== actionId || reward.status === "issued");
  const next = rewards.length === rejected.rewards.length ? rejected : { ...rejected, rewards };
  return syncGoalProgress(next, action.goalId, today, "Verification was rejected. No reward was added.");
}

export function setRewardStatus(state: JourneyState, rewardId: string, status: RewardStatus): JourneyState {
  const reward = state.rewards.find((item) => item.id === rewardId);
  if (!reward) return state;
  const action = state.actions.find((item) => item.id === reward.actionId);
  if (!action || action.status !== "verified") return state;
  const order: RewardStatus[] = ["pending", "approved", "issued"];
  if (order.indexOf(status) !== order.indexOf(reward.status) + 1) return state;
  return {
    ...state,
    rewards: state.rewards.map((item) => (item.id === rewardId ? { ...item, status, demonstration: true as const } : item)),
  };
}

export function preferenceKey(kind: NoticeKind): keyof ReminderPreferences {
  switch (kind) {
    case "task_reminder":
      return "taskReminders";
    case "application_prep":
      return "applicationPrepReminders";
    case "deadline":
      return "deadlines";
    case "saved_resource_change":
      return "savedResourceChanges";
    case "goal_milestone":
      return "goalMilestones";
    case "reward_verification":
      return "rewardVerification";
  }
}

export function pushNotice(state: JourneyState, draft: Omit<JourneyNotice, "id" | "residentId" | "read" | "dismissed">): JourneyState {
  if (!state.preferences[preferenceKey(draft.kind)]) return state;
  const noticeSeq = state.noticeSeq + 1;
  const notice: JourneyNotice = {
    ...draft,
    id: `notice-${noticeSeq}`,
    residentId: state.residentId,
    read: false,
    dismissed: false,
  };
  return { ...state, noticeSeq, notifications: [notice, ...state.notifications] };
}

export function visibleNotices(state: JourneyState): JourneyNotice[] {
  return state.notifications.filter((notice) => !notice.dismissed && state.preferences[preferenceKey(notice.kind)]);
}

export function markNoticeRead(state: JourneyState, id: string): JourneyState {
  const current = state.notifications.find((notice) => notice.id === id);
  if (!current || current.read) return state;
  return {
    ...state,
    notifications: state.notifications.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
  };
}

export function dismissNotice(state: JourneyState, id: string): JourneyState {
  const current = state.notifications.find((notice) => notice.id === id);
  if (!current || current.dismissed) return state;
  return {
    ...state,
    notifications: state.notifications.map((notice) => (notice.id === id ? { ...notice, read: true, dismissed: true } : notice)),
  };
}

export function setReminderPreference(state: JourneyState, key: keyof ReminderPreferences, value: boolean): JourneyState {
  if (state.preferences[key] === value) return state;
  return { ...state, preferences: { ...state.preferences, [key]: value } };
}

export function publishedResidentDeadlines(facts: readonly PublishedFact[]): DeadlineFact[] {
  const rows: DeadlineFact[] = [];
  for (const fact of facts) {
    if (!RESIDENT_DEADLINE_FIELDS.has(fact.field)) continue;
    if (typeof fact.value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fact.value)) continue;
    rows.push({ recordId: fact.recordId, field: fact.field, date: fact.value });
  }
  return rows;
}

export function applicationsInProgress(snapshot: ApplicationSnapshot): ApplicationProgressLink[] {
  return snapshot.drafts
    .filter((draft) => draft.status !== "not_started")
    .map((draft) => {
      const program = snapshot.programs.find((item) => item.id === draft.programId);
      const progress = program ? requiredProgress(program.schema, draft.values) : { filled: 0, required: 0 };
      return {
        draftId: draft.id,
        programId: draft.programId,
        programName: program?.name ?? "Application",
        status: draft.status,
        filled: progress.filled,
        required: progress.required,
      };
    });
}

export function todaysActions(state: JourneyState, today: string): JourneyAction[] {
  return state.actions.filter(
    (action) => action.dueDate === today && action.status !== "verified" && action.status !== "rejected" && action.residentChoice !== "skip",
  );
}

export function sortedActions(state: JourneyState, today: string): JourneyAction[] {
  return [...state.actions].sort((a, b) => {
    const aToday = a.dueDate === today ? 0 : 1;
    const bToday = b.dueDate === today ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;
    return (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99");
  });
}

export function activeGoals(state: JourneyState): JourneyGoal[] {
  return [...state.goals]
    .filter((goal) => goal.choice !== "completed" && goal.choice !== "skipped")
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.title.localeCompare(b.title));
}

export type Achievement = { id: string; title: string; detail: string; at: string };

export function recentAchievements(state: JourneyState): Achievement[] {
  const rows: Achievement[] = [];
  for (const goal of state.goals) {
    if (goal.choice !== "completed") continue;
    rows.push({
      id: goal.id,
      title: goal.title,
      detail: `${DOMAIN_LABEL[goal.domain]} · marked complete · not an outcome by itself`,
      at: goal.updatedAt,
    });
  }
  for (const action of state.actions) {
    if (action.status !== "verified" || !action.completionDate) continue;
    rows.push({ id: action.id, title: action.description, detail: "Verified step", at: action.completionDate });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
}

export function monthlyRewardProgress(state: JourneyState, month: string): { used: number; cap: number; remaining: number } {
  const used = monthRewardTotal(state.rewards, state.residentId, month);
  const cap = state.residentMonthlyCapDollars;
  return { used, cap, remaining: Math.max(0, cap - used) };
}

export function emptyJourneyState(overrides: Partial<JourneyState> = {}): JourneyState {
  return {
    residentId: JOURNEY_RESIDENT_ID,
    residentMonthlyCapDollars: DEFAULT_MONTHLY_CAP,
    goalSeq: 0,
    actionSeq: 0,
    noticeSeq: 0,
    goals: [],
    actions: [],
    rewards: [],
    campaigns: [sampleCampaign("campaign-test", "Test Partner", DEFAULT_MONTHLY_CAP)],
    notifications: [],
    preferences: defaultPreferences(),
    rewardNotice: null,
    ...overrides,
  };
}

export function sampleCampaign(id: string, partnerName: string, monthlyCapDollars: number, milestone = EXAMPLE_MILESTONE_DOLLARS): RewardCampaign {
  return {
    id,
    partnerName,
    monthlyCapDollars,
    milestoneDollars: milestone,
    periodStart: "2026-10",
    periodEnd: "2026-12",
  };
}

export function sampleMilestone(id: string, campaignId: string, goalId = "goal-test"): JourneyAction {
  return {
    id,
    goalId,
    residentId: JOURNEY_RESIDENT_ID,
    programId: null,
    campaignId,
    description: `Milestone ${id}`,
    type: "milestone",
    status: "pending_verification",
    residentChoice: "complete",
    dueDate: "2026-10-21",
    completionDate: "2026-10-21",
    verificationMethod: "partner_review",
    verificationStatus: "pending",
    eligibleRewardAmount: EXAMPLE_MILESTONE_DOLLARS,
    instructionSource: "demonstration",
    countsAsOutcome: false,
    exclusion: null,
    createdAt: stamp("2026-10-21"),
  };
}
