"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { rememberSavedProgram, noteSavedProgramRemoved } from "@/lib/journey/store";
import { parseSavedProgramIds, readSavedResourcesRaw, setProgramSaved, subscribeSavedResources } from "@/lib/saved-resources";
import type { CatalogCategory } from "@/lib/types";

export function SaveProgramButton({
  programId,
  name,
  categories,
}: {
  programId: string;
  name: string;
  categories: readonly CatalogCategory[];
}) {
  const raw = useSyncExternalStore(subscribeSavedResources, readSavedResourcesRaw, () => null);
  const saved = parseSavedProgramIds(raw).includes(programId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        const next = !saved;
        setProgramSaved(programId, next);
        if (next) rememberSavedProgram({ programId, name, categories });
        else noteSavedProgramRemoved(programId, name);
      }}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FFC928] px-4 text-sm font-semibold text-[#092451] focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {saved ? <BookmarkCheck aria-hidden className="size-4" /> : <Bookmark aria-hidden className="size-4" />}
      {saved ? "Saved to My Plan" : "Save to My Plan"}
    </button>
  );
}

export function PreparationJump() {
  return (
    <button
      type="button"
      onClick={() => document.getElementById("application-preparation")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="inline-flex h-11 items-center justify-center rounded-xl border border-[#092451] bg-white px-4 text-sm font-semibold text-[#092451] hover:bg-[#fffaf0] focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
    >
      Start Application Preparation
    </button>
  );
}
