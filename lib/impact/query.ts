import { DEMO_AS_OF, rangeEnding } from "@/lib/impact/constants";
import { CATEGORY_IDS, type AppliedFilters, type CategoryId, type Principal, type RangePreset } from "@/lib/impact/types";

export type RawQuery = Record<string, string | string[] | undefined>;

export type Directory = {
  cities: readonly string[];
  programs: readonly { id: string; label: string }[];
  categories: readonly { id: CategoryId; label: string }[];
  jurisdictions: readonly { id: string; label: string }[];
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export function parseFilters(raw: RawQuery, principal: Principal, directory: Directory, asOf = DEMO_AS_OF): AppliedFilters {
  const requested = first(raw.range);
  let range: RangePreset = "90";
  let window = rangeEnding(asOf, 90);
  if (requested === "30" || requested === "90" || requested === "180") {
    range = requested;
    window = rangeEnding(asOf, Number(requested));
  } else if (isDay(first(raw.from)) && isDay(first(raw.to))) {
    const from = `${first(raw.from)}T00:00:00.000Z`;
    const to = `${first(raw.to)}T23:59:59.000Z`;
    const span = Date.parse(to) - Date.parse(from);
    if (from <= to && span <= 366 * 24 * 60 * 60 * 1000) {
      range = "custom";
      window = { from, to };
    }
  }

  const cityValue = first(raw.city);
  const city = directory.cities.includes(cityValue) ? cityValue : null;
  const programValue = first(raw.program);
  const programId = directory.programs.some((program) => program.id === programValue) ? programValue : null;
  const categoryValue = first(raw.category);
  const category = CATEGORY_IDS.includes(categoryValue as CategoryId) && directory.categories.some((item) => item.id === categoryValue)
    ? (categoryValue as CategoryId)
    : null;

  let jurisdictionId: string | null = null;
  if (principal.role === "super_admin") {
    const requestedJurisdiction = first(raw.jurisdiction);
    jurisdictionId = directory.jurisdictions.some((item) => item.id === requestedJurisdiction) ? requestedJurisdiction : null;
  } else {
    jurisdictionId = principal.jurisdictionId;
  }

  return { from: window.from, to: window.to, city, jurisdictionId, programId, category, range };
}

export function filtersToQuery(filters: AppliedFilters, patch: Partial<AppliedFilters> = {}): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.range === "30" || next.range === "90" || next.range === "180") {
    params.set("range", next.range);
  } else {
    params.set("from", next.from.slice(0, 10));
    params.set("to", next.to.slice(0, 10));
  }
  if (next.city) params.set("city", next.city);
  if (next.jurisdictionId) params.set("jurisdiction", next.jurisdictionId);
  if (next.programId) params.set("program", next.programId);
  if (next.category) params.set("category", next.category);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hrefFor(path: string, filters: AppliedFilters, patch: Partial<AppliedFilters> = {}): string {
  return `${path}${filtersToQuery(filters, patch)}`;
}
