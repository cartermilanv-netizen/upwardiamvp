"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { MoneyNote, ProgressMeter } from "@/components/journey/money-note";
import { getApplicationSnapshot, getServerApplicationSnapshot, subscribeApplications } from "@/lib/applications/store";
import { DEMO_DAY, PILOT_LIMIT } from "@/lib/journey/constants";
import {
  activeGoals,
  applicationsInProgress,
  monthlyRewardProgress,
  monthKey,
  recentAchievements,
  todaysActions,
  visibleNotices,
} from "@/lib/journey/logic";
import { getJourneySnapshot, getServerJourneySnapshot, subscribeJourney } from "@/lib/journey/store";
import { DOMAIN_LABEL } from "@/lib/journey/types";
import type { ActionStatus, GoalChoice } from "@/lib/journey/types";
import { routes } from "@/lib/site";

const CHOICE_LABEL: Record<GoalChoice, string> = {
  active: "Active",
  completed: "Completed",
  skipped: "Skipped",
  postponed: "Postponed",
  stuck: "Stuck",
};

const ACTION_LABEL: Record<ActionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed_self_reported: "Completed, self-reported",
  pending_verification: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1)),
  );
}

export function JourneyHome() {
  const journey = useSyncExternalStore(subscribeJourney, getJourneySnapshot, getServerJourneySnapshot);
  const applications = useSyncExternalStore(subscribeApplications, getApplicationSnapshot, getServerApplicationSnapshot);
  const name = applications.profile.preferredName;
  const goals = activeGoals(journey);
  const today = todaysActions(journey, DEMO_DAY);
  const inProgress = applicationsInProgress(applications);
  const reminders = visibleNotices(journey).slice(0, 3);
  const rewards = monthlyRewardProgress(journey, monthKey(DEMO_DAY));
  const achievements = recentAchievements(journey);
  const rewardPct = rewards.cap === 0 ? 0 : Math.min(100, Math.round((rewards.used / rewards.cap) * 100));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10">
      <MoneyNote />
      <header>
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">My Journey</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl">Hello, {name}</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
          {name} is a made-up resident. Today is {formatDay(DEMO_DAY)}. This screen is a demonstration, not a new account. Your assessment and application drafts stay where they already are.
        </p>
      </header>

      <section aria-labelledby="journey-goals" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <h2 id="journey-goals" className="text-xl font-semibold text-[#092451]">
            Active goals
          </h2>
          <Link href={routes.goals} className="text-sm font-semibold text-[#092451] underline-offset-4 hover:underline">
            My Goals
          </Link>
        </div>
        {goals.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-700">No active goals yet. You can add one on My Goals.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {goals.map((goal) => (
              <li key={goal.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#092451]">{goal.title}</h3>
                  <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-xs font-semibold text-[#092451]">{DOMAIN_LABEL[goal.domain]}</span>
                  {goal.priority && <span className="rounded-full bg-[#FFC928] px-2 py-0.5 text-xs font-semibold text-[#092451]">Priority</span>}
                  <span className="rounded-full border border-[#092451] px-2 py-0.5 text-xs font-semibold text-[#092451]">{CHOICE_LABEL[goal.choice]}</span>
                </div>
                <div className="mt-2">
                  <ProgressMeter value={goal.progress} label={`${goal.title} progress`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="journey-today" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 id="journey-today" className="text-xl font-semibold text-[#092451]">
              Today&apos;s actions
            </h2>
            <Link href={routes.actions} className="text-sm font-semibold text-[#092451] underline-offset-4 hover:underline">
              My Actions
            </Link>
          </div>
          {today.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">Nothing is due today. You can still open My Actions.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {today.map((action) => (
                <li key={action.id} className="border-t border-[#f4f1ea] pt-3">
                  <p className="font-medium text-stone-950">{action.description}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {ACTION_LABEL[action.status]}
                    {action.eligibleRewardAmount > 0 ? ` · $${action.eligibleRewardAmount} demonstration milestone, not money` : " · no demonstration reward"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="journey-apps" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 id="journey-apps" className="text-xl font-semibold text-[#092451]">
              Applications in progress
            </h2>
            <Link href={routes.applications} className="text-sm font-semibold text-[#092451] underline-offset-4 hover:underline">
              My Applications
            </Link>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">These are the drafts already in the application center. Answers are not copied here.</p>
          {inProgress.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">No application draft is in progress.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {inProgress.map((item) => (
                <li key={item.draftId} className="border-t border-[#f4f1ea] pt-3">
                  <Link href={`${routes.applications}/${item.draftId}`} className="font-semibold text-[#092451] underline-offset-4 hover:underline">
                    {item.programName}
                  </Link>
                  <p className="mt-1 text-sm text-stone-700">
                    {item.filled} of {item.required} required answers · {item.status.replaceAll("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="journey-reminders" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 id="journey-reminders" className="text-xl font-semibold text-[#092451]">
              Reminders
            </h2>
            <Link href={routes.notifications} className="text-sm font-semibold text-[#092451] underline-offset-4 hover:underline">
              Notifications
            </Link>
          </div>
          {reminders.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">No reminders right now.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {reminders.map((notice) => (
                <li key={notice.id} className="border-t border-[#f4f1ea] pt-3">
                  <p className="font-medium text-stone-950">{notice.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-700">{notice.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="journey-rewards" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <h2 id="journey-rewards" className="text-xl font-semibold text-[#092451]">
              Monthly reward progress
            </h2>
            <Link href={routes.rewards} className="text-sm font-semibold text-[#092451] underline-offset-4 hover:underline">
              My Rewards
            </Link>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#092451]">Demonstration pilot</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">
            ${rewards.used} of ${rewards.cap} this month. {PILOT_LIMIT}
          </p>
          <div
            className="mt-3 h-3 rounded-full bg-[#e4e0d8]"
            role="progressbar"
            aria-valuenow={rewards.used}
            aria-valuemin={0}
            aria-valuemax={rewards.cap}
            aria-label={`Demonstration reward progress, ${rewards.used} dollars of ${rewards.cap} dollars. Not real money.`}
          >
            <div className="h-3 rounded-full bg-[#092451]" style={{ width: `${rewardPct}%` }} />
          </div>
        </section>
      </div>

      <section aria-labelledby="journey-achievements" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 id="journey-achievements" className="text-xl font-semibold text-[#092451]">
          Recent achievements
        </h2>
        {achievements.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700">Completed goals and verified steps will show up here.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {achievements.map((item) => (
              <li key={item.id} className="border-t border-[#f4f1ea] pt-3">
                <p className="font-medium text-stone-950">{item.title}</p>
                <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="journey-ask" className="rounded-2xl bg-[#092451] p-4 text-white sm:p-5">
        <h2 id="journey-ask" className="text-xl font-semibold">
          Ask Upwardia
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90">
          Ask about a published program. Upwardia can help you prepare. It does not submit an application for you.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href={routes.ask} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FFC928] px-4 text-sm font-semibold text-[#092451]">
            Ask Upwardia
          </Link>
          <Link href={routes.resources} className="inline-flex h-11 items-center justify-center rounded-lg border border-white px-4 text-sm font-semibold text-white">
            Explore Resources
          </Link>
        </div>
      </section>
    </main>
  );
}
