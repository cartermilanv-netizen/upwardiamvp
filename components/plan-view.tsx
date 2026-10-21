"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ResultsBody } from "@/components/assessment-app";
import { buttonVariants } from "@/components/ui/button";
import { rebuildToday } from "@/lib/actions";
import { residentCatalog } from "@/lib/catalog";
import { formatLocalDate } from "@/lib/dates";
import { programDetailHref, programTypeLabel, needsForProgram } from "@/lib/resources";
import { assessmentPresence, prominentCta, routes } from "@/lib/site";
import { parseSavedProgramIds, readSavedResourcesRaw, setProgramSaved, subscribeSavedResources } from "@/lib/saved-resources";
import { parseStored, readPrototypeRaw, savePrototype, subscribePrototype } from "@/lib/storage";
import { cn } from "@/lib/utils";

function SavedPrograms() {
  const raw = useSyncExternalStore(subscribeSavedResources, readSavedResourcesRaw, () => null);
  const entries = parseSavedProgramIds(raw)
    .map((id) => residentCatalog.find((entry) => entry.id === id))
    .filter((entry) => entry?.verified === true);
  if (entries.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-[#092451]">Saved resources</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">Saved on this device. Nothing is uploaded.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {entries.map((entry) => {
          if (!entry) return null;
          const need = needsForProgram(entry.id)[0];
          return (
            <li key={entry.id} className="flex flex-col gap-2 border-t border-[#f4f1ea] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-[#092451]">{entry.name}</h3>
                <p className="text-sm text-stone-600">{need ? programTypeLabel(entry.id, need.id) : "Published program"}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={programDetailHref(entry.id, need?.id)} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#092451] px-3 text-sm font-semibold text-white">
                  View program details
                </Link>
                <button
                  type="button"
                  onClick={() => setProgramSaved(entry.id, false)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[#092451] px-3 text-sm font-semibold text-[#092451]"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PlanView() {
  const raw = useSyncExternalStore(subscribePrototype, readPrototypeRaw, () => null);
  const savedResourceRaw = useSyncExternalStore(subscribeSavedResources, readSavedResourcesRaw, () => null);
  const hasSavedResources = parseSavedProgramIds(savedResourceRaw).length > 0;
  const saved = raw ? parseStored(raw) : null;
  const presence = assessmentPresence(saved?.assessment ?? null);
  const cta = prominentCta(presence);

  if (!saved) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My plan</h1>
        <p className="text-base leading-relaxed text-stone-700">
          {hasSavedResources
            ? "Saved resources stay on this device. A household plan appears after the assessment."
            : "A plan appears after the household assessment. Nothing is saved on this device yet."}
        </p>
        <SavedPrograms />
        <Link href={routes.assessment} className={cn(buttonVariants(), "h-12 w-full text-base sm:w-auto sm:px-5")}>
          Find My Resources
        </Link>
      </main>
    );
  }

  function onAction(id: string, status: "done" | "skipped") {
    if (!saved) return;
    const next = saved.actions.map((action) =>
      action.id === id ? { ...action, status, completedAt: status === "done" ? new Date().toISOString() : null } : action,
    );
    savePrototype({
      assessment: saved.assessment,
      actions: rebuildToday(next, saved.assessment, residentCatalog, formatLocalDate(new Date())),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My plan</h1>
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          These steps come from the assessment saved on this device. We will not guess programs.
        </p>
      </div>
      {cta && (
        <Link href={cta.href} className={cn(buttonVariants(), "h-11 w-full text-base sm:w-auto sm:px-5")}>
          {cta.label}
        </Link>
      )}
      <SavedPrograms />
      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 shadow-sm sm:p-6">
        <ResultsBody draft={saved.assessment} actions={saved.actions} onAction={onAction} />
      </section>
      <Link href={routes.assessment} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline">
        Edit answers
      </Link>
    </main>
  );
}
