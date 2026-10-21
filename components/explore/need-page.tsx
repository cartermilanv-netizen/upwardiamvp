import Link from "next/link";
import { ProgramResultCard } from "@/components/explore/cards";
import { ExploreBack, ExploreCrumbs, ExploreMain } from "@/components/explore/frame";
import { ExploreSearch } from "@/components/explore/search-form";
import { residentCatalog } from "@/lib/catalog";
import {
  EMPTY_NEED_MESSAGE,
  askAboutNeedHref,
  emptyNeedChatMessage,
  programsForNeed,
  resourceCategory,
  resourceCategoryHref,
  resourceNeed,
  type ResourceNeedId,
} from "@/lib/resources";
import { routes } from "@/lib/site";

export function NeedExplore({ categoryId, needId }: { categoryId: string; needId: ResourceNeedId }) {
  const category = resourceCategory(categoryId);
  const need = resourceNeed(needId);
  if (!category || !need || need.categoryId !== category.id) return null;
  const programs = programsForNeed(residentCatalog, need.id);
  return (
    <ExploreMain>
      <ExploreBack href={resourceCategoryHref(category.id)} label="Back" />
      <ExploreCrumbs
        items={[
          { href: routes.resources, label: "Explore resources" },
          { href: resourceCategoryHref(category.id), label: category.title },
          { label: need.label },
        ]}
      />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">{category.title}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl">{need.label}</h1>
        <p className="mt-2 text-base leading-relaxed text-stone-700">{need.summary}</p>
      </div>
      {programs.length === 0 ? (
        <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-8" aria-live="polite">
          <p className="text-lg leading-relaxed font-medium text-[#092451]">{EMPTY_NEED_MESSAGE}</p>
          <p className="mt-3 text-base leading-relaxed text-stone-700">{emptyNeedChatMessage(need.label)}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href={routes.assessment}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#092451] px-4 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Take the household assessment
            </Link>
            <Link
              href={askAboutNeedHref(need.id)}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#FFC928] px-4 text-base font-semibold text-[#092451] focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Ask Upwardia
            </Link>
          </div>
        </section>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {programs.map((entry) => (
            <li key={entry.id}>
              <ProgramResultCard entry={entry} need={need} />
            </li>
          ))}
        </ul>
      )}
      <ExploreSearch />
    </ExploreMain>
  );
}
