import type { CategoryId, HpObjectiveId, ImpactRole } from "@/lib/impact/types";

export type DemoLogin = {
  email: string;
  password: string;
  displayName: string;
  role: ImpactRole;
  organizationId: string | null;
  jurisdictionId: string | null;
};

/** Demonstration sign-ins. These are not production secrets. */
export const DEMO_LOGINS: readonly DemoLogin[] = [
  {
    email: "super@impact.demo",
    password: "demo-super-admin",
    displayName: "Upwardia Super Admin",
    role: "super_admin",
    organizationId: null,
    jurisdictionId: null,
  },
  {
    email: "harbor.partner@impact.demo",
    password: "demo-government",
    displayName: "Harbor Jurisdiction Partner",
    role: "government_admin",
    organizationId: null,
    jurisdictionId: "jur_harbor",
  },
  {
    email: "harborlight@impact.demo",
    password: "demo-organization",
    displayName: "Harborlight Organization Admin",
    role: "organization_admin",
    organizationId: "org_harborlight",
    jurisdictionId: "jur_harbor",
  },
];

export const JURISDICTIONS = [
  { id: "jur_harbor", name: "Harbor Jurisdiction" },
  { id: "jur_cedar", name: "Cedar Jurisdiction" },
] as const;

export const ORGANIZATIONS = [
  { id: "org_harborlight", name: "Harborlight Family Center", jurisdictionId: "jur_harbor" },
  { id: "org_pier", name: "Pierpoint Care Partners", jurisdictionId: "jur_harbor" },
  { id: "org_cedar", name: "Cedar Works Collaborative", jurisdictionId: "jur_cedar" },
] as const;

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "health", label: "Health" },
  { id: "housing", label: "Housing" },
  { id: "education", label: "Education and training" },
  { id: "transportation", label: "Transportation" },
  { id: "utilities", label: "Utilities" },
];

export const PROGRAMS = [
  { id: "prog_market", name: "Harbor Market Match", category: "food" as const },
  { id: "prog_clinic", name: "Care Connection Desk", category: "health" as const },
  { id: "prog_housing", name: "Stable Home Navigation", category: "housing" as const },
  { id: "prog_training", name: "Skills Studio", category: "education" as const },
  { id: "prog_ride", name: "Ride to Appointment", category: "transportation" as const },
  { id: "prog_utility", name: "Utility Bill Clinic", category: "utilities" as const },
];

export const RESOURCES = [
  { id: "res_market", name: "Harbor Market Match listing", programId: "prog_market", category: "food" as const },
  { id: "res_clinic", name: "Care Connection Desk listing", programId: "prog_clinic", category: "health" as const },
  { id: "res_housing", name: "Stable Home Navigation listing", programId: "prog_housing", category: "housing" as const },
  { id: "res_training", name: "Skills Studio listing", programId: "prog_training", category: "education" as const },
  { id: "res_ride", name: "Ride to Appointment listing", programId: "prog_ride", category: "transportation" as const },
  { id: "res_utility", name: "Utility Bill Clinic listing", programId: "prog_utility", category: "utilities" as const },
];

export const BARRIER_LABELS: Record<string, string> = {
  transportation: "Transportation",
  cost: "Cost",
  hours: "Hours and scheduling",
  childcare: "Child care",
  no_device: "Device or internet access",
  language: "Language access",
};

export const PLACEMENTS = [
  { organizationId: "org_harborlight", jurisdictionId: "jur_harbor", city: "North Harbor", count: 40 },
  { organizationId: "org_harborlight", jurisdictionId: "jur_harbor", city: "Pierpoint", count: 36 },
  { organizationId: "org_pier", jurisdictionId: "jur_harbor", city: "Pierpoint", count: 32 },
  { organizationId: "org_cedar", jurisdictionId: "jur_cedar", city: "Cedar Flats", count: 36 },
  { organizationId: "org_cedar", jurisdictionId: "jur_cedar", city: "Millbridge", count: 28 },
] as const;

export const PRIMARY_CATEGORIES = ["food", "health", "housing", "education"] as const satisfies readonly CategoryId[];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export function programName(id: string): string {
  return PROGRAMS.find((item) => item.id === id)?.name ?? id;
}

export function jurisdictionName(id: string): string {
  return JURISDICTIONS.find((item) => item.id === id)?.name ?? id;
}

export function organizationName(id: string): string {
  return ORGANIZATIONS.find((item) => item.id === id)?.name ?? id;
}

export function objectivesForCategory(category: CategoryId | null): HpObjectiveId[] {
  if (category === "food") return ["NWS-01"];
  if (category === "health") return ["AHS-07", "AHS-04"];
  if (category === "housing" || category === "education") return ["SDOH-01"];
  return [];
}

export function resourceFor(category: CategoryId) {
  const resource = RESOURCES.find((item) => item.category === category);
  if (!resource) throw new Error(`Missing demonstration resource for ${category}`);
  return resource;
}
