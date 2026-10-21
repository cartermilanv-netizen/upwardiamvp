import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NeedExplore } from "@/components/explore/need-page";
import { resourceNeed, resourceNeeds, type ResourceNeedId } from "@/lib/resources";

export function generateStaticParams() {
  return resourceNeeds.map((need) => ({ category: need.categoryId, need: need.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; need: string }>;
}): Promise<Metadata> {
  const { category, need } = await params;
  const match = resourceNeed(need);
  if (!match || match.categoryId !== category) return { title: "Explore resources | Upwardia" };
  return {
    title: `${match.label} | Upwardia`,
    description: match.summary,
  };
}

export default function ResourceNeedPage({ params }: { params: Promise<{ category: string; need: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading resources…</main>}>
      <NeedContent params={params} />
    </Suspense>
  );
}

async function NeedContent({ params }: { params: Promise<{ category: string; need: string }> }) {
  const { category, need } = await params;
  const match = resourceNeed(need);
  if (!match || match.categoryId !== category) notFound();
  return <NeedExplore categoryId={category} needId={match.id as ResourceNeedId} />;
}
