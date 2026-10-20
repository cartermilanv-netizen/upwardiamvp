import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { residentCatalog } from "@/lib/catalog";
import { collectFields, isFact, missingSupport, publishedFacts } from "@/lib/resource-database/facts";
import { loadPublishedFacts, loadResourceCatalog } from "@/lib/resource-database/load";
import { parseIncomeChart } from "@/lib/resource-database/resident";
import type { Provenance, Sourced } from "@/lib/resource-database/types";

const catalog = loadResourceCatalog();

function belongsToPublished(recordId: string): boolean {
  if (recordId === "la-county-dpss-calfresh" || recordId === "california-wic") return true;
  const rows = [
    ...catalog.eligibilityRules,
    ...catalog.benefitDetails,
    ...catalog.requiredDocuments,
    ...catalog.applicationForms,
    ...catalog.applicationFields,
    ...catalog.applicationVersions,
  ];
  const row = rows.find((item) => item.id === recordId);
  return row?.programId === "la-county-dpss-calfresh" || row?.programId === "california-wic";
}

function filesUnder(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "resource-database") continue;
      files.push(...filesUnder(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("resource database seed", () => {
  it("publishes only the reviewed programs", () => {
    expect(residentCatalog.map((entry) => entry.id)).toEqual(["la-county-dpss-calfresh", "california-wic"]);
    const roots = ["app", "components", "lib"].map((root) => path.join(process.cwd(), root));
    const hits: string[] = [];
    for (const file of roots.flatMap((root) => filesUnder(root))) {
      if (file.endsWith(`${path.sep}lib${path.sep}catalog.ts`)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("resource-database")) hits.push(file);
    }
    expect(hits).toEqual([]);
    const facts = loadPublishedFacts();
    const publishedIds = new Set(["la-county-dpss-calfresh", "california-wic"]);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every((fact) => publishedIds.has(fact.recordId) || belongsToPublished(fact.recordId))).toBe(true);
    const packed = JSON.stringify(facts);
    expect(packed).not.toContain("$10,508");
    expect(packed).not.toContain("$127,200");
    expect(packed).not.toContain("1685 Main Street");
    expect(packed).not.toContain("Create Password");
    expect(facts.some((fact) => fact.recordId === "medi-cal" || fact.recordId.startsWith("rule-bmh") || fact.recordId.startsWith("doc-bmh"))).toBe(false);
    const chart = residentCatalog.find((entry) => entry.incomeChart)?.incomeChart;
    expect(chart?.rows).toHaveLength(9);
    expect(chart?.effectiveFrom).toBe("2026-05-01");
    expect(chart?.effectiveTo).toBe("2027-06-30");
    const ten = Array.from({ length: 10 }, (_, index) => `${index + 1} | $1 | $1 | $1 | $1 | $1`).join("\n");
    expect(parseIncomeChart(ten)).toBeNull();
  });

  it("attaches a retrieved source to every supported value", () => {
    const sources = new Map(catalog.sources.map((source) => [source.id, source]));
    const records = [
      ...catalog.programs,
      ...catalog.eligibilityRules,
      ...catalog.benefitDetails,
      ...catalog.requiredDocuments,
      ...catalog.applicationForms,
      ...catalog.applicationFields,
      ...catalog.applicationVersions,
    ];
    const supported = records.flatMap((record) => collectFields(record, record.id, "unpublished"));
    expect(supported.some((field) => field.sourced.support === "supported")).toBe(true);
    for (const field of supported) {
      if (field.sourced.support !== "supported") continue;
      const provenance = field.sourced.provenance;
      expect(provenance, field.field).not.toBeNull();
      const source = sources.get(provenance!.sourceId);
      expect(source?.contentRetrieved, field.field).toBe(true);
      expect(source?.fetchOutcome).toBe("fetched");
      expect(provenance!.sourceUrl).toBe(source?.url);
      expect(provenance!.retrievedOn).toBe("2026-10-20");
      expect(provenance!.basis.trim().length).toBeGreaterThan(0);
    }
  });

  it("stores missing thresholds, documents, and questions as empty", () => {
    const records = [
      ...catalog.programs,
      ...catalog.eligibilityRules,
      ...catalog.benefitDetails,
      ...catalog.requiredDocuments,
      ...catalog.applicationForms,
      ...catalog.applicationFields,
      ...catalog.applicationVersions,
    ];
    for (const record of records) {
      for (const field of collectFields(record, record.id, "unpublished")) {
        if (!missingSupport(field.sourced.support)) continue;
        expect(field.sourced.value, `${record.id}.${field.field}`).toBeNull();
        expect(field.sourced.provenance).toBeNull();
      }
    }
    const general = catalog.eligibilityRules.find((rule) => rule.id === "rule-calfresh-general");
    expect(general?.threshold.support).toBe("requires_verification");
    expect(general?.threshold.value).toBeNull();
    const income = catalog.eligibilityRules.find((rule) => rule.id === "rule-bmh-income");
    expect(income?.threshold.value).not.toMatch(/6 people|6-person|\$2\d\d,\d{3}/);
    expect(catalog.applicationFields.filter((field) => field.programId === "california-wic")).toEqual([]);
    const medi = catalog.programs.find((program) => program.id === "medi-cal");
    const mediSupported = collectFields(medi, "medi-cal", "unpublished").filter((field) => field.sourced.support === "supported");
    expect(mediSupported).toEqual([]);
  });

  it("does not treat unpublished or unverified fields as facts", () => {
    const provenance: Provenance = {
      sourceId: "src-example",
      sourceUrl: "https://example.com/program",
      retrievedOn: "2026-10-20",
      basis: "Example page states this.",
    };
    const pending: Sourced<string> = {
      value: "An extracted sentence",
      support: "supported",
      reviewStatus: "extracted_pending_review",
      provenance,
    };
    expect(isFact(pending, "unpublished")).toBe(false);
    expect(isFact(pending, "published")).toBe(false);
    const verified: Sourced<string> = { ...pending, reviewStatus: "human_verified" };
    expect(isFact(verified, "unpublished")).toBe(false);
    expect(isFact(verified, "published")).toBe(true);
    const unknown: Sourced<string> = {
      value: null,
      support: "requires_verification",
      reviewStatus: "human_verified",
      provenance: null,
    };
    expect(isFact(unknown, "published")).toBe(false);
    const publishedProgram = structuredClone(catalog.programs[0]);
    publishedProgram.publicationStatus = "published";
    publishedProgram.humanReviewStatus = "human_verified";
    for (const field of collectFields(publishedProgram, publishedProgram.id, "published")) {
      field.sourced.reviewStatus = "extracted_pending_review";
    }
    expect(publishedFacts([publishedProgram])).toEqual([]);
    expect(loadPublishedFacts().some((fact) => fact.recordId === "form-cf285" && fact.field === "url")).toBe(false);
    expect(loadPublishedFacts().some((fact) => fact.recordId === "benefit-calfresh-minimum")).toBe(false);
    expect(loadPublishedFacts().some((fact) => fact.recordId === "rule-calfresh-general" && fact.field === "threshold")).toBe(false);
  });

  it("records blocked pages and discovery seeds without pretending they were read", () => {
    const benefits = catalog.sources.find((source) => source.id === "src-benefitscal");
    const medi = catalog.sources.find((source) => source.id === "src-dhcs-medi-cal");
    expect(benefits).toMatchObject({ fetchOutcome: "blocked", contentRetrieved: false, httpStatus: 403, retrievedOn: null });
    expect(medi).toMatchObject({ fetchOutcome: "blocked", contentRetrieved: false, retrievedOn: null });
    const discoveries = catalog.sources.filter((source) => source.role === "discovery_seed");
    expect(discoveries).toHaveLength(8);
    expect(discoveries.every((source) => source.fetchOutcome === "not_fetched" && source.reviewStatus === "not_yet_reviewed")).toBe(true);
    const cited = new Set(
      [
        ...catalog.programs,
        ...catalog.eligibilityRules,
        ...catalog.benefitDetails,
        ...catalog.requiredDocuments,
        ...catalog.applicationForms,
        ...catalog.applicationFields,
        ...catalog.applicationVersions,
      ].flatMap((record) =>
        collectFields(record, record.id, "unpublished")
          .map((field) => field.sourced.provenance?.sourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    expect(cited.has("src-benefitscal")).toBe(false);
    expect(cited.has("src-dhcs-medi-cal")).toBe(false);
    for (const source of discoveries) expect(cited.has(source.id)).toBe(false);
  });

  it("keeps directory forms free of invented questions", () => {
    const directories = catalog.applicationForms.filter((form) => form.schemaCompleteness === "directory_only");
    expect(directories.length).toBeGreaterThan(0);
    for (const form of directories) {
      expect(catalog.applicationFields.filter((field) => field.formId === form.id)).toEqual([]);
    }
    const labels = catalog.applicationFields.map((field) => field.label.value);
    expect(labels).toEqual([
      "Applicant's full name",
      "Household address",
      "Signature",
      "First Name",
      "Last Name",
      "Email",
      "Create Password",
      "Confirm Password",
    ]);
  });
});
