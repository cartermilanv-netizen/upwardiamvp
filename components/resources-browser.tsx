"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { residentCatalog } from "@/lib/catalog";
import { PublishedListing } from "@/components/published-listing";
import { resourceCategories, resourceCategory, resourceCategoryHref, resourcesForCategory } from "@/lib/resources";
import { hero, routes } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ResourcesBrowser() {
  const selected = resourceCategory(useSearchParams().get("category"));
  const rows = selected ? resourcesForCategory(residentCatalog, selected.id) : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl">Explore resources</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-700">
          Browse by the kind of help you need. You do not have to finish an assessment first. Only verified listings appear here.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resourceCategories.map((category) => {
          const current = selected?.id === category.id;
          return (
            <li key={category.id}>
              <Link
                href={resourceCategoryHref(category.id)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col gap-2 rounded-2xl border bg-white p-5 text-[#092451] shadow-sm focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none",
                  current ? "border-[#092451] ring-2 ring-[#092451]" : "border-[#e4e0d8] hover:border-[#092451]",
                )}
              >
                <span className="text-lg font-semibold">{category.title}</span>
                <span className="text-sm leading-relaxed text-stone-600">{category.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {selected && (
        <section aria-live="polite" className="rounded-2xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-[#092451]">{selected.title}</h2>
          {rows.length === 0 ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-800">
              No verified resources are listed for {selected.title}. We will not guess programs.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {rows.map((entry) => (
                <li key={entry.id}>
                  <PublishedListing entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <aside className="rounded-2xl bg-[#092451] px-5 py-6 text-white sm:px-6">
        <h2 className="text-xl font-semibold">Want a plan for your household?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90">
          Personalized matching is optional. The assessment stays on this device and only uses verified listings.
        </p>
        <Link href={hero.primaryHref} className="mt-4 inline-flex h-11 items-center rounded-lg bg-[#FFC928] px-4 text-sm font-semibold text-[#092451] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
          {hero.primaryLabel}
        </Link>
      </aside>
      <p className="text-sm text-stone-600">
        <Link href={routes.home} className="font-medium text-[#092451] underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
