"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { residentCatalog } from "@/lib/catalog";
import { EXPLORE_HOME, exploreSearch, resourceNeedHref } from "@/lib/resources";
import { routes } from "@/lib/site";

export function ExploreSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    const result = exploreSearch(query, residentCatalog);
    if (result.kind === "need") {
      router.push(resourceNeedHref(result.need.categoryId, result.need.id));
      return;
    }
    if (!query) {
      router.push(routes.resources);
      return;
    }
    router.push(`${routes.resources}?q=${encodeURIComponent(query)}`);
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="resource-search" className="text-sm font-semibold text-[#092451]">
          Search
        </label>
        <input
          id="resource-search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={EXPLORE_HOME.searchPlaceholder}
          autoComplete="off"
          className="mt-1 h-12 w-full rounded-xl border border-[#e4e0d8] bg-white px-3 text-base text-stone-950 placeholder:text-stone-500 focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#092451] px-5 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Search aria-hidden className="size-5" />
        Search
      </button>
    </form>
  );
}
