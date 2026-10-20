import type { CatalogCategory, VerifiedCatalogEntry } from "@/lib/types";
import { routes } from "@/lib/site";

export type ResourceCategoryId =
  | "health-wellness"
  | "financial-assistance"
  | "housing-food"
  | "education-employment"
  | "transportation"
  | "digital-access";

export type ResourceCategory = {
  id: ResourceCategoryId;
  title: string;
  description: string;
  catalog: readonly CatalogCategory[];
};

export const resourceCategories: readonly ResourceCategory[] = [
  {
    id: "health-wellness",
    title: "Health & Wellness",
    description: "Coverage and getting care.",
    catalog: ["health_coverage", "care_access"],
  },
  {
    id: "financial-assistance",
    title: "Financial Assistance",
    description: "Help with bills that a verified listing covers.",
    catalog: ["utilities"],
  },
  {
    id: "housing-food",
    title: "Housing & Food",
    description: "A place to live and enough to eat.",
    catalog: ["housing", "food"],
  },
  {
    id: "education-employment",
    title: "Education & Employment",
    description: "School, training, and work.",
    catalog: ["employment", "training"],
  },
  {
    id: "transportation",
    title: "Transportation",
    description: "Ways to get where you need to go.",
    catalog: ["transportation"],
  },
  {
    id: "digital-access",
    title: "Digital Access",
    description: "Internet, devices, and online forms.",
    catalog: ["digital"],
  },
];

export function resourceCategory(id: string | null | undefined): ResourceCategory | null {
  if (!id) return null;
  return resourceCategories.find((category) => category.id === id) ?? null;
}

export function resourceCategoryHref(id: ResourceCategoryId): string {
  return `${routes.resources}?category=${id}`;
}

export function resourcesForCategory(
  catalog: readonly VerifiedCatalogEntry[],
  categoryId: string | null | undefined,
): VerifiedCatalogEntry[] {
  const group = resourceCategory(categoryId);
  if (!group) return [];
  const allowed = new Set<string>(group.catalog);
  return catalog.filter((entry) => entry.verified === true && entry.categories.some((category) => allowed.has(category)));
}
