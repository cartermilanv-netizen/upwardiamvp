import { describe, expect, it } from "vitest";
import { applicableScreens, commitPending, commitSkip, createDraft, serializeAssessment } from "@/lib/flow";
import type { DraftAssessment } from "@/lib/types";

function answeredDraft(): DraftAssessment {
  const started = createDraft("local_device", new Date("2026-10-19T12:00:00.000Z"));
  return {
    ...started,
    id: "household-1",
    sensitiveConsent: "granted",
    financial: {
      consent: "granted",
      employment: { status: "answered", value: "looking" },
      incomeRange: { status: "answered", value: "under_15k" },
      housingSituation: { status: "answered", value: "rent" },
      housingCostHardship: { status: "answered", value: "yes" },
      foodSecurity: { status: "answered", value: "often_not_enough" },
      foodBarriers: { status: "answered", value: ["cost"] },
      utilityTrouble: { status: "answered", value: "yes" },
      utilityTypes: { status: "answered", value: ["internet"] },
    },
    health: {
      consent: "granted",
      insurance: { status: "answered", value: "none" },
      hasPcp: { status: "answered", value: "no" },
      wantsClinicHelp: { status: "answered", value: "yes" },
      careAccessDifficulty: { status: "answered", value: "yes" },
      careBarriers: { status: "answered", value: ["transport"] },
      unmetSocialNeeds: { status: "answered", value: ["food"] },
    },
  };
}

describe("sensitive consent", () => {
  it("serializes a decline without financial or health values", () => {
    const declined = serializeAssessment({
      ...answeredDraft(),
      sensitiveConsent: "declined",
    });
    expect(declined.financial).toEqual({ consent: "declined" });
    expect(declined.health).toEqual({ consent: "declined" });
    expect(Object.keys(declined.financial ?? {})).toEqual(["consent"]);
    expect(Object.keys(declined.health ?? {})).toEqual(["consent"]);
    const json = JSON.stringify(declined);
    expect(json).not.toContain("under_15k");
    expect(json).not.toContain("often_not_enough");
    expect(json).not.toContain("looking");
    expect(json).not.toContain("wantsClinicHelp");
    expect(JSON.stringify(declined.financial)).not.toContain("employment");
  });

  it("shows financial questions only after consent, and clears them if consent is withdrawn", () => {
    const started = createDraft("memory_only", new Date("2026-10-19T12:00:00.000Z"));
    expect(applicableScreens(started)).not.toContain("employment");
    const granted = commitPending(started, "consent", { kind: "consent", value: "granted" }).draft;
    expect(granted?.sensitiveConsent).toBe("granted");
    expect(applicableScreens(granted!)).toContain("employment");
    expect(granted?.financial).toEqual({ consent: "granted" });
    const withIncome = commitPending(granted, "income", { kind: "single", value: "under_15k", opt: null }).draft!;
    const declined = commitPending(withIncome, "consent", { kind: "consent", value: "declined" }).draft!;
    expect(declined.financial).toEqual({ consent: "declined" });
    expect(JSON.stringify(declined.financial)).not.toContain("under_15k");
    expect(applicableScreens(declined)).not.toContain("income");
    const reopened = commitPending(declined, "consent", { kind: "consent", value: "granted" }).draft!;
    expect(reopened.financial).toEqual({ consent: "granted" });
    expect(reopened.health).toEqual({ consent: "granted" });
  });
});

describe("conditional screens", () => {
  it("skips housing hardship when the person is unhoused or does not answer", () => {
    let draft = commitPending(createDraft("memory_only"), "consent", { kind: "consent", value: "granted" }).draft!;
    draft = commitPending(draft, "housingSituation", { kind: "single", value: "unhoused", opt: null }).draft!;
    expect(applicableScreens(draft)).not.toContain("housingHardship");
    expect(draft.financial?.consent === "granted" && draft.financial.housingCostHardship).toEqual({ status: "not_applicable" });
    draft = commitPending(draft, "housingSituation", { kind: "single", value: null, opt: "not_sure" }).draft!;
    expect(applicableScreens(draft)).not.toContain("housingHardship");
    draft = commitPending(draft, "housingSituation", { kind: "single", value: "rent", opt: null }).draft!;
    expect(applicableScreens(draft)).toContain("housingHardship");
  });

  it("asks food and utility follow-ups only after a yes-shaped answer", () => {
    let draft = commitPending(createDraft("memory_only"), "consent", { kind: "consent", value: "granted" }).draft!;
    draft = commitPending(draft, "foodSecurity", { kind: "single", value: "enough", opt: null }).draft!;
    expect(applicableScreens(draft)).not.toContain("foodBarriers");
    draft = commitPending(draft, "foodSecurity", { kind: "single", value: "often_not_enough", opt: null }).draft!;
    expect(applicableScreens(draft)).toContain("foodBarriers");
    draft = commitSkip(draft, "utilityTrouble");
    expect(applicableScreens(draft)).not.toContain("utilityTypes");
    draft = commitPending(draft, "utilityTrouble", { kind: "single", value: "yes", opt: null }).draft!;
    expect(applicableScreens(draft)).toContain("utilityTypes");
  });

  it("asks clinic and care follow-ups only when the parent answer requires them", () => {
    let draft = commitPending(createDraft("memory_only"), "consent", { kind: "consent", value: "granted" }).draft!;
    draft = commitPending(draft, "hasPcp", { kind: "single", value: "yes", opt: null }).draft!;
    expect(applicableScreens(draft)).not.toContain("wantsClinicHelp");
    draft = commitPending(draft, "hasPcp", { kind: "single", value: "no", opt: null }).draft!;
    expect(applicableScreens(draft)).toContain("wantsClinicHelp");
    draft = commitPending(draft, "careAccess", { kind: "single", value: "not_needed", opt: null }).draft!;
    expect(applicableScreens(draft)).not.toContain("careBarriers");
    draft = commitPending(draft, "careAccess", { kind: "single", value: "yes", opt: null }).draft!;
    expect(applicableScreens(draft)).toContain("careBarriers");
  });

  it("skips reliability when the person cannot usually get there", () => {
    const draft = commitPending(createDraft("memory_only"), "transportModes", {
      kind: "multi",
      values: ["cannot_get_there"],
      opt: null,
    }).draft!;
    expect(applicableScreens(draft)).not.toContain("reliability");
    expect(draft.transportation.reliability).toEqual({ status: "not_applicable" });
    const skipped = commitSkip(createDraft("memory_only"), "transportModes");
    expect(applicableScreens(skipped)).not.toContain("reliability");
  });
});
