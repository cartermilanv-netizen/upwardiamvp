"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ResultsBody } from "@/components/assessment-app";
import { buttonVariants } from "@/components/ui/button";
import { rebuildToday } from "@/lib/actions";
import { residentCatalog } from "@/lib/catalog";
import { formatLocalDate } from "@/lib/dates";
import { assessmentPresence, prominentCta, routes } from "@/lib/site";
import { parseStored, readPrototypeRaw, savePrototype, subscribePrototype } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function PlanView() {
  const raw = useSyncExternalStore(subscribePrototype, readPrototypeRaw, () => null);
  const saved = raw ? parseStored(raw) : null;
  const presence = assessmentPresence(saved?.assessment ?? null);
  const cta = prominentCta(presence);

  if (!saved) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My plan</h1>
        <p className="text-base leading-relaxed text-stone-700">
          A plan appears after the household assessment. Nothing is saved on this device yet.
        </p>
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
      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 shadow-sm sm:p-6">
        <ResultsBody draft={saved.assessment} actions={saved.actions} onAction={onAction} />
      </section>
      <Link href={routes.assessment} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline">
        Edit answers
      </Link>
    </main>
  );
}
