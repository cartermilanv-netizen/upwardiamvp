import Link from "next/link";
import { CategoryCard, NeedCard, ProgramResultCard } from "@/components/explore/cards";
import { ExploreMain, YellowRule } from "@/components/explore/frame";
import { ExploreSearch } from "@/components/explore/search-form";
import { residentCatalog } from "@/lib/catalog";
import { EXPLORE_HOME, exploreSearch, needsForProgram, resourceCategories } from "@/lib/resources";
import { routes } from "@/lib/site";

export function ExploreHome({ query }: { query: string }) {
  const result = exploreSearch(query, residentCatalog);
  return (
    <ExploreMain>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451] sm:text-5xl">{EXPLORE_HOME.title}</h1>
        <YellowRule />
        <p className="mt-3 text-base leading-relaxed text-stone-700 sm:text-lg">{EXPLORE_HOME.subtitle}</p>
      </div>
      <ExploreSearch initialQuery={query} />
      <aside className="flex flex-col gap-3 rounded-3xl bg-[#092451] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-base leading-relaxed">
          Get personalized recommendations. The household assessment stays on this device and only uses published listings.
        </p>
        <Link
          href={routes.assessment}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#FFC928] px-4 text-base font-semibold text-[#092451] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          Start the household assessment
        </Link>
      </aside>
      {query.trim() && result.kind === "none" && (
        <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5" aria-live="polite">
          <h2 className="text-xl font-semibold text-[#092451]">No published listing matches that search.</h2>
          <p className="mt-2 text-base leading-relaxed text-stone-700">We will not guess a program. You can browse a category or ask a question.</p>
        </section>
      )}
      {result.kind === "needs" && (
        <section aria-live="polite">
          <h2 className="text-xl font-semibold text-[#092451]">More than one area matches</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.needs.map((need) => (
              <li key={need.id}>
                <NeedCard need={need} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.kind === "programs" && (
        <section aria-live="polite">
          <h2 className="text-xl font-semibold text-[#092451]">Published matches</h2>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {result.programs.map((entry) => {
              const need = needsForProgram(entry.id)[0];
              if (!need) return null;
              return (
                <li key={entry.id}>
                  <ProgramResultCard entry={entry} need={need} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resourceCategories.map((category) => (
          <li key={category.id}>
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>
    </ExploreMain>
  );
}
