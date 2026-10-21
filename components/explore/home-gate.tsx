"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ExploreHome } from "@/components/explore/home";
import { residentCatalog } from "@/lib/catalog";
import { exploreSearch, resourceCategory, resourceCategoryHref, resourceNeedHref } from "@/lib/resources";

export function ExploreHomeGate() {
  const params = useSearchParams();
  const router = useRouter();
  const legacy = resourceCategory(params.get("category"));
  const query = params.get("q") ?? "";
  const result = exploreSearch(query, residentCatalog);
  const destination = legacy
    ? resourceCategoryHref(legacy.id)
    : result.kind === "need"
      ? resourceNeedHref(result.need.categoryId, result.need.id)
      : null;

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (destination) return <main className="px-4 py-10 text-stone-700">Loading resources…</main>;
  return <ExploreHome query={query} />;
}