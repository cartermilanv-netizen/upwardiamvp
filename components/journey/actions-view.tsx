"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { MoneyNote } from "@/components/journey/money-note";
import { ACCESSIBLE_ALTERNATIVE, DEMO_DAY } from "@/lib/journey/constants";
import { sortedActions } from "@/lib/journey/logic";
import { askVerification, beginAction, chooseResidentAction, getJourneySnapshot, getServerJourneySnapshot, simulateRejection, simulateVerification, subscribeJourney } from "@/lib/journey/store";
import type { ActionStatus } from "@/lib/journey/types";

const STATUS_LABEL: Record<ActionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed_self_reported: "Completed, self-reported",
  pending_verification: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

const SOURCE_LABEL = {
  resident: "You added this step.",
  assessment_plan: "From your assessment plan.",
  published_program: "From a published program page.",
  demonstration: "Demonstration step.",
} as const;

export function ActionsView() {
  const state = useSyncExternalStore(subscribeJourney, getJourneySnapshot, getServerJourneySnapshot);
  const actions = sortedActions(state, DEMO_DAY);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10">
      <MoneyNote />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My Actions</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
          Each step belongs to one goal. Complete, skip, postpone, or mark it stuck. A completed step is not a reward, and a preparatory step is not an outcome.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">{ACCESSIBLE_ALTERNATIVE}</p>
      </header>
      {state.rewardNotice && (
        <p role="status" className="rounded-xl border border-[#e4e0d8] bg-white px-3 py-2 text-sm text-[#092451]">
          {state.rewardNotice.text}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {actions.map((action) => {
          const goal = state.goals.find((item) => item.id === action.goalId);
          return (
            <li key={action.id} className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
              <p className="text-sm font-semibold text-[#092451]">{goal?.title ?? "Goal"}</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">{action.description}</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-stone-500">Status</dt>
                  <dd className="font-medium text-stone-900">{STATUS_LABEL[action.status]}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Type</dt>
                  <dd className="font-medium text-stone-900">{action.type}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Due</dt>
                  <dd className="font-medium text-stone-900">{action.dueDate ?? "No date"}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Completed</dt>
                  <dd className="font-medium text-stone-900">{action.completionDate ?? "Not yet"}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Verification</dt>
                  <dd className="font-medium text-stone-900">
                    {action.verificationMethod.replaceAll("_", " ")} · {action.verificationStatus.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Demonstration reward</dt>
                  <dd className="font-medium text-stone-900">
                    {action.eligibleRewardAmount > 0 ? `$${action.eligibleRewardAmount} after verification, once` : "None"}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-stone-600">{SOURCE_LABEL[action.instructionSource]}</p>
              {action.countsAsOutcome === false && action.type === "preparation" && (
                <p className="mt-1 text-sm text-stone-600">Preparation only. This does not count as an outcome.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {action.status === "not_started" && (
                  <Button type="button" className="h-11 px-3" onClick={() => beginAction(action.id)}>
                    Start
                  </Button>
                )}
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => chooseResidentAction(action.id, "complete")}>
                  Complete
                </Button>
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => chooseResidentAction(action.id, "skip")}>
                  Skip
                </Button>
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => chooseResidentAction(action.id, "postpone")}>
                  Postpone
                </Button>
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => chooseResidentAction(action.id, "stuck")}>
                  Stuck
                </Button>
              </div>
              {action.status === "completed_self_reported" && action.eligibleRewardAmount > 0 && (
                <Button type="button" variant="secondary" className="mt-2 h-11 px-3" onClick={() => askVerification(action.id)}>
                  Ask for verification
                </Button>
              )}
              {(action.status === "pending_verification" || action.status === "completed_self_reported") && action.eligibleRewardAmount > 0 && (
                <div className="mt-3 rounded-xl bg-[#f4f1ea] p-3">
                  <p className="text-sm leading-relaxed text-stone-700">
                    Simulate a partner review for this demonstration. This does not send a payment.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" className="h-11 px-3" onClick={() => simulateVerification(action.id)}>
                      Record demonstration verification
                    </Button>
                    <Button type="button" variant="outline" className="h-11 bg-white px-3" onClick={() => simulateRejection(action.id)}>
                      Record a rejection
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
