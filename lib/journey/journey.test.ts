import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { demonstrationProfile } from "@/lib/applications/catalog";
import { getApplicationSnapshot, getDraft, resetApplicationStore, updateDraftValues } from "@/lib/applications/store";
import { ACCESSIBLE_ALTERNATIVE, DEMO_DAY, JOURNEY_RESIDENT_ID, MONEY_NOTE, PILOT_LIMIT } from "@/lib/journey/constants";
import { describeJourneyEvents, JOURNEY_CONSENT_EVENTS, JOURNEY_EVENTS_EMITTED } from "@/lib/journey/events";
import {
  addAssessmentGoals,
  applicationsInProgress,
  attachReward,
  completeAction,
  createManualGoal,
  createTask,
  derivedProgress,
  dismissNotice,
  emptyJourneyState,
  markNoticeRead,
  monthRewardTotal,
  publishedResidentDeadlines,
  pushNotice,
  requestVerification,
  sampleCampaign,
  sampleMilestone,
  setGoalChoice,
  setReminderPreference,
  setRewardStatus,
  stamp,
  verifyAction,
  visibleNotices,
} from "@/lib/journey/logic";
import { createSeed } from "@/lib/journey/seed";
import { getJourneySnapshot, rememberSavedProgram, resetJourneyStore } from "@/lib/journey/store";
import { JOURNEY_DOMAINS } from "@/lib/journey/types";
import { EVENT_TYPES } from "@/lib/impact/types";
import { loadPublishedFacts } from "@/lib/catalog";

const ROOTS = ["app/journey", "app/goals", "app/actions", "app/rewards", "app/notifications", "components/journey", "lib/journey"];

function sourceFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) files.push(full);
  }
  return files;
}

describe("journey goals and actions", () => {
  it("covers every domain and keeps one goal's progress off the others", () => {
    const state = createSeed();
    expect(new Set(state.goals.map((goal) => goal.domain))).toEqual(new Set(JOURNEY_DOMAINS));
    expect(state.residentId).toBe(demonstrationProfile.id);
    expect(state.residentId).toBe(JOURNEY_RESIDENT_ID);
    const food = state.goals.find((goal) => goal.id === "goal-food");
    const housing = state.goals.find((goal) => goal.id === "goal-housing");
    if (!food || !housing) throw new Error("seed goals");
    expect(food.progress).toBe(derivedProgress(state.actions, food.id));
    const next = setGoalChoice(state, food.id, "stuck", DEMO_DAY);
    expect(next.goals.find((goal) => goal.id === housing.id)).toBe(housing);
    expect(next.goals.find((goal) => goal.id === housing.id)?.history).toBe(housing.history);
    expect(next.rewards).toBe(state.rewards);
    expect(next.goals.find((goal) => goal.id === food.id)?.choice).toBe("stuck");
    expect(next.goals.find((goal) => goal.id === food.id)?.outcomeReported).toBe(false);
    const added = createManualGoal(next, { domain: "food", title: "Pack a lunch", priority: false }, DEMO_DAY);
    expect(added.goals.find((goal) => goal.id === housing.id)).toBe(housing);
    expect(added.goals.at(-1)?.title).toBe("Pack a lunch");
  });

  it("completes an action without turning preparation into an outcome or a reward", () => {
    const state = createSeed();
    const housing = state.goals.find((goal) => goal.id === "goal-housing");
    const next = completeAction(state, "act-food-questions", DEMO_DAY);
    const action = next.actions.find((item) => item.id === "act-food-questions");
    expect(action?.status).toBe("completed_self_reported");
    expect(action?.completionDate).toBe(DEMO_DAY);
    expect(action?.countsAsOutcome).toBe(false);
    expect(next.goals.find((goal) => goal.id === "goal-food")?.outcomeReported).toBe(false);
    expect(next.rewards).toBe(state.rewards);
    expect(next.goals.find((goal) => goal.id === "goal-housing")).toBe(housing);
    const prep = createTask(
      state,
      { goalId: "goal-food", description: "Read the instructions", type: "preparation", dueDate: null, wantsReward: true },
      DEMO_DAY,
    );
    expect(prep.actions.at(-1)?.eligibleRewardAmount).toBe(0);
  });

  it("adds assessment priorities without copying answers or wiping progress", () => {
    const empty = { ...createSeed(), goals: [], actions: [] };
    const once = addAssessmentGoals(empty, ["food", "housing", "other"], DEMO_DAY);
    expect(once.goals.map((goal) => goal.domain)).toEqual(["food", "housing"]);
    const progressed = setGoalChoice(once, once.goals[0]?.id ?? "", "stuck", DEMO_DAY);
    const twice = addAssessmentGoals(progressed, ["food", "housing", "health"], DEMO_DAY);
    expect(twice.goals[0]).toBe(progressed.goals[0]);
    expect(twice.goals.map((goal) => goal.domain)).toEqual(["food", "housing", "healthcare"]);
    expect(JSON.stringify(twice)).not.toMatch(/incomeRange|monthlyIncome|peopleSharingMeals|avery\.example@example\.com/);
  });
});

describe("demonstration rewards", () => {
  it("refuses a second reward for the same action", () => {
    const start = emptyJourneyState({ actions: [sampleMilestone("m1", "campaign-test")] });
    const once = verifyAction(start, "m1", DEMO_DAY);
    expect(once.rewards).toHaveLength(1);
    expect(once.rewards[0]?.status).toBe("pending");
    expect(once.rewards[0]?.demonstration).toBe(true);
    const twice = verifyAction(once, "m1", DEMO_DAY);
    expect(twice.rewards).toBe(once.rewards);
    expect(twice.rewardNotice?.reason).toBe("duplicate");
  });

  it("stops at the $25 resident cap and at a lower partner cap", () => {
    const resident = runMilestones(6, 25, 25);
    expect(resident.rewards).toHaveLength(5);
    expect(monthRewardTotal(resident.rewards, JOURNEY_RESIDENT_ID, "2026-10")).toBe(25);
    expect(resident.rewardNotice).toMatchObject({ reason: "cap", capScope: "resident" });

    const partner = runMilestones(4, 25, 15);
    expect(partner.rewards).toHaveLength(3);
    expect(monthRewardTotal(partner.rewards, JOURNEY_RESIDENT_ID, "2026-10", "campaign-test")).toBe(15);
    expect(partner.rewardNotice).toMatchObject({ reason: "cap", capScope: "campaign" });
  });

  it("keeps self-reported completion pending until verification, then walks pending, approved, and issued", () => {
    let state = emptyJourneyState({
      actions: [{ ...sampleMilestone("m1", "campaign-test"), status: "completed_self_reported", verificationStatus: "unverified" }],
    });
    const early = attachReward(state, "m1", DEMO_DAY);
    expect(early.rewards).toHaveLength(0);
    expect(early.rewardNotice?.reason).toBe("not_verified");
    state = requestVerification(state, "m1");
    expect(state.actions[0]?.status).toBe("pending_verification");
    expect(state.rewards).toHaveLength(0);
    state = verifyAction(state, "m1", DEMO_DAY);
    expect(state.rewards[0]?.status).toBe("pending");
    expect(setRewardStatus(state, "reward-m1", "issued").rewards[0]?.status).toBe("pending");
    state = setRewardStatus(state, "reward-m1", "approved");
    expect(state.rewards[0]?.status).toBe("approved");
    state = setRewardStatus(state, "reward-m1", "issued");
    expect(state.rewards[0]).toMatchObject({ status: "issued", demonstration: true, amountDollars: 5 });
    expect(state.rewards[0]).not.toHaveProperty("paymentId");
  });

  it("does not reward clicks, and goal completion does not create a reward", () => {
    const blocked = emptyJourneyState({
      actions: [{ ...sampleMilestone("m1", "campaign-test"), status: "verified", verificationStatus: "verified", exclusion: "clicks" }],
    });
    expect(attachReward(blocked, "m1", DEMO_DAY).rewardNotice?.reason).toBe("excluded");
    const outside = emptyJourneyState({
      actions: [{ ...sampleMilestone("m1", "campaign-test"), status: "verified", verificationStatus: "verified" }],
    });
    expect(attachReward(outside, "m1", "2026-09-01").rewardNotice?.reason).toBe("outside_period");
    const seeded = createSeed();
    expect(setGoalChoice(seeded, "goal-food", "completed", DEMO_DAY).rewards).toBe(seeded.rewards);
    expect(seeded.rewards.map((reward) => reward.status).sort()).toEqual(["approved", "issued", "pending"]);
    expect(monthRewardTotal(seeded.rewards, JOURNEY_RESIDENT_ID, "2026-10")).toBe(15);
  });
});

describe("notifications, applications, and demo isolation", () => {
  beforeEach(() => {
    resetJourneyStore();
    resetApplicationStore();
  });

  it("hides a reminder kind that the resident turns off, and still marks or dismisses the rest", () => {
    const state = createSeed();
    const quiet = setReminderPreference(state, "taskReminders", false);
    expect(visibleNotices(quiet).some((notice) => notice.kind === "task_reminder")).toBe(false);
    expect(pushNotice(quiet, { kind: "task_reminder", title: "Later", body: "Not stored", href: null, createdAt: stamp(DEMO_DAY) })).toBe(quiet);
    const read = markNoticeRead(state, "notice-app-harbor");
    expect(read.notifications.find((notice) => notice.id === "notice-app-harbor")?.read).toBe(true);
    const dismissed = dismissNotice(read, "notice-app-harbor");
    expect(visibleNotices(dismissed).some((notice) => notice.id === "notice-app-harbor")).toBe(false);
    expect(dismissed.notifications.find((notice) => notice.id === "notice-reward-employ")).toBe(
      state.notifications.find((notice) => notice.id === "notice-reward-employ"),
    );
  });

  it("shows a resident deadline only from a published deadline field", () => {
    expect(publishedResidentDeadlines(loadPublishedFacts())).toEqual([]);
    expect(publishedResidentDeadlines([{ recordId: "example", field: "effectiveTo", value: "2026-12-01" }])).toEqual([]);
    expect(publishedResidentDeadlines([{ recordId: "example", field: "closingStatus", value: "2026-12-01" }])).toEqual([]);
    expect(publishedResidentDeadlines([{ recordId: "example", field: "residentDeadline", value: "2026-12-01" }])).toEqual([
      { recordId: "example", field: "residentDeadline", date: "2026-12-01" },
    ]);
    expect(createSeed().notifications.some((notice) => notice.kind === "deadline")).toBe(false);
  });

  it("keeps application progress on the existing drafts", () => {
    const before = getJourneySnapshot();
    const linked = applicationsInProgress(getApplicationSnapshot());
    expect(linked.map((item) => item.draftId)).toEqual(["draft-harbor"]);
    expect(linked[0]?.programName).toBe("Harbor Pantry Box");
    const draft = getDraft("draft-harbor");
    if (!draft) throw new Error("draft");
    updateDraftValues("draft-harbor", { ...draft.values, peopleSharingMeals: 2 });
    const again = applicationsInProgress(getApplicationSnapshot());
    expect(again[0]?.draftId).toBe("draft-harbor");
    expect(again[0]?.filled).toBe((linked[0]?.filled ?? 0) + 1);
    expect(getJourneySnapshot()).toBe(before);
    expect(JSON.stringify(getJourneySnapshot())).not.toContain("peopleSharingMeals");
    expect(getJourneySnapshot().rewards).toBe(before.rewards);
  });

  it("defines consent events without emitting them or touching Impact", () => {
    expect(JOURNEY_EVENTS_EMITTED).toBe(false);
    expect(describeJourneyEvents()).toMatchObject({ emitted: false, dataset: "demonstration", liveSeparated: true });
    expect([...JOURNEY_CONSENT_EVENTS]).toEqual([
      "goal_created",
      "goal_progressed",
      "action_started",
      "action_completed",
      "action_verified",
      "reminder_created",
      "application_progressed",
      "reward_pending",
      "reward_approved",
      "reward_issued",
      "outcome_reported",
    ]);
    for (const name of ["goal_created", "goal_progressed", "action_verified", "reminder_created", "application_progressed", "reward_pending", "reward_approved", "reward_issued"]) {
      expect(EVENT_TYPES).not.toContain(name);
    }
    const files = ROOTS.flatMap((root) => sourceFiles(path.join(process.cwd(), root)));
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (text.includes("localStorage") || text.includes("/api/impact") || text.includes("ingestResidentEvent") || text.includes("@/lib/impact")) {
        hits.push(file);
      }
      if (/stripe|paypal|twilio|mailto:|sms:/i.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
    const impactRoots = ["app/impact", "components/impact", "lib/impact"].flatMap((root) => sourceFiles(path.join(process.cwd(), root)));
    for (const file of impactRoots) {
      const text = readFileSync(file, "utf8");
      expect(text.includes("@/lib/journey"), file).toBe(false);
      expect(text.includes("Avery"), file).toBe(false);
    }
    expect(MONEY_NOTE).toMatch(/not real money/i);
    expect(ACCESSIBLE_ALTERNATIVE.length).toBeGreaterThan(20);
    expect(PILOT_LIMIT).toMatch(/not validated/);
    expect(readFileSync(path.join(process.cwd(), "components/journey/rewards-view.tsx"), "utf8")).toContain("ACCESSIBLE_ALTERNATIVE");
    expect(readFileSync(path.join(process.cwd(), "components/journey/home-view.tsx"), "utf8")).toContain("MoneyNote");
  });

  it("adds one goal when a resource is saved and does not replace other progress", () => {
    const housing = getJourneySnapshot().goals.find((goal) => goal.id === "goal-housing");
    rememberSavedProgram({ programId: "example-pantry", name: "Example pantry", categories: ["food"] });
    rememberSavedProgram({ programId: "example-pantry", name: "Example pantry", categories: ["food"] });
    const goals = getJourneySnapshot().goals.filter((goal) => goal.programId === "example-pantry");
    expect(goals).toHaveLength(1);
    expect(goals[0]?.source).toBe("saved_resource");
    expect(getJourneySnapshot().goals.find((goal) => goal.id === "goal-housing")).toBe(housing);
  });
});

function runMilestones(count: number, residentCap: number, campaignCap: number) {
  let state = emptyJourneyState({
    residentMonthlyCapDollars: residentCap,
    campaigns: [sampleCampaign("campaign-test", "Test Partner", campaignCap)],
    actions: Array.from({ length: count }, (_, index) => sampleMilestone(`m${index}`, "campaign-test")),
  });
  for (let index = 0; index < count; index += 1) state = verifyAction(state, `m${index}`, DEMO_DAY);
  return state;
}
