import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { demonstrationProfile, demonstrationPrograms } from "@/lib/applications/catalog";
import { missingFieldIds, prefillFromProfile, validateDraft } from "@/lib/applications/logic";
import { getDraft, grantPrefillConsent, resetApplicationStore, updateDraftValues } from "@/lib/applications/store";

const harbor = demonstrationPrograms[0];
const northline = demonstrationPrograms[1];

describe("application models and forms", () => {
  beforeEach(() => {
    resetApplicationStore();
  });

  it("keeps schemas as plain JSON and records demonstration source fields", () => {
    for (const program of demonstrationPrograms) {
      expect(JSON.parse(JSON.stringify(program.schema))).toEqual(program.schema);
      expect(program.source.officialWebsite).toMatch(/^https:\/\/example.com\//);
      expect(program.source.applicationUrl).toMatch(/^https:\/\/example.com\//);
      expect(program.source.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(program.source.verificationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(program.source.formVersion).toBe("demo-1");
      expect(program.eligibilityCriteria.length).toBeGreaterThan(0);
      expect(program.requiredDocuments.length).toBeGreaterThan(0);
      expect(program.submissionMethod).toBeTruthy();
    }
    expect(harbor.incomePeriod).toBe("monthly");
    expect(northline.incomePeriod).toBe("annual");
    expect(harbor.householdDefinition).not.toBe(northline.householdDefinition);
  });

  it("does not prefill shared answers before consent", () => {
    expect(prefillFromProfile(northline.schema, demonstrationProfile, false)).toEqual({});
    const before = getDraft("draft-northline");
    expect(before?.consentToPrefill).toBe(false);
    expect(before?.values).toEqual({});
    const after = grantPrefillConsent("draft-northline");
    expect(after?.consentToPrefill).toBe(true);
    expect(after?.values.preferredName).toBe("Avery Example");
    expect(after?.values.phone).toBe("555-0100");
    expect(after?.values.postalCode).toBe("99999");
    expect(after?.values.annualIncome).toBeUndefined();
    expect(after?.values.monthlyIncome).toBeUndefined();
  });

  it("flags missing required fields and validates a ZIP", () => {
    const harborDraft = getDraft("draft-harbor");
    expect(missingFieldIds(harbor.schema, harborDraft?.values ?? {})).toEqual(["peopleSharingMeals", "monthlyIncome"]);
    expect(validateDraft(harbor.schema, { ...harborDraft?.values, postalCode: "12" }).map((error) => error.id)).toContain("postalCode");
    expect(validateDraft(harbor.schema, { ...harborDraft?.values, peopleSharingMeals: "many" })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "peopleSharingMeals" })]),
    );
  });

  it("resumes a draft from the in-memory mock store", () => {
    updateDraftValues("draft-harbor", {
      preferredName: "Avery Example",
      phone: "555-0100",
      postalCode: "99999",
      peopleSharingMeals: "3",
      monthlyIncome: "1200",
    });
    expect(getDraft("draft-harbor")?.values.monthlyIncome).toBe("1200");
    expect(getDraft("draft-harbor")?.status).toBe("draft");
    resetApplicationStore();
    expect(getDraft("draft-harbor")?.values.monthlyIncome).toBeNull();
    const source = readFileSync(path.join(process.cwd(), "lib/applications/store.ts"), "utf8");
    expect(source).not.toMatch(/localStorage/);
    const catalog = readFileSync(path.join(process.cwd(), "lib/applications/catalog.ts"), "utf8");
    expect(catalog).not.toMatch(/localStorage/);
  });
});
