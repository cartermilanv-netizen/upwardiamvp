import { resourceNeeds, type ResourceNeedId } from "@/lib/resources";
import type { CategoryId, HpObjectiveId } from "@/lib/impact/types";

/**
 * Explore Resources need ids, mapped onto the coarser Impact categories.
 * Financial and digital needs stay on their own ids. They are not forced into a Healthy People objective.
 */
export const IMPACT_CATEGORY_BY_NEED: Record<ResourceNeedId, CategoryId | null> = {
  "health-insurance": "health",
  "primary-care-doctor": "health",
  "mental-health": "health",
  "dental-care": "health",
  "pregnancy-family-health": "health",
  "prescriptions": "health",
  "cash-assistance": null,
  "help-paying-bills": null,
  "debt-financial-counseling": null,
  "tax-assistance": null,
  "emergency-financial-support": null,
  "food-groceries": "food",
  "rent-assistance": "housing",
  "affordable-housing": "housing",
  "homelessness-prevention": "housing",
  "emergency-shelter": "housing",
  utilities: "utilities",
  "job-opportunities": "education",
  "job-training": "education",
  "adult-education": "education",
  "college-support": "education",
  "childcare-assistance": "education",
  "discounted-public-transit": "transportation",
  "transportation-to-healthcare": "transportation",
  "senior-disability-transportation": "transportation",
  "affordable-home-internet": null,
  "free-public-wifi": null,
  "computers-devices": null,
  "help-online-forms": null,
};

/** Goals and outcomes only. A view or a click never uses this map as a numerator. */
export const OBJECTIVES_BY_NEED: Record<ResourceNeedId, readonly HpObjectiveId[]> = {
  "health-insurance": ["AHS-04"],
  "primary-care-doctor": ["AHS-07"],
  "mental-health": ["AHS-04"],
  "dental-care": ["AHS-04"],
  "pregnancy-family-health": ["AHS-04"],
  "prescriptions": ["AHS-04"],
  "cash-assistance": [],
  "help-paying-bills": [],
  "debt-financial-counseling": [],
  "tax-assistance": [],
  "emergency-financial-support": [],
  "food-groceries": ["NWS-01"],
  "rent-assistance": ["SDOH-01"],
  "affordable-housing": ["SDOH-01"],
  "homelessness-prevention": ["SDOH-01"],
  "emergency-shelter": ["SDOH-01"],
  utilities: [],
  "job-opportunities": ["SDOH-01"],
  "job-training": ["SDOH-01"],
  "adult-education": ["SDOH-01"],
  "college-support": ["SDOH-01"],
  "childcare-assistance": [],
  "discounted-public-transit": [],
  "transportation-to-healthcare": [],
  "senior-disability-transportation": [],
  "affordable-home-internet": [],
  "free-public-wifi": [],
  "computers-devices": [],
  "help-online-forms": [],
};

const NEED_FOR_CATEGORY: Record<CategoryId, ResourceNeedId> = {
  food: "food-groceries",
  health: "primary-care-doctor",
  housing: "affordable-housing",
  education: "job-training",
  transportation: "transportation-to-healthcare",
  utilities: "utilities",
};

export function isResourceNeedId(value: string): value is ResourceNeedId {
  return Object.prototype.hasOwnProperty.call(IMPACT_CATEGORY_BY_NEED, value);
}

export function needLabel(id: string): string {
  return resourceNeeds.find((need) => need.id === id)?.label ?? id;
}

export function categoryForNeed(id: ResourceNeedId): CategoryId | null {
  return IMPACT_CATEGORY_BY_NEED[id];
}

export function objectivesForNeed(id: ResourceNeedId): readonly HpObjectiveId[] {
  return OBJECTIVES_BY_NEED[id];
}

export function needForImpactCategory(category: CategoryId): ResourceNeedId {
  return NEED_FOR_CATEGORY[category];
}

export function needRows(): { id: ResourceNeedId; label: string }[] {
  return resourceNeeds.map((need) => ({ id: need.id, label: need.label }));
}
