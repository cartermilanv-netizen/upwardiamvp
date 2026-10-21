"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyNote } from "@/components/journey/money-note";
import { visibleNotices, type DeadlineFact } from "@/lib/journey/logic";
import { dismissJourneyNotice, getJourneySnapshot, getServerJourneySnapshot, readNotice, setPreference, subscribeJourney } from "@/lib/journey/store";
import type { NoticeKind, ReminderPreferences } from "@/lib/journey/types";

const PREFERENCES: { key: keyof ReminderPreferences; label: string; help: string }[] = [
  { key: "taskReminders", label: "Task reminders", help: "Steps that are due." },
  { key: "applicationPrepReminders", label: "Application preparation", help: "Drafts already in My Applications." },
  { key: "deadlines", label: "Program deadlines", help: "Only when a published record states a resident deadline." },
  { key: "savedResourceChanges", label: "Saved resources", help: "When you save or remove a resource." },
  { key: "goalMilestones", label: "Goal milestones", help: "Progress on a goal." },
  { key: "rewardVerification", label: "Reward verification", help: "Demonstration review only. Not a payment." },
];

const KIND_LABEL: Record<NoticeKind, string> = {
  task_reminder: "Task",
  application_prep: "Application preparation",
  deadline: "Deadline",
  saved_resource_change: "Saved resource",
  goal_milestone: "Goal",
  reward_verification: "Reward verification",
};

export function NoticesView({ deadlines }: { deadlines: readonly DeadlineFact[] }) {
  const state = useSyncExternalStore(subscribeJourney, getJourneySnapshot, getServerJourneySnapshot);
  const notices = visibleNotices(state);
  const shown = state.preferences.deadlines ? deadlines : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10">
      <MoneyNote />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">Notifications</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
          These stay in the app. There is no email, text message, or push alert. Mark a reminder read or dismiss it.
        </p>
      </header>

      <fieldset className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <legend className="px-1 text-lg font-semibold text-[#092451]">Reminder preferences</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PREFERENCES.map((item) => (
            <div key={item.key} className="flex items-start gap-3 rounded-xl border border-[#e4e0d8] p-3">
              <input
                id={`pref-${item.key}`}
                type="checkbox"
                className="mt-1 size-5 accent-[#092451]"
                checked={state.preferences[item.key]}
                onChange={(event) => setPreference(item.key, event.target.checked)}
              />
              <div>
                <Label htmlFor={`pref-${item.key}`}>{item.label}</Label>
                <p className="mt-1 text-sm text-stone-600">{item.help}</p>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="deadline-heading" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 id="deadline-heading" className="text-lg font-semibold text-[#092451]">
          Program deadlines
        </h2>
        {shown.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            {state.preferences.deadlines
              ? "No program deadline is listed. A date appears here only when a published record states a resident deadline. The published programs do not have that field, so none is shown."
              : "Program deadline reminders are off. A date would appear only when a published record states a resident deadline."}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {shown.map((item) => (
              <li key={`${item.recordId}-${item.field}`} className="text-sm text-stone-800">
                {item.date} · published field {item.field}
              </li>
            ))}
          </ul>
        )}
      </section>

      {notices.length === 0 ? (
        <p className="text-sm text-stone-700">No reminders right now.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.map((notice) => (
            <li key={notice.id} className="rounded-2xl border border-[#e4e0d8] bg-white p-4">
              <p className="text-xs font-semibold tracking-wide text-[#092451] uppercase">{KIND_LABEL[notice.kind]}</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">{notice.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-700">{notice.body}</p>
              <p className="mt-1 text-sm text-stone-500">{notice.read ? "Read" : "Unread"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {notice.href && (
                  <Link href={notice.href} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#092451] px-3 text-sm font-semibold text-white">
                    Open
                  </Link>
                )}
                {!notice.read && (
                  <Button type="button" variant="outline" className="h-11 px-3" onClick={() => readNotice(notice.id)}>
                    Mark read
                  </Button>
                )}
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => dismissJourneyNotice(notice.id)}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
