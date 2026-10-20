import { describe, expect, it } from "vitest";
import { allowsSkip } from "@/lib/screens";
import { commitPending, commitSkip, createDraft, resumeScreen } from "@/lib/flow";
import { residentCatalog } from "@/lib/catalog";
import type { VerifiedCatalogEntry } from "@/lib/types";
import {
  assessmentPresence,
  desktopNav,
  hero,
  mobileMenuLinks,
  mobileNav,
  prominentCta,
  routes,
} from "@/lib/site";
import { resourceCategories, resourceCategoryHref, resourcesForCategory } from "@/lib/resources";

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
    expect(hero.primaryHref).toBe(routes.assessment);
    expect(hero.primaryLabel).toBe("Find My Resources");
    expect(hero.secondaryHref).toBe("/resources");
    expect(desktopNav.map((item) => item.href)).toEqual([
      "/",
      "/resources",
      "/applications",
      "/assessment",
      "/plan",
      "/profile",
      "/ask",
      "/#about",
    ]);
    expect(mobileNav.map((item) => item.label)).toEqual(["Home", "Resources", "Assessment", "My Plan"]);
    expect(mobileMenuLinks().map((item) => item.href)).toEqual(["/applications", "/profile", "/ask", "/#about"]);
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
    expect(resourceCategoryHref("housing-food")).toBe("/resources?category=housing-food");
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
});
