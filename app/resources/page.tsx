import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreHomeGate } from "@/components/explore/home-gate";

export const metadata: Metadata = {
  title: "Explore resources | Upwardia",
  description: "Explore resources and find support for yourself or your household.",
};

export default function ResourcesPage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading resources…</main>}>
      <ExploreHomeGate />
    </Suspense>
  );
}
