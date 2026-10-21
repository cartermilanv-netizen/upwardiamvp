import Link from "next/link";
import { CategoryIcon, NeedIcon } from "@/components/explore/icons";
import {
  ELIGIBILITY_NOTE,
  benefitSentence,
  officialApplication,
  programDetailHref,
  programTypeLabel,
  resourceCategories,
  resourceCategoryHref,
  resourceNeedHref,
  type ResourceCategory,
  type ResourceNeed,
} from "@/lib/resources";
import type { VerifiedCatalogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryCard({
  category,
  selected = false,
  compact = false,
}: {
  category: ResourceCategory;
  selected?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={resourceCategoryHref(category.id)}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "group flex h-full flex-col rounded-3xl border bg-white text-[#092451] shadow-sm transition hover:-translate-y-0.5 hover:border-[#092451] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none",
        compact ? "min-w-44 gap-2 p-3" : "gap-3 p-5",
        selected ? "border-[#092451] bg-[#fffaf0] ring-2 ring-[#092451]" : "border-[#e4e0d8]",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-2xl transition",
          compact ? "size-10" : "size-12",
          selected ? "bg-[#FFC928] text-[#092451]" : "bg-[#e7eef8] text-[#092451] group-hover:bg-[#FFC928]",
        )}
      >
        <CategoryIcon id={category.id} className={compact ? "size-5" : "size-6"} />
      </span>
      <span className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-xl")}>{category.title}</span>
      {!compact && <span className="text-base leading-relaxed text-stone-700">{category.description}</span>}
    </Link>
  );
}

export function CategorySwitcher({ currentId }: { currentId: string }) {
  return (
    <nav aria-label="Categories">
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {resourceCategories.map((category) => (
          <li key={category.id} className="w-40 shrink-0 sm:w-44">
            <CategoryCard category={category} selected={category.id === currentId} compact />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NeedCard({ need }: { need: ResourceNeed }) {
  return (
    <Link
      href={resourceNeedHref(need.categoryId, need.id)}
      className="group flex h-full flex-col gap-3 rounded-3xl border border-[#e4e0d8] bg-white p-5 text-[#092451] shadow-sm transition hover:-translate-y-0.5 hover:border-[#092451] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
    >
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#e7eef8] text-[#092451] transition group-hover:bg-[#FFC928]">
        <NeedIcon id={need.id} className="size-6" />
      </span>
      <span className="text-lg font-semibold tracking-tight">{need.label}</span>
      <span className="text-base leading-relaxed text-stone-700">{need.summary}</span>
    </Link>
  );
}

export function ProgramResultCard({ entry, need }: { entry: VerifiedCatalogEntry; need: ResourceNeed }) {
  const detailHref = programDetailHref(entry.id, need.id);
  const application = officialApplication(entry);
  return (
    <article className="flex h-full flex-col gap-3 rounded-3xl border border-[#e4e0d8] bg-white p-4 shadow-sm transition hover:border-[#092451] sm:p-5">
      <Link href={detailHref} className="flex flex-col gap-2 rounded-2xl focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">{programTypeLabel(entry.id, need.id)}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[#092451]">{entry.name}</h2>
        <p className="text-sm font-medium text-stone-600">{need.label}</p>
        <p className="text-base leading-relaxed text-stone-800">{benefitSentence(entry.claimText)}</p>
        <p className="text-sm leading-relaxed text-stone-700">{ELIGIBILITY_NOTE}</p>
        <span className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[#092451] px-4 text-sm font-semibold text-white">
          View program details
        </span>
      </Link>
      {application && (
        <div>
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#092451] bg-white px-4 text-sm font-semibold text-[#092451] hover:bg-[#fffaf0] focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none sm:w-auto"
          >
            Official application
          </a>
          {application.note && <p className="mt-2 text-sm leading-relaxed text-stone-600">{application.note}</p>}
        </div>
      )}
    </article>
  );
}
