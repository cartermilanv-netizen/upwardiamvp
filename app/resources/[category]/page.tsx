import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryExplore } from "@/components/explore/category-page";
import { resourceCategories, resourceCategory, type ResourceCategoryId } from "@/lib/resources";

export function generateStaticParams() {
  return resourceCategories.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const group = resourceCategory(category);
  return {
    title: group ? `${group.title} | Upwardia` : "Explore resources | Upwardia",
    description: group?.description ?? "Choose an area to explore resources.",
  };
}

export default function ResourceCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  return (
    <Suspense fallback={<main className="px-4 py-10 text-stone-700">Loading resources…</main>}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const group = resourceCategory(category);
  if (!group) notFound();
  return <CategoryExplore categoryId={group.id as ResourceCategoryId} />;
}
