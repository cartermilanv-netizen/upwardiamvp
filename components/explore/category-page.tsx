import { CategorySwitcher, NeedCard } from "@/components/explore/cards";
import { ExploreBack, ExploreCrumbs, ExploreMain, YellowRule } from "@/components/explore/frame";
import { ExploreSearch } from "@/components/explore/search-form";
import { EXPLORE_CATEGORY, needsForCategory, resourceCategory, type ResourceCategoryId } from "@/lib/resources";
import { routes } from "@/lib/site";

export function CategoryExplore({ categoryId }: { categoryId: ResourceCategoryId }) {
  const category = resourceCategory(categoryId);
  if (!category) return null;
  const needs = needsForCategory(category.id);
  return (
    <ExploreMain>
      <ExploreBack href={routes.resources} label="Back" />
      <ExploreCrumbs
        items={[
          { href: routes.resources, label: "Explore resources" },
          { label: category.title },
        ]}
      />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">{category.title}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl sm:leading-tight">{EXPLORE_CATEGORY.title}</h1>
        <YellowRule />
        <p className="mt-3 text-base leading-relaxed text-stone-700 sm:text-lg">{EXPLORE_CATEGORY.subtitle}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {needs.map((need) => (
          <li key={need.id}>
            <NeedCard need={need} />
          </li>
        ))}
      </ul>
      <CategorySwitcher currentId={category.id} />
      <ExploreSearch />
    </ExploreMain>
  );
}
