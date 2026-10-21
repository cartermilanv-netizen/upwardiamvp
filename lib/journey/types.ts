import type { RewardExclusion } from "@/lib/journey/constants";

export const JOURNEY_DOMAINS = [
  "food",
  "housing",
  "healthcare",
  "financial_stability",
  "education",
  "employment",
  "transportation",
  "digital_access",
] as const;

export type JourneyDomain = (typeof JOURNEY_DOMAINS)[number];

export const DOMAIN_LABEL: Record<JourneyDomain, string> = {
  food: "Food",
  housing: "Housing",
  healthcare: "Healthcare",
  financial_stability: "Financial stability",
  education: "Education",
  employment: "Employment",
  transportation: "Transportation",
  digital_access: "Digital access",
};

export type GoalSource = "manual" | "assessment" | "saved_resource";
export type GoalChoice = "active" | "completed" | "skipped" | "postponed" | "stuck";

export type GoalHistoryEntry = {
  at: string;
  choice: GoalChoice;
  progress: number;
  note: string;
};

export type JourneyGoal = {
  id: string;
  residentId: string;
  domain: JourneyDomain;
  title: string;
  priority: boolean;
  choice: GoalChoice;
  progress: number;
  source: GoalSource;
  programId: string | null;
  outcomeReported: boolean;
  history: GoalHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export const ACTION_STATUSES = [
  "not_started",
  "in_progress",
  "completed_self_reported",
  "pending_verification",
  "verified",
  "rejected",
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionKind = "task" | "milestone" | "preparation";
export type ResidentChoice = "none" | "complete" | "skip" | "postpone" | "stuck";
export type VerificationMethod = "none" | "self_report" | "partner_review";
export type VerificationStatus = "not_required" | "unverified" | "pending" | "verified" | "rejected";
export type InstructionSource = "resident" | "assessment_plan" | "published_program" | "demonstration";

export type JourneyAction = {
  id: string;
  goalId: string;
  residentId: string;
  programId: string | null;
  campaignId: string | null;
  description: string;
  type: ActionKind;
  status: ActionStatus;
  residentChoice: ResidentChoice;
  dueDate: string | null;
  completionDate: string | null;
  verificationMethod: VerificationMethod;
  verificationStatus: VerificationStatus;
  eligibleRewardAmount: number;
  instructionSource: InstructionSource;
  /** Preparatory work cannot flip this. Outcomes are recorded on the goal. */
  countsAsOutcome: false;
  exclusion: RewardExclusion | null;
  createdAt: string;
};

export type RewardStatus = "pending" | "approved" | "issued";

export type JourneyReward = {
  id: string;
  residentId: string;
  actionId: string;
  campaignId: string;
  amountDollars: number;
  status: RewardStatus;
  month: string;
  demonstration: true;
  createdAt: string;
};

export type RewardCampaign = {
  id: string;
  partnerName: string;
  monthlyCapDollars: number;
  milestoneDollars: number;
  periodStart: string;
  periodEnd: string;
};

export type NoticeKind =
  | "task_reminder"
  | "application_prep"
  | "deadline"
  | "saved_resource_change"
  | "goal_milestone"
  | "reward_verification";

export type JourneyNotice = {
  id: string;
  residentId: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
};

export type ReminderPreferences = {
  taskReminders: boolean;
  applicationPrepReminders: boolean;
  deadlines: boolean;
  savedResourceChanges: boolean;
  goalMilestones: boolean;
  rewardVerification: boolean;
};

export type RewardReason =
  | "created"
  | "duplicate"
  | "cap"
  | "not_eligible"
  | "not_verified"
  | "excluded"
  | "outside_period";

export type RewardNotice = {
  reason: RewardReason;
  capScope: "resident" | "campaign" | null;
  text: string;
};

export type JourneyState = {
  residentId: string;
  residentMonthlyCapDollars: number;
  goalSeq: number;
  actionSeq: number;
  noticeSeq: number;
  goals: JourneyGoal[];
  actions: JourneyAction[];
  rewards: JourneyReward[];
  campaigns: RewardCampaign[];
  notifications: JourneyNotice[];
  preferences: ReminderPreferences;
  rewardNotice: RewardNotice | null;
};
