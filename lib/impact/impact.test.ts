import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newSessionToken } from "@/lib/impact/auth";
import { DEMO_LOGINS } from "@/lib/impact/catalog";
import { reportToCsv } from "@/lib/impact/csv";
import {
  authenticateUser,
  closeDb,
  createSession,
  deleteResidentAnalytics,
  deleteSession,
  openDatabase,
  principalForToken,
  purgeExpired,
  tableColumns,
  withdrawConsent,
} from "@/lib/impact/db";
import { HP2030 } from "@/lib/impact/hp2030";
import { idempotencyKey } from "@/lib/impact/idempotency";
import { tally } from "@/lib/impact/metrics";
import { protectPartition, shouldSuppressCohort } from "@/lib/impact/protect";
import { buildImpactReport, reportWithoutPrincipal } from "@/lib/impact/report";
import { buildDemoDataset } from "@/lib/impact/seed";
import { EVENT_TYPES, OUTCOME_TYPES, type EventFact, type Principal, type ResidentFact } from "@/lib/impact/types";
import { assertVerification } from "@/lib/impact/verify";
import type { DatabaseSync } from "node:sqlite";
import { desktopNav, footerLinks, mobileMenuLinks, mobileNav } from "@/lib/site";

const asOf = "2026-10-20T23:59:59.000Z";

function resident(id: string, city = "North Harbor"): ResidentFact {
  return {
    id,
    organizationId: "org_harborlight",
    jurisdictionId: "jur_harbor",
    city,
    consent: "granted",
    consentedAt: "2026-01-01T00:00:00.000Z",
    withdrawnAt: null,
    deletedAt: null,
  };
}

function event(partial: Partial<EventFact> & Pick<EventFact, "id" | "type" | "residentId">): EventFact {
  const row: EventFact = {
    id: partial.id,
    dedupeKey: "",
    residentId: partial.residentId,
    organizationId: "org_harborlight",
    jurisdictionId: "jur_harbor",
    city: "North Harbor",
    type: partial.type,
    occurredAt: partial.occurredAt ?? asOf,
    source: "demo_fixture",
    resourceId: partial.resourceId ?? null,
    programId: partial.programId ?? null,
    category: partial.category ?? null,
    goalId: partial.goalId ?? null,
    actionId: partial.actionId ?? null,
    applicationId: partial.applicationId ?? null,
    outcomeId: partial.outcomeId ?? null,
    sessionId: partial.sessionId ?? null,
  };
  row.dedupeKey = partial.dedupeKey ?? idempotencyKey(row);
  return row;
}

describe("impact definitions", () => {
  it("lists the event and outcome types used by the model", () => {
    expect([...EVENT_TYPES]).toEqual([
      "assessment_started",
      "assessment_completed",
      "resource_viewed",
      "resource_saved",
      "chat_session_started",
      "action_started",
      "action_completed",
      "application_started",
      "application_draft_saved",
      "application_submitted_confirmed",
      "goal_completed",
      "outcome_reported",
      "outcome_verified",
    ]);
    expect([...OUTCOME_TYPES]).toEqual([
      "accessed_resource",
      "submitted_application",
      "received_benefit",
      "usual_source_of_care",
      "health_insurance",
      "food_access",
      "housing",
      "education_or_workforce",
      "individual_goal",
    ]);
  });

  it("collapses duplicate events and keeps views, applications, and verifications apart", () => {
    const view = idempotencyKey({ type: "resource_viewed", residentId: "demo-r-0001", occurredAt: asOf, resourceId: "res_market" });
    const again = idempotencyKey({ type: "resource_viewed", residentId: "demo-r-0001", occurredAt: asOf, resourceId: "res_market" });
    const application = idempotencyKey({ type: "application_started", residentId: "demo-r-0001", occurredAt: asOf, applicationId: "application-1" });
    const reported = idempotencyKey({ type: "outcome_reported", residentId: "demo-r-0001", occurredAt: asOf, outcomeId: "outcome-1" });
    const verified = idempotencyKey({ type: "outcome_verified", residentId: "demo-r-0001", occurredAt: asOf, outcomeId: "outcome-1" });
    expect(view).toBe(again);
    expect(view).not.toBe(application);
    expect(reported).not.toBe(verified);
    expect(() => assertVerification("verified", null, "Fictional partner notice")).toThrow(/verification method/);
    expect(() => assertVerification("self_reported", null, null)).not.toThrow();
  });

  it("does not count a resource view as an application or a report as verified", () => {
    const rows = tally({
      residents: [resident("demo-r-0001")],
      events: [
        event({ id: "v1", type: "resource_viewed", residentId: "demo-r-0001", resourceId: "res_market", category: "food" }),
        event({ id: "v2", type: "resource_viewed", residentId: "demo-r-0001", resourceId: "res_market", category: "food" }),
        event({ id: "r1", type: "outcome_reported", residentId: "demo-r-0001", outcomeId: "outcome-1" }),
        event({ id: "x1", type: "outcome_verified", residentId: "demo-r-0001", outcomeId: "outcome-1" }),
      ],
      outcomes: [
        {
          id: "outcome-1",
          residentId: "demo-r-0001",
          organizationId: "org_harborlight",
          jurisdictionId: "jur_harbor",
          city: "North Harbor",
          outcomeType: "food_access",
          objectiveId: "NWS-01",
          phase: "follow_up",
          indicator: "positive",
          followUpIntervalDays: 90,
          consent: "granted",
          evidence: "self_reported",
          verificationMethod: null,
          verificationSource: null,
          recordedOn: asOf,
        },
      ],
      barriers: [],
      from: "2026-07-01T00:00:00.000Z",
      to: asOf,
      city: null,
      jurisdictionId: null,
      programId: null,
      category: null,
      cities: ["North Harbor"],
      categories: ["food"],
      barrierIds: [],
    });
    expect(rows.resourcesDiscovered).toBe(1);
    expect(rows.applicationsStarted).toBe(0);
    expect(rows.outcomeReports).toBe(1);
    expect(rows.outcomesVerified).toBe(0);
    expect(rows.participating).toBe(1);
  });

  it("hides a small partition cell and a second cell so the small one cannot be subtracted", () => {
    const rows = protectPartition([
      { id: "a", label: "A", n: 50 },
      { id: "b", label: "B", n: 40 },
      { id: "c", label: "C", n: 4 },
    ]);
    expect(rows.find((row) => row.id === "c")?.count).toEqual({ value: null, suppressed: true });
    expect(rows.filter((row) => row.count.suppressed).length).toBeGreaterThanOrEqual(2);
    const visible = rows.reduce((sum, row) => sum + (row.count.value ?? 0), 0);
    expect(94 - visible).toBeGreaterThanOrEqual(11);
    expect(shouldSuppressCohort(24, 30)).toBe(true);
    expect(shouldSuppressCohort(8)).toBe(true);
    expect(shouldSuppressCohort(0, 40)).toBe(false);
    expect(shouldSuppressCohort(40, 80)).toBe(false);
  });

  it("keeps the official Healthy People 2030 targets with the pages they came from", () => {
    expect(HP2030["AHS-07"].targetPercent).toBe(95.1);
    expect(HP2030["AHS-07"].baseline).toContain("89.9");
    expect(HP2030["AHS-07"].mostRecent).toContain("90.3");
    expect(HP2030["AHS-07"].url).toBe(
      "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/health-care-access-and-quality/increase-proportion-people-usual-source-care-ahs-07",
    );
    expect(HP2030["NWS-01"].targetPercent).toBe(6);
    expect(HP2030["NWS-01"].baseline).toContain("11.1");
    expect(HP2030["NWS-01"].mostRecent).toContain("13.7");
    expect(HP2030["NWS-01"].url).toBe(
      "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/nutrition-and-healthy-eating/reduce-household-food-insecurity-and-hunger-nws-01",
    );
    expect(HP2030["AHS-04"].targetPercent).toBe(5.9);
    expect(HP2030["AHS-04"].baseline).toContain("8.5");
    expect(HP2030["AHS-04"].mostRecent).toContain("8.2");
    expect(HP2030["AHS-04"].url).toBe(
      "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/health-care-access-and-quality/reduce-proportion-people-who-cant-get-medical-care-when-they-need-it-ahs-04",
    );
    expect(HP2030["SDOH-01"].targetPercent).toBe(8);
    expect(HP2030["SDOH-01"].baseline).toContain("11.8");
    expect(HP2030["SDOH-01"].mostRecent).toContain("10.6");
    expect(HP2030["SDOH-01"].url).toBe(
      "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/economic-stability/reduce-proportion-people-living-poverty-sdoh-01",
    );
    for (const objective of Object.values(HP2030)) {
      expect(objective.numerator.length).toBeGreaterThan(10);
      expect(objective.denominator.length).toBeGreaterThan(10);
      expect(objective.population.toLowerCase()).toContain("not the u.s. survey population");
      expect(objective.followUpTime).toBe("90 days");
      expect(objective.separation.toLowerCase()).toContain("not evidence");
    }
  });
});

describe("impact access and stored demonstration", () => {
  let db: DatabaseSync;

  beforeAll(() => {
    const dir = mkdtempSync(path.join(tmpdir(), "upwardia-impact-"));
    db = openDatabase(path.join(dir, "impact.sqlite"));
  });

  afterAll(() => {
    closeDb(db);
  });

  function signIn(email: string): Principal {
    const login = DEMO_LOGINS.find((item) => item.email === email);
    if (!login) throw new Error(email);
    const principal = authenticateUser(db, login.email, login.password);
    if (!principal) throw new Error(`sign-in failed for ${email}`);
    return principal;
  }

  it("keeps the resident navigation free of Impact and refuses analytics without a principal", () => {
    const hrefs = [...desktopNav, ...mobileNav, ...mobileMenuLinks(), ...footerLinks].map((item) => item.href);
    expect(hrefs.some((href) => href.startsWith("/impact"))).toBe(false);
    expect(reportWithoutPrincipal()).toEqual({ status: 401, body: { error: "Authentication required." } });
  });

  it("stores only minimized columns and demonstration events", () => {
    const banned = /transcript|diagnosis|income|ssn|street|dob|answer|paystub|household_size/;
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name));
    for (const table of tables) {
      for (const column of tableColumns(db, table)) expect(column).not.toMatch(banned);
    }
    const foreign = db.prepare("SELECT COUNT(*) AS n FROM events WHERE source != 'demo_fixture'").get();
    expect(Number(foreign?.n ?? 0)).toBe(0);
    const dataset = buildDemoDataset();
    const keys = dataset.events.map((item) => item.dedupeKey);
    expect(keys.length).toBeGreaterThan(new Set(keys).size);
    const stored = db.prepare("SELECT COUNT(*) AS n FROM events WHERE dedupe_key = ?").get("assessment_started:demo-r-0000");
    expect(Number(stored?.n ?? 0)).toBe(1);
  });

  it("limits each role to its organization and jurisdiction on the server", () => {
    const superAdmin = signIn("super@impact.demo");
    const government = signIn("harbor.partner@impact.demo");
    const organization = signIn("harborlight@impact.demo");
    expect(superAdmin.role).toBe("super_admin");
    expect(government.role).toBe("government_admin");
    expect(organization.organizationId).toBe("org_harborlight");
    expect(authenticateUser(db, "super@impact.demo", "wrong-password")).toBeNull();

    const everyone = buildImpactReport(db, superAdmin, {});
    const harbor = buildImpactReport(db, government, { jurisdiction: "jur_cedar", city: "Cedar Flats" });
    const harborlight = buildImpactReport(db, organization, { jurisdiction: "jur_cedar" });
    const cedar = buildImpactReport(db, superAdmin, { jurisdiction: "jur_cedar" });

    expect(everyone.populationHidden).toBe(false);
    expect(everyone.participating.value).toBe(172);
    expect(harbor.applied.jurisdictionId).toBe("jur_harbor");
    expect(harbor.applied.city).toBeNull();
    expect(harbor.participating.value).toBe(108);
    expect(harborlight.participating.value).toBe(76);
    expect(harborlight.organizationLabel).toBe("Harborlight Family Center");
    expect(harbor.organizationLabel).toBeNull();
    expect(cedar.cities.map((city) => city.id)).toEqual(["Cedar Flats", "Millbridge"]);
    expect(harbor.cities.map((city) => city.id)).toEqual(["North Harbor", "Pierpoint"]);
    expect(harborlight.cities.find((city) => city.id === "North Harbor")?.count.value).toBe(40);
    expect(harborlight.cities.find((city) => city.id === "Pierpoint")?.count.value).toBe(36);
    expect(harbor.cities.find((city) => city.id === "Pierpoint")?.count.value).toBe(68);

    const harborJson = JSON.stringify(harbor);
    expect(harborJson).not.toContain("Cedar");
    expect(harborJson).not.toContain("demo-r-");
    expect(harborJson).not.toContain("Pierpoint Care Partners");
    expect(JSON.stringify(harborlight)).not.toContain("Cedar Works");
    expect(everyone.disclaimer).toContain("not actual Upwardia results");
    expect(everyone.outcomesVerified.value).toBeLessThan(everyone.outcomeReports.value ?? 0);
    expect(everyone.funnel.submitted.suppressed).toBe(false);
    expect(everyone.funnel.submitted.value).toBeLessThan(everyone.funnel.draft.value ?? 0);
    expect(everyone.funnel.draft.value).toBeLessThan(everyone.funnel.started.value ?? 0);
    expect(everyone.resourcesDiscovered.value).toBeGreaterThan(0);
    expect(everyone.applicationsStarted.value).not.toBe(everyone.resourcesDiscovered.value);
    const ahs = everyone.health.find((item) => item.objectiveId === "AHS-07");
    expect(ahs?.baseline.suppressed).toBe(false);
    expect(ahs?.followUp.suppressed).toBe(false);
    expect(ahs?.baseline.percent).toBeGreaterThan(0);
    expect(ahs?.baseline.percent).toBeLessThan(100);
    expect(ahs?.followUp.percent).toBeGreaterThan(0);
    expect(ahs?.followUp.percent).toBeLessThan(100);
    expect(ahs?.baseline.denominator).toBe(ahs?.followUp.denominator);
    expect(ahs?.selfReported.value).toBeGreaterThan(0);
    expect(ahs?.verified.value).toBeGreaterThan(0);
    expect(everyone.barriers.find((item) => item.id === "language")?.count.suppressed).toBe(true);
    expect(everyone.barriers.filter((item) => item.count.suppressed).length).toBeGreaterThanOrEqual(2);

    const narrow = buildImpactReport(db, organization, { city: "North Harbor", category: "food" });
    expect(narrow.populationHidden).toBe(true);
    expect(narrow.participating).toEqual({ value: null, suppressed: true });
    expect(reportToCsv(narrow)).toContain("suppressed");
    expect(reportToCsv(everyone)).toContain("Demonstration data. These numbers are not actual Upwardia results.");
    expect(reportToCsv(narrow)).not.toContain("demo-r-");
  });

  it("expires sessions and honors withdrawal, deletion, and retention", () => {
    const token = newSessionToken();
    createSession(db, "super@impact.demo", token, asOf);
    expect(principalForToken(db, token, asOf)?.email).toBe("super@impact.demo");
    expect(principalForToken(db, token, "2026-10-21T12:00:00.000Z")).toBeNull();
    deleteSession(db, token);

    const dir = mkdtempSync(path.join(tmpdir(), "upwardia-impact-mutate-"));
    const mutable = openDatabase(path.join(dir, "impact.sqlite"));
    withdrawConsent(mutable, "demo-r-0001", asOf);
    const organization = authenticateUser(mutable, "harborlight@impact.demo", "demo-organization");
    if (!organization) throw new Error("organization");
    const afterWithdrawal = buildImpactReport(mutable, organization, {});
    expect(afterWithdrawal.participating.value).toBe(75);
    deleteResidentAnalytics(mutable, "demo-r-0002", asOf);
    const remaining = mutable.prepare("SELECT COUNT(*) AS n FROM events WHERE resident_id = ?").get("demo-r-0002");
    expect(Number(remaining?.n ?? 0)).toBe(0);
    mutable.prepare("UPDATE events SET occurred_at = ? WHERE resident_id = ?").run("2020-01-01T00:00:00.000Z", "demo-r-0003");
    purgeExpired(mutable, asOf);
    const aged = mutable.prepare("SELECT COUNT(*) AS n FROM events WHERE resident_id = ?").get("demo-r-0003");
    expect(Number(aged?.n ?? 0)).toBe(0);
    closeDb(mutable);
  });
});

describe("resident code does not record impact events", () => {
  it("keeps the resident app and Ask Upwardia off the impact pipeline", () => {
    const roots = ["app", "components", "lib"];
    const hits: string[] = [];
    for (const root of roots) {
      for (const file of sourceFiles(path.join(process.cwd(), root))) {
        if (file.includes(`${path.sep}impact${path.sep}`)) continue;
        const text = readFileSync(file, "utf8");
        if (text.includes("@/lib/impact") || text.includes("/api/impact")) hits.push(file);
      }
    }
    expect(hits).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) files.push(full);
  }
  return files;
}
