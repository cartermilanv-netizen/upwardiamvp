import { DEMO_DAY } from "@/lib/journey/constants";
import {
  addAssessmentGoals,
  addSavedResourceGoal,
  chooseAction,
  createManualGoal,
  createTask,
  dismissNotice,
  markNoticeRead,
  pushNotice,
  rejectAction,
  reportOutcome,
  requestVerification,
  setGoalChoice,
  setReminderPreference,
  setRewardStatus,
  startAction,
  verifyAction,
} from "@/lib/journey/logic";
import { createSeed } from "@/lib/journey/seed";
import type { ActionKind, GoalChoice, JourneyDomain, JourneyState, ReminderPreferences, RewardStatus } from "@/lib/journey/types";

const serverSeed = createSeed();
let state: JourneyState = serverSeed;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: JourneyState): void {
  if (next === state) return;
  state = next;
  emit();
}

export function subscribeJourney(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getJourneySnapshot(): JourneyState {
  return state;
}

export function getServerJourneySnapshot(): JourneyState {
  return serverSeed;
}

export function resetJourneyStore(): void {
  state = structuredClone(serverSeed);
  emit();
}

export function saveManualGoal(input: { domain: JourneyDomain; title: string; priority: boolean }): void {
  commit(createManualGoal(state, input, DEMO_DAY));
}

export function saveAssessmentGoals(goalIds: readonly string[]): void {
  commit(addAssessmentGoals(state, goalIds, DEMO_DAY));
}

export function rememberSavedProgram(input: { programId: string; name: string; categories: readonly string[] }): void {
  const existed = state.goals.some((goal) => goal.programId === input.programId);
  let next = addSavedResourceGoal(state, input, DEMO_DAY);
  if (!existed && next !== state) {
    next = pushNotice(next, {
      kind: "saved_resource_change",
      title: "Saved resource",
      body: `${input.name} was saved. A goal was added for it. This is not a deadline.`,
      href: "/goals",
      createdAt: `${DEMO_DAY}T16:00:00.000Z`,
    });
  }
  commit(next);
}

export function noteSavedProgramRemoved(programId: string, name: string): void {
  const stillThere = state.goals.some((goal) => goal.programId === programId);
  commit(
    pushNotice(state, {
      kind: "saved_resource_change",
      title: "Saved resource removed",
      body: stillThere
        ? `${name} was removed from saved resources. The goal and its progress stay.`
        : `${name} was removed from saved resources.`,
      href: "/goals",
      createdAt: `${DEMO_DAY}T16:00:00.000Z`,
    }),
  );
}

export function chooseGoal(goalId: string, choice: GoalChoice): void {
  commit(setGoalChoice(state, goalId, choice, DEMO_DAY));
}

export function reportGoalOutcome(goalId: string): void {
  commit(reportOutcome(state, goalId, DEMO_DAY));
}

export function saveTask(input: { goalId: string; description: string; type: ActionKind; dueDate: string | null; wantsReward: boolean }): void {
  commit(createTask(state, input, DEMO_DAY));
}

export function beginAction(actionId: string): void {
  commit(startAction(state, actionId));
}

export function chooseResidentAction(actionId: string, choice: "complete" | "skip" | "postpone" | "stuck"): void {
  commit(chooseAction(state, actionId, choice, DEMO_DAY));
}

export function askVerification(actionId: string): void {
  commit(requestVerification(state, actionId));
}

export function simulateVerification(actionId: string): void {
  commit(verifyAction(state, actionId, DEMO_DAY));
}

export function simulateRejection(actionId: string): void {
  commit(rejectAction(state, actionId, DEMO_DAY));
}

export function simulateRewardStatus(rewardId: string, status: RewardStatus): void {
  commit(setRewardStatus(state, rewardId, status));
}

export function readNotice(id: string): void {
  commit(markNoticeRead(state, id));
}

export function dismissJourneyNotice(id: string): void {
  commit(dismissNotice(state, id));
}

export function setPreference(key: keyof ReminderPreferences, value: boolean): void {
  commit(setReminderPreference(state, key, value));
}
