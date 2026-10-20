import type { Metadata } from "next";
import { Suspense } from "react";
import { ResourcesBrowser } from "@/components/resources-browser";

export const metadata: Metadata = {
  title: "Explore resources | Upwardia",
  description: "Browse verified community resources by category.",
};

export default function ResourcesPage() {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading resources…</main>}>
      <ResourcesBrowser />
    </Suspense>
  );
}
