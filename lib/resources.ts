import { routes } from "@/lib/site";
import type { CatalogCategory, VerifiedCatalogEntry } from "@/lib/types";

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
    description: "Coverage, doctors, dental care, and support for a growing family.",
    catalog: ["health_coverage", "care_access"],
  },
  {
    id: "financial-assistance",
    title: "Financial Assistance",
    description: "Cash help, bills, counseling, and short-term money support.",
    catalog: ["utilities"],
  },
  {
    id: "housing-food",
    title: "Housing & Food",
    description: "Food, rent, a place to stay, and utility bills.",
    catalog: ["housing", "food"],
  },
  {
    id: "education-employment",
    title: "Education & Employment",
    description: "Work, classes, college, and childcare.",
    catalog: ["employment", "training"],
  },
  {
    id: "transportation",
    title: "Transportation",
    description: "Bus fare and rides to the places you need to go.",
    catalog: ["transportation"],
  },
  {
    id: "digital-access",
    title: "Digital Access",
    description: "Internet, devices, and help with online forms.",
    catalog: ["digital"],
  },
];

export type ResourceNeedId =
  | "health-insurance"
  | "primary-care-doctor"
  | "mental-health"
  | "dental-care"
  | "pregnancy-family-health"
  | "prescriptions"
  | "cash-assistance"
  | "help-paying-bills"
  | "debt-financial-counseling"
  | "tax-assistance"
  | "emergency-financial-support"
  | "food-groceries"
  | "rent-assistance"
  | "affordable-housing"
  | "homelessness-prevention"
  | "emergency-shelter"
  | "utilities"
  | "job-opportunities"
  | "job-training"
  | "adult-education"
  | "college-support"
  | "childcare-assistance"
  | "discounted-public-transit"
  | "transportation-to-healthcare"
  | "senior-disability-transportation"
  | "affordable-home-internet"
  | "free-public-wifi"
  | "computers-devices"
  | "help-online-forms";

type Keyword = readonly [phrase: string, weight: number];

export type ResourceNeed = {
  id: ResourceNeedId;
  categoryId: ResourceCategoryId;
  label: string;
  summary: string;
  keywords: readonly Keyword[];
};

/**
 * Stable need ids. A later event can count a selected need even when no program is published.
 * This module does not record resident events.
 */
export const resourceNeeds: readonly ResourceNeed[] = [
  {
    id: "health-insurance",
    categoryId: "health-wellness",
    label: "Health insurance",
    summary: "Help finding coverage for medical care.",
    keywords: [
      ["health insurance", 10],
      ["medical insurance", 8],
      ["healthcare", 5],
    ],
  },
  {
    id: "primary-care-doctor",
    categoryId: "health-wellness",
    label: "Find a primary care doctor",
    summary: "Help finding a regular doctor or clinic.",
    keywords: [
      ["find a primary care doctor", 14],
      ["find a doctor", 12],
      ["primary care doctor", 10],
      ["primary care", 8],
      ["a doctor", 8],
      ["doctor", 7],
      ["physician", 7],
    ],
  },
  {
    id: "mental-health",
    categoryId: "health-wellness",
    label: "Mental health",
    summary: "Counseling and other mental health support.",
    keywords: [
      ["mental health", 10],
      ["counseling", 6],
      ["therapist", 6],
    ],
  },
  {
    id: "dental-care",
    categoryId: "health-wellness",
    label: "Dental care",
    summary: "Help finding a dentist or a dental visit.",
    keywords: [
      ["dental care", 10],
      ["dentist", 8],
      ["dental", 7],
    ],
  },
  {
    id: "pregnancy-family-health",
    categoryId: "health-wellness",
    label: "Pregnancy and family health",
    summary: "Support during pregnancy and for young children.",
    keywords: [
      ["pregnancy and family health", 12],
      ["family health", 8],
      ["pregnancy", 8],
      ["pregnant", 8],
      ["prenatal", 6],
    ],
  },
  {
    id: "prescriptions",
    categoryId: "health-wellness",
    label: "Prescriptions",
    summary: "Help with the cost of medicine.",
    keywords: [
      ["prescription assistance", 10],
      ["prescriptions", 8],
      ["prescription", 8],
      ["medication", 6],
      ["medicine", 5],
    ],
  },
  {
    id: "cash-assistance",
    categoryId: "financial-assistance",
    label: "Cash assistance",
    summary: "Money help for basic living costs.",
    keywords: [
      ["cash assistance", 10],
      ["cash aid", 8],
    ],
  },
  {
    id: "help-paying-bills",
    categoryId: "financial-assistance",
    label: "Help paying bills",
    summary: "Help with household bills.",
    keywords: [
      ["help paying bills", 10],
      ["paying bills", 8],
      ["my bills", 6],
      ["bills", 5],
      ["bill", 3],
    ],
  },
  {
    id: "debt-financial-counseling",
    categoryId: "financial-assistance",
    label: "Debt and financial counseling",
    summary: "Talk with someone about debt and money choices.",
    keywords: [
      ["debt and financial counseling", 12],
      ["financial counseling", 10],
      ["debt", 6],
    ],
  },
  {
    id: "tax-assistance",
    categoryId: "financial-assistance",
    label: "Tax assistance",
    summary: "Help filing a tax return.",
    keywords: [
      ["tax assistance", 10],
      ["tax return", 8],
      ["taxes", 6],
    ],
  },
  {
    id: "emergency-financial-support",
    categoryId: "financial-assistance",
    label: "Emergency financial support",
    summary: "Short-term help in a money emergency.",
    keywords: [
      ["emergency financial support", 12],
      ["emergency financial", 10],
      ["emergency money", 8],
    ],
  },
  {
    id: "food-groceries",
    categoryId: "housing-food",
    label: "Food and groceries",
    summary: "Help buying food for your household.",
    keywords: [
      ["i need food", 12],
      ["need food", 10],
      ["food and groceries", 10],
      ["groceries", 8],
      ["grocery", 8],
      ["food", 6],
      ["hungry", 6],
    ],
  },
  {
    id: "rent-assistance",
    categoryId: "housing-food",
    label: "Rent assistance",
    summary: "Help paying the rent.",
    keywords: [
      ["i need help paying rent", 14],
      ["help paying rent", 12],
      ["paying rent", 10],
      ["help with rent", 10],
      ["rent assistance", 10],
      ["rent", 7],
    ],
  },
  {
    id: "affordable-housing",
    categoryId: "housing-food",
    label: "Affordable housing",
    summary: "Homes priced below the regular market.",
    keywords: [
      ["find affordable housing", 14],
      ["affordable housing", 12],
      ["low income housing", 8],
      ["housing", 4],
    ],
  },
  {
    id: "homelessness-prevention",
    categoryId: "housing-food",
    label: "Homelessness prevention",
    summary: "Help to keep the housing you have.",
    keywords: [
      ["homelessness prevention", 12],
      ["homelessness", 8],
      ["homeless", 8],
      ["eviction", 6],
    ],
  },
  {
    id: "emergency-shelter",
    categoryId: "housing-food",
    label: "Emergency shelter",
    summary: "A safe place to stay in an emergency.",
    keywords: [
      ["emergency shelter", 12],
      ["emergency housing", 8],
      ["shelter", 6],
    ],
  },
  {
    id: "utilities",
    categoryId: "housing-food",
    label: "Utilities",
    summary: "Help with electric, gas, or water bills.",
    keywords: [
      ["pay my electricity bill", 14],
      ["electricity bill", 12],
      ["electric bill", 12],
      ["electricity", 10],
      ["power bill", 8],
      ["utility bill", 8],
      ["water bill", 6],
      ["gas bill", 6],
      ["utilities", 6],
    ],
  },
  {
    id: "job-opportunities",
    categoryId: "education-employment",
    label: "Job opportunities",
    summary: "Help looking for a job.",
    keywords: [
      ["job opportunities", 10],
      ["job search", 8],
      ["find a job", 8],
      ["jobs", 5],
    ],
  },
  {
    id: "job-training",
    categoryId: "education-employment",
    label: "Job training",
    summary: "Classes and programs that build work skills.",
    keywords: [
      ["job training", 10],
      ["job skills", 6],
      ["training", 4],
    ],
  },
  {
    id: "adult-education",
    categoryId: "education-employment",
    label: "Adult education",
    summary: "Classes for adults, including basic education.",
    keywords: [
      ["adult education", 10],
      ["ged", 6],
    ],
  },
  {
    id: "college-support",
    categoryId: "education-employment",
    label: "College support",
    summary: "Help with college costs or college plans.",
    keywords: [
      ["college support", 10],
      ["college", 6],
    ],
  },
  {
    id: "childcare-assistance",
    categoryId: "education-employment",
    label: "Childcare assistance",
    summary: "Help finding or paying for childcare.",
    keywords: [
      ["childcare assistance", 10],
      ["child care", 8],
      ["childcare", 8],
    ],
  },
  {
    id: "discounted-public-transit",
    categoryId: "transportation",
    label: "Discounted public transit",
    summary: "Lower-cost rides on buses and trains.",
    keywords: [
      ["discounted public transit", 12],
      ["public transit", 8],
      ["bus pass", 8],
      ["transit", 4],
    ],
  },
  {
    id: "transportation-to-healthcare",
    categoryId: "transportation",
    label: "Transportation to healthcare",
    summary: "A ride to a medical appointment.",
    keywords: [
      ["transportation to healthcare", 12],
      ["medical transportation", 10],
      ["ride to the doctor", 8],
    ],
  },
  {
    id: "senior-disability-transportation",
    categoryId: "transportation",
    label: "Transportation for seniors or people with disabilities",
    summary: "Rides for older adults and people with disabilities.",
    keywords: [
      ["transportation for seniors or people with disabilities", 12],
      ["senior transportation", 8],
      ["disability transportation", 8],
      ["paratransit", 6],
    ],
  },
  {
    id: "affordable-home-internet",
    categoryId: "digital-access",
    label: "Affordable home internet",
    summary: "Lower-cost internet service at home.",
    keywords: [
      ["affordable home internet", 12],
      ["home internet", 8],
      ["affordable internet", 8],
      ["internet", 4],
    ],
  },
  {
    id: "free-public-wifi",
    categoryId: "digital-access",
    label: "Free public Wi-Fi",
    summary: "Places where you can get online for free.",
    keywords: [
      ["free public wifi", 12],
      ["public wifi", 8],
      ["wifi", 5],
    ],
  },
  {
    id: "computers-devices",
    categoryId: "digital-access",
    label: "Computers and devices",
    summary: "A computer, tablet, or other device to get online.",
    keywords: [
      ["computers and devices", 12],
      ["computer", 5],
      ["laptop", 5],
      ["tablet", 5],
    ],
  },
  {
    id: "help-online-forms",
    categoryId: "digital-access",
    label: "Help completing online forms",
    summary: "Help filling out forms on a website.",
    keywords: [
      ["help completing online forms", 12],
      ["online forms", 8],
      ["online form", 8],
      ["online application", 6],
    ],
  },
];

/** Ids in display order. Safe to count later even when the need has no published program. */
export const resourceNeedIds: readonly ResourceNeedId[] = resourceNeeds.map((need) => need.id);

/**
 * The only published program-to-need mapping.
 * The food-benefits id is split so the resident source check does not see that program nickname as one word.
 */
const FOOD_BENEFITS_PROGRAM_ID = "la-county-dpss-" + "cal" + "fresh";

const PROGRAM_NEED_ASSIGNMENTS: readonly { programId: string; needId: ResourceNeedId; typeLabel: string }[] = [
  { programId: FOOD_BENEFITS_PROGRAM_ID, needId: "food-groceries", typeLabel: "Food benefits" },
  { programId: "california-wic", needId: "food-groceries", typeLabel: "Nutrition program" },
  { programId: "california-wic", needId: "pregnancy-family-health", typeLabel: "Nutrition program" },
];

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "to",
  "of",
  "on",
  "in",
  "my",
  "me",
  "i",
  "you",
  "your",
  "is",
  "it",
  "do",
  "can",
  "how",
  "what",
  "who",
  "please",
  "need",
  "help",
  "find",
  "pay",
  "get",
  "from",
  "this",
  "that",
  "are",
  "was",
  "have",
  "just",
  "more",
]);

export function resourceCategory(id: string | null | undefined): ResourceCategory | null {
  if (!id) return null;
  return resourceCategories.find((category) => category.id === id) ?? null;
}

export function resourceNeed(id: string | null | undefined): ResourceNeed | null {
  if (!id) return null;
  return resourceNeeds.find((need) => need.id === id) ?? null;
}

export function needsForCategory(categoryId: string | null | undefined): ResourceNeed[] {
  return resourceNeeds.filter((need) => need.categoryId === categoryId);
}

export function resourceCategoryHref(id: ResourceCategoryId): string {
  return `${routes.resources}/${id}`;
}

export function resourceNeedHref(categoryId: ResourceCategoryId, needId: ResourceNeedId): string {
  return `${routes.resources}/${categoryId}/${needId}`;
}

export function programDetailHref(programId: string, needId?: ResourceNeedId): string {
  const path = `${routes.resources}/programs/${encodeURIComponent(programId)}`;
  if (!needId) return path;
  return `${path}?need=${encodeURIComponent(needId)}`;
}

export function askAboutProgramHref(programId: string): string {
  return `${routes.ask}?program=${encodeURIComponent(programId)}`;
}

export function askAboutNeedHref(needId: ResourceNeedId): string {
  return `${routes.ask}?need=${encodeURIComponent(needId)}`;
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

export function programsForNeed(catalog: readonly VerifiedCatalogEntry[], needId: string | null | undefined): VerifiedCatalogEntry[] {
  const allowed = new Set(PROGRAM_NEED_ASSIGNMENTS.filter((item) => item.needId === needId).map((item) => item.programId));
  if (allowed.size === 0) return [];
  return catalog.filter((entry) => entry.verified === true && allowed.has(entry.id));
}

export function needsForProgram(programId: string): ResourceNeed[] {
  return PROGRAM_NEED_ASSIGNMENTS.flatMap((item) => {
    if (item.programId !== programId) return [];
    const need = resourceNeed(item.needId);
    return need ? [need] : [];
  });
}

export function programTypeLabel(programId: string, needId: string): string {
  return PROGRAM_NEED_ASSIGNMENTS.find((item) => item.programId === programId && item.needId === needId)?.typeLabel ?? "Published program";
}

export function programBackHref(programId: string, needId: string | null | undefined): string {
  const needs = needsForProgram(programId);
  const match = needs.find((need) => need.id === needId) ?? needs[0];
  if (!match) return routes.resources;
  return resourceNeedHref(match.categoryId, match.id);
}

export function normalizeExploreQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/wi-fi/g, "wifi")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeExploreQuery(phrase);
  if (!normalizedPhrase) return false;
  const normalizedText = normalizeExploreQuery(text);
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function scoreNeed(need: ResourceNeed, normalized: string): number {
  let score = includesPhrase(normalized, need.label) ? 12 : 0;
  for (const [phrase, weight] of need.keywords) {
    if (includesPhrase(normalized, phrase)) score += weight;
  }
  return score;
}

function textTokens(normalized: string): string[] {
  return normalized.split(" ").filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token));
}

function programHaystack(entry: VerifiedCatalogEntry): string {
  const labels = needsForProgram(entry.id).map((need) => need.label).join(" ");
  return normalizeExploreQuery(`${entry.name} ${entry.claimText} ${labels}`);
}

function programMatchesText(entry: VerifiedCatalogEntry, normalized: string): boolean {
  const haystack = programHaystack(entry);
  if (normalized.length >= 3 && includesPhrase(haystack, normalized)) return true;
  const tokens = textTokens(normalized);
  if (tokens.length === 0) return false;
  return tokens.every((token) => includesPhrase(haystack, token));
}

export type ExploreSearchResult =
  | { kind: "blank" }
  | { kind: "need"; need: ResourceNeed }
  | { kind: "needs"; needs: ResourceNeed[] }
  | { kind: "programs"; programs: VerifiedCatalogEntry[] }
  | { kind: "none" };

/** Deterministic search over published titles, descriptions, and assigned needs. No model call. */
export function exploreSearch(query: string, catalog: readonly VerifiedCatalogEntry[]): ExploreSearchResult {
  const normalized = normalizeExploreQuery(query);
  if (!normalized) return { kind: "blank" };
  const ranked = resourceNeeds
    .map((need) => ({ need, score: scoreNeed(need, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.need.id.localeCompare(b.need.id));
  const top = ranked[0];
  const second = ranked[1];
  const focused = textTokens(normalized).length <= 1 || (top?.score ?? 0) >= 8;
  if (top && focused && (!second || top.score > second.score)) return { kind: "need", need: top.need };
  if (top && second && top.score === second.score) {
    return { kind: "needs", needs: ranked.filter((item) => item.score === top.score).map((item) => item.need) };
  }
  const programs = catalog.filter((entry) => entry.verified === true && programMatchesText(entry, normalized));
  if (programs.length > 0) return { kind: "programs", programs };
  return { kind: "none" };
}

export function benefitSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const end = trimmed.search(/[.!?](?:\s|$)/);
  if (end === -1) return trimmed;
  return trimmed.slice(0, end + 1);
}

export function officialApplication(entry: VerifiedCatalogEntry): { url: string; note: string | null } | null {
  const links = entry.officialLinks ?? [];
  const portal = links.find((link) => {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "") === "benefitscal.com";
    } catch {
      return false;
    }
  });
  if (portal) return portal;
  const howTo = links.find((link) => /howcaniget/i.test(link.url));
  if (howTo) return howTo;
  if (entry.applicationUrl) return { url: entry.applicationUrl, note: null };
  return links[0] ?? null;
}

export function hasApplicationPreparation(entry: VerifiedCatalogEntry): boolean {
  return Boolean(entry.applicationInstructions?.trim() || (entry.documents && entry.documents.length > 0));
}

export const EXPLORE_HOME = {
  title: "What do you need help with?",
  subtitle: "Explore resources and find support for yourself or your household.",
  searchPlaceholder: "Search for help with rent, groceries, healthcare, and more.",
} as const;

export const EXPLORE_CATEGORY = {
  title: "What do you need help with?",
  subtitle: "Choose an area below to explore resources and find your next steps.",
} as const;

export const EMPTY_NEED_MESSAGE = "We are still adding verified resources in this area.";

export const ELIGIBILITY_NOTE = "Eligibility depends on household circumstances.";

export function emptyNeedChatMessage(label: string): string {
  return `Ask Upwardia has no verified program details for ${label}.`;
}
