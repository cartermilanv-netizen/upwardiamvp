import { describe, expect, it } from "vitest";
import { allowsSkip } from "@/lib/screens";
import { commitPending, commitSkip, createDraft, resumeScreen } from "@/lib/flow";
import { residentCatalog } from "@/lib/catalog";
import type { VerifiedCatalogEntry } from "@/lib/types";
import {
  assessmentPresence,
  desktopNav,
  hero,
  memberNav,
  mobileMenuLinks,
  mobileNav,
  prominentCta,
  routes,
} from "@/lib/site";
import {
  ELIGIBILITY_NOTE,
  EMPTY_NEED_MESSAGE,
  benefitSentence,
  exploreSearch,
  hasApplicationPreparation,
  officialApplication,
  programsForNeed,
  resourceCategories,
  resourceCategoryHref,
  resourceNeedHref,
  resourceNeedIds,
  resourceNeeds,
  resourcesForCategory,
} from "@/lib/resources";

function readyDraft() {
  const started = commitPending(createDraft("local_device"), "intro", { kind: "storage", value: "local_device" }).draft;
  const consented = commitPending(started, "consent", { kind: "consent", value: "declined" }).draft;
  if (!consented) throw new Error("consent");
  let draft = consented;
  for (let guard = 0; guard < 30 && resumeScreen(draft) !== "review"; guard += 1) {
    const screen = resumeScreen(draft);
    if (!allowsSkip(screen)) break;
    draft = commitSkip(draft, screen);
  }
  return draft;
}

const housing: VerifiedCatalogEntry = {
  id: "housing-1",
  name: "Example housing listing",
  verified: true,
  sourceName: "Example source",
  sourceUrl: "https://example.com/housing",
  lastVerified: "2026-01-01",
  serviceAreaZips: "unknown",
  categories: ["housing"],
  channels: ["phone"],
  phone: null,
  eligibility: {
    incomeCeiling: null,
    requiresZipInServiceArea: false,
    requiresChildren: null,
    statedRequirements: [],
  },
  claimText: "A checked listing for housing help.",
};

describe("public site navigation", () => {
  it("keeps the assessment on its own route and points the homepage there", () => {
    expect(routes.home).toBe("/");
    expect(routes.assessment).toBe("/assessment");
    expect(routes.journey).toBe("/journey");
    expect(routes.goals).toBe("/goals");
    expect(routes.actions).toBe("/actions");
    expect(routes.rewards).toBe("/rewards");
    expect(routes.notifications).toBe("/notifications");
    expect(hero.primaryHref).toBe(routes.assessment);
    expect(hero.primaryLabel).toBe("Find My Resources");
    expect(hero.secondaryHref).toBe("/resources");
    expect(memberNav.map((item) => item.label)).toEqual([
      "My Journey",
      "My Goals",
      "My Actions",
      "My Applications",
      "My Rewards",
      "Notifications",
      "My Profile",
    ]);
    expect(memberNav.map((item) => item.href)).toEqual(["/journey", "/goals", "/actions", "/applications", "/rewards", "/notifications", "/profile"]);
    expect(desktopNav.map((item) => item.href)).toEqual([
      "/journey",
      "/goals",
      "/actions",
      "/applications",
      "/rewards",
      "/notifications",
      "/profile",
      "/resources",
      "/ask",
      "/assessment",
      "/plan",
      "/#about",
    ]);
    expect(mobileNav.map((item) => item.label)).toEqual(memberNav.map((item) => item.label));
    expect(mobileMenuLinks().map((item) => item.href)).toEqual(["/", "/resources", "/ask", "/assessment", "/plan", "/#about"]);
    const residentHrefs = [...desktopNav, ...mobileNav, ...mobileMenuLinks()].map((item) => item.href);
    expect(residentHrefs.some((href) => href.startsWith("/impact"))).toBe(false);
  });

  it("offers Get Started until an assessment is saved, then Continue", () => {
    expect(prominentCta("none")).toEqual({ href: "/assessment", label: "Get Started" });
    expect(assessmentPresence(null)).toBe("none");
    expect(assessmentPresence(createDraft("local_device"))).toBe("in_progress");
    expect(prominentCta("in_progress")?.label).toBe("Continue My Assessment");
    const done = readyDraft();
    expect(resumeScreen(done)).toBe("review");
    expect(assessmentPresence(done)).toBe("ready");
    expect(prominentCta("ready")).toBeNull();
  });
});

describe("resource categories", () => {
  it("lists the six browse categories and selects one without inventing rows", () => {
    expect(resourceCategories).toHaveLength(6);
    expect(resourceCategoryHref("housing-food")).toBe("/resources/housing-food");
    expect(resourceNeedHref("housing-food", "food-groceries")).toBe("/resources/housing-food/food-groceries");
    expect(resourcesForCategory(residentCatalog, "housing-food").map((entry) => entry.id)).toEqual([
      "la-county-dpss-calfresh",
      "california-wic",
    ]);
    expect(resourcesForCategory(residentCatalog, "health-wellness")).toEqual([]);
    expect(resourcesForCategory([housing], "housing-food").map((entry) => entry.id)).toEqual(["housing-1"]);
    expect(resourcesForCategory([housing], "transportation")).toEqual([]);
    expect(resourcesForCategory([housing], "not-a-category")).toEqual([]);
    const unverified = { ...housing, id: "draft-row", verified: false as unknown as true };
    expect(resourcesForCategory([unverified], "housing-food")).toEqual([]);
  });

  it("keeps a stable id for every need and publishes programs only on the mapped needs", () => {
    expect(new Set(resourceNeedIds).size).toBe(resourceNeeds.length);
    expect(resourceNeeds.map((need) => need.label)).toEqual([
      "Health insurance",
      "Find a primary care doctor",
      "Mental health",
      "Dental care",
      "Pregnancy and family health",
      "Prescriptions",
      "Cash assistance",
      "Help paying bills",
      "Debt and financial counseling",
      "Tax assistance",
      "Emergency financial support",
      "Food and groceries",
      "Rent assistance",
      "Affordable housing",
      "Homelessness prevention",
      "Emergency shelter",
      "Utilities",
      "Job opportunities",
      "Job training",
      "Adult education",
      "College support",
      "Childcare assistance",
      "Discounted public transit",
      "Transportation to healthcare",
      "Transportation for seniors or people with disabilities",
      "Affordable home internet",
      "Free public Wi-Fi",
      "Computers and devices",
      "Help completing online forms",
    ]);
    expect(programsForNeed(residentCatalog, "food-groceries").map((entry) => entry.id)).toEqual([
      "la-county-dpss-calfresh",
      "california-wic",
    ]);
    expect(programsForNeed(residentCatalog, "pregnancy-family-health").map((entry) => entry.id)).toEqual(["california-wic"]);
    for (const need of resourceNeeds) {
      if (need.id === "food-groceries" || need.id === "pregnancy-family-health") continue;
      expect(programsForNeed(residentCatalog, need.id)).toEqual([]);
    }
    expect(programsForNeed([housing], "affordable-housing")).toEqual([]);
    expect(programsForNeed([unverifiedHousing()], "food-groceries")).toEqual([]);
  });

  it("routes everyday searches to a need, including empty needs", () => {
    expect(needIdFor("I need food")).toBe("food-groceries");
    expect(programsForNeed(residentCatalog, "food-groceries").map((entry) => entry.name)).toEqual(["CalFresh", "California WIC"]);
    expect(needIdFor("Help with rent")).toBe("rent-assistance");
    expect(needIdFor("I need help paying rent")).toBe("rent-assistance");
    expect(needIdFor("Find a doctor")).toBe("primary-care-doctor");
    expect(needIdFor("Pay my electricity bill")).toBe("utilities");
    expect(needIdFor("Find affordable housing")).toBe("affordable-housing");
    for (const phrase of ["Help with rent", "I need help paying rent", "Find a doctor", "Pay my electricity bill", "Find affordable housing"]) {
      const id = needIdFor(phrase);
      expect(programsForNeed(residentCatalog, id)).toEqual([]);
    }
    expect(EMPTY_NEED_MESSAGE).toBe("We are still adding verified resources in this area.");
    expect(ELIGIBILITY_NOTE).toBe("Eligibility depends on household circumstances.");
    const named = exploreSearch("CalFresh", residentCatalog);
    expect(named.kind).toBe("programs");
    if (named.kind === "programs") expect(named.programs.map((entry) => entry.id)).toEqual(["la-county-dpss-calfresh"]);
    expect(exploreSearch("Santa Monica Below Market Housing", residentCatalog).kind).toBe("none");
    expect(exploreSearch("Medi-Cal", residentCatalog).kind).toBe("none");
  });

  it("uses the printed application address and keeps preparation on published guidance", () => {
    const food = programsForNeed(residentCatalog, "food-groceries");
    const benefits = food.find((entry) => entry.id === "la-county-dpss-calfresh");
    const wic = food.find((entry) => entry.id === "california-wic");
    if (!benefits || !wic) throw new Error("published food listings");
    expect(officialApplication(benefits)).toMatchObject({
      url: "https://benefitscal.com",
      note: "This address is printed on the official page. That site itself was not read.",
    });
    expect(officialApplication(wic)?.url).toBe("https://myfamily.wic.ca.gov/Home/HowCanIGetWIC");
    expect(benefitSentence(benefits.claimText)).toBe(
      "CalFresh, formerly known as Food Stamps, helps low-income households increase their food-buying power to meet their household's nutritional needs.",
    );
    expect(benefitSentence(wic.claimText)).toBe("California WIC is a food and nutrition program for growing families.");
    expect(hasApplicationPreparation(benefits)).toBe(true);
    expect(hasApplicationPreparation(wic)).toBe(true);
    expect(hasApplicationPreparation({ ...housing, applicationInstructions: null, documents: [] })).toBe(false);
  });
});

function needIdFor(query: string): string {
  const result = exploreSearch(query, residentCatalog);
  if (result.kind !== "need") throw new Error(`${query} -> ${result.kind}`);
  return result.need.id;
}

function unverifiedHousing() {
  return { ...housing, id: "la-county-dpss-calfresh", verified: false as unknown as true };
}
