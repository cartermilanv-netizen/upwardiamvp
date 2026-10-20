"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { missingFieldIds, requiredProgress } from "@/lib/applications/logic";
import { getApplicationSnapshot, getServerApplicationSnapshot, subscribeApplications } from "@/lib/applications/store";
import type { ApplicationStatus } from "@/lib/applications/types";
import { routes } from "@/lib/site";

const statusLabel: Record<ApplicationStatus, string> = {
  not_started: "Not started",
  draft: "In progress",
  needs_review: "Needs review",
  ready: "Ready to review",
};

export function ApplicationsDashboard() {
  const snapshot = useSyncExternalStore(subscribeApplications, getApplicationSnapshot, getServerApplicationSnapshot);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Demonstration only</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl">My applications</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-700">
          Harbor Pantry Box and Northline Utility Pause are made-up programs. They are not government forms, and nothing here is submitted.
        </p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {snapshot.drafts.map((draft) => {
          const program = snapshot.programs.find((item) => item.id === draft.programId);
          if (!program) return null;
          const progress = requiredProgress(program.schema, draft.values);
          const missing = missingFieldIds(program.schema, draft.values);
          return (
            <li key={draft.id}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border border-[#e4e0d8] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#092451]">{program.name}</h2>
                  <span className="shrink-0 rounded-full bg-[#FFC928] px-2 py-1 text-xs font-semibold text-[#092451]">{statusLabel[draft.status]}</span>
                </div>
                <p className="text-sm leading-relaxed text-stone-700">{program.summary}</p>
                <p className="text-sm text-stone-800">
                  {progress.filled} of {progress.required} required answers
                  {missing.length > 0 ? ` · ${missing.length} still missing` : ""}
                </p>
                <Link
                  href={`${routes.applications}/${draft.id}`}
                  className="mt-auto inline-flex h-11 items-center justify-center rounded-lg bg-[#092451] px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {draft.status === "not_started" ? "Start application" : "Continue application"}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
