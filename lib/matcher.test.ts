import { describe, expect, it } from "vitest";
import { residentCatalog } from "@/lib/catalog";
import { decideEntry, firedRuleIds, isUsableCatalogRow, matchCatalog } from "@/lib/matcher";
import type { DraftAssessment, IncomeRange, VerifiedCatalogEntry } from "@/lib/types";

function draft(partial: Partial<DraftAssessment> = {}): DraftAssessment {
  return {
    schemaVersion: 1,
    id: "test",
    locale: "en",
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    prototypeStorage: "memory_only",
    sensitiveConsent: "granted",
    household: {},
    financial: { consent: "granted" },
    health: { consent: "granted" },
    educationEmployment: {},
    transportation: {},
    digital: {},
    priorities: {},
    ...partial,
  };
}

function entry(partial: Partial<VerifiedCatalogEntry> & Pick<VerifiedCatalogEntry, "id" | "categories">): VerifiedCatalogEntry {
  return {
    name: "Neighborhood pantry",
    verified: true,
    sourceName: "Harbor Community Source",
    sourceUrl: "https://example.com/source",
    lastVerified: "2026-01-15",
    serviceAreaZips: "unknown",
    channels: ["phone"],
    phone: null,
    eligibility: {
      incomeCeiling: null,
      requiresZipInServiceArea: false,
      requiresChildren: null,
      statedRequirements: [],
    },
    claimText: "The source says this listing shares groceries.",
    ...partial,
  };
}

type GrantedFinancial = Exclude<NonNullable<DraftAssessment["financial"]>, { consent: "declined" }>;
type GrantedHealth = Exclude<NonNullable<DraftAssessment["health"]>, { consent: "declined" }>;

const money = (patch: Omit<GrantedFinancial, "consent">) =>
  draft({ financial: { consent: "granted", ...patch } });

const care = (patch: Omit<GrantedHealth, "consent">) =>
  draft({ health: { consent: "granted", ...patch } });

describe("rules R1–R9", () => {
  it("fires R1 only from answered food signals or a food goal", () => {
    expect(firedRuleIds(money({ foodSecurity: { status: "answered", value: "often_not_enough" } }))).toContain("R1");
    expect(firedRuleIds(money({ foodSecurity: { status: "answered", value: "sometimes_not_enough" } }))).toContain("R1");
    expect(firedRuleIds(money({ foodSecurity: { status: "answered", value: "enough" } }))).not.toContain("R1");
    expect(firedRuleIds(money({ foodSecurity: { status: "skipped" } }))).not.toContain("R1");
    expect(firedRuleIds(money({ foodSecurity: { status: "not_sure" } }))).not.toContain("R1");
    expect(firedRuleIds(money({ foodSecurity: { status: "prefer_not_to_answer" } }))).not.toContain("R1");
    expect(firedRuleIds(care({ unmetSocialNeeds: { status: "answered", value: ["food"] } }))).toContain("R1");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["food"] } } }))).toContain("R1");
  });

  it("does not read food answers when sensitive consent is declined", () => {
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" } },
    });
    expect(firedRuleIds(declined)).not.toContain("R1");
    const goal = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "declined" },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    expect(firedRuleIds(goal)).toContain("R1");
  });

  it("fires R2 from housing answers, unmet need, or a housing goal", () => {
    expect(firedRuleIds(money({ housingSituation: { status: "answered", value: "unhoused" } }))).toContain("R2");
    expect(firedRuleIds(money({ housingCostHardship: { status: "answered", value: "yes" } }))).toContain("R2");
    expect(firedRuleIds(money({ housingCostHardship: { status: "answered", value: "sometimes" } }))).toContain("R2");
    expect(firedRuleIds(money({ housingCostHardship: { status: "answered", value: "no" } }))).not.toContain("R2");
    expect(firedRuleIds(money({ housingSituation: { status: "skipped" } }))).not.toContain("R2");
    expect(firedRuleIds(care({ unmetSocialNeeds: { status: "answered", value: ["housing"] } }))).toContain("R2");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["housing"] } } }))).toContain("R2");
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "granted", housingSituation: { status: "answered", value: "unhoused" } },
      health: { consent: "declined" },
    });
    expect(firedRuleIds(declined)).not.toContain("R2");
  });

  it("fires R3 from utility trouble or a utilities goal, not from bill types alone", () => {
    expect(firedRuleIds(money({ utilityTrouble: { status: "answered", value: "yes" } }))).toContain("R3");
    expect(firedRuleIds(money({ utilityTrouble: { status: "answered", value: "no" } }))).not.toContain("R3");
    expect(firedRuleIds(money({ utilityTypes: { status: "answered", value: ["internet"] } }))).not.toContain("R3");
    expect(firedRuleIds(money({ utilityTrouble: { status: "not_sure" } }))).not.toContain("R3");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["utilities"] } } }))).toContain("R3");
  });

  it("does not treat not sure or skipped insurance as uninsured", () => {
    expect(firedRuleIds(care({ insurance: { status: "answered", value: "none" } }))).toContain("R4");
    expect(firedRuleIds(care({ insurance: { status: "answered", value: "medi_cal" } }))).not.toContain("R4");
    expect(firedRuleIds(care({ insurance: { status: "not_sure" } }))).not.toContain("R4");
    expect(firedRuleIds(care({ insurance: { status: "skipped" } }))).not.toContain("R4");
    expect(firedRuleIds(care({ insurance: { status: "prefer_not_to_answer" } }))).not.toContain("R4");
    expect(firedRuleIds(care({ unmetSocialNeeds: { status: "answered", value: ["coverage_or_doctor"] } }))).toEqual(
      expect.arrayContaining(["R4", "R5"]),
    );
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["health"] } } }))).toContain("R4");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["health"] } } }))).not.toContain("R5");
    const declined = draft({
      sensitiveConsent: "declined",
      health: { consent: "granted", insurance: { status: "answered", value: "none" } },
      financial: { consent: "declined" },
    });
    expect(firedRuleIds(declined)).not.toContain("R4");
  });

  it("fires R5 from clinic help, care difficulty, or an unmet doctor need", () => {
    expect(
      firedRuleIds(care({
        hasPcp: { status: "answered", value: "no" },
        wantsClinicHelp: { status: "answered", value: "yes" },
      })),
    ).toContain("R5");
    expect(
      firedRuleIds(care({
        hasPcp: { status: "answered", value: "no" },
        wantsClinicHelp: { status: "answered", value: "no" },
      })),
    ).not.toContain("R5");
    expect(firedRuleIds(care({ hasPcp: { status: "answered", value: "yes" } }))).not.toContain("R5");
    expect(firedRuleIds(care({ careAccessDifficulty: { status: "answered", value: "yes" } }))).toContain("R5");
    expect(firedRuleIds(care({ careAccessDifficulty: { status: "answered", value: "not_needed" } }))).not.toContain("R5");
    expect(firedRuleIds(care({ careAccessDifficulty: { status: "not_sure" } }))).not.toContain("R5");
  });

  it("fires R6 from work, training, skills, or job and training goals", () => {
    expect(firedRuleIds(money({ employment: { status: "answered", value: "looking" } }))).toContain("R6");
    expect(firedRuleIds(money({ employment: { status: "answered", value: "full_time" } }))).not.toContain("R6");
    expect(firedRuleIds(draft({
      educationEmployment: { trainingNeeds: { status: "answered", value: ["certificate"] } },
    }))).toContain("R6");
    expect(firedRuleIds(draft({
      educationEmployment: { trainingNeeds: { status: "answered", value: ["none"] } },
    }))).not.toContain("R6");
    expect(firedRuleIds(draft({
      educationEmployment: { employmentBarriers: { status: "answered", value: ["skills"] } },
    }))).toContain("R6");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["job"] } } }))).toContain("R6");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["training"] } } }))).toContain("R6");
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "granted", employment: { status: "answered", value: "looking" } },
      health: { consent: "declined" },
      educationEmployment: { trainingNeeds: { status: "answered", value: ["ged"] } },
    });
    expect(firedRuleIds(declined)).toContain("R6");
    const declinedWorkOnly = draft({
      sensitiveConsent: "declined",
      financial: { consent: "granted", employment: { status: "answered", value: "looking" } },
      health: { consent: "declined" },
    });
    expect(firedRuleIds(declinedWorkOnly)).not.toContain("R6");
  });

  it("fires R7 only from answered transportation signals", () => {
    expect(firedRuleIds(draft({
      transportation: { modes: { status: "answered", value: ["cannot_get_there"] } },
    }))).toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { reliability: { status: "answered", value: "rarely" } },
    }))).toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { reliability: { status: "answered", value: "usually" } },
    }))).not.toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { hardToReach: { status: "answered", value: ["work"] } },
    }))).toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { hardToReach: { status: "answered", value: ["not_hard"] } },
    }))).not.toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { modes: { status: "skipped" } },
    }))).not.toContain("R7");
    expect(firedRuleIds(draft({
      transportation: { modes: { status: "not_sure" } },
    }))).not.toContain("R7");
    expect(firedRuleIds(care({ careBarriers: { status: "answered", value: ["transport"] } }))).toContain("R7");
    expect(firedRuleIds(draft({
      educationEmployment: { employmentBarriers: { status: "answered", value: ["transportation"] } },
    }))).toContain("R7");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["transportation"] } } }))).toContain("R7");
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "granted", careBarriers: { status: "answered", value: ["transport"] } },
    });
    expect(firedRuleIds(declined)).not.toContain("R7");
  });

  it("fires R8 from digital flags or a digital goal", () => {
    expect(firedRuleIds(draft({ digital: { access: { status: "answered", value: ["none"] } } }))).toContain("R8");
    expect(firedRuleIds(draft({ digital: { access: { status: "answered", value: ["wifi_home"] } } }))).toContain("R8");
    expect(firedRuleIds(draft({
      digital: { access: { status: "answered", value: ["smartphone", "wifi_home"] } },
    }))).not.toContain("R8");
    expect(firedRuleIds(draft({
      digital: { access: { status: "answered", value: ["smartphone", "wifi_elsewhere"] } },
    }))).toContain("R8");
    expect(firedRuleIds(draft({ digital: { comfort: { status: "answered", value: "uncomfortable" } } }))).toContain("R8");
    expect(firedRuleIds(draft({
      digital: {
        access: { status: "answered", value: ["none"] },
        comfort: { status: "answered", value: "with_help" },
      },
    }))).toContain("R8");
    expect(firedRuleIds(draft({
      digital: {
        access: { status: "answered", value: ["smartphone", "wifi_home"] },
        comfort: { status: "answered", value: "with_help" },
      },
    }))).not.toContain("R8");
    expect(firedRuleIds(draft({ digital: { access: { status: "skipped" } } }))).not.toContain("R8");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["digital"] } } }))).toContain("R8");
  });

  it("fires R9 from care barriers or a family goal, not from a child count", () => {
    expect(firedRuleIds(draft({
      educationEmployment: { employmentBarriers: { status: "answered", value: ["childcare"] } },
    }))).toContain("R9");
    expect(firedRuleIds(care({ unmetSocialNeeds: { status: "answered", value: ["family_care"] } }))).toContain("R9");
    expect(firedRuleIds(draft({ priorities: { topGoals: { status: "answered", value: ["family_care"] } } }))).toContain("R9");
    expect(firedRuleIds(draft({ household: { children: { status: "answered", value: 3 } } }))).not.toContain("R9");
    expect(firedRuleIds(draft({ household: { children: { status: "answered", value: 0 } } }))).not.toContain("R9");
    expect(firedRuleIds(draft({ household: { children: { status: "not_sure" } } }))).not.toContain("R9");
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "granted", unmetSocialNeeds: { status: "answered", value: ["family_care"] } },
    });
    expect(firedRuleIds(declined)).not.toContain("R9");
  });
});

describe("eligibility flags", () => {
  const foodRow = (patch: Partial<VerifiedCatalogEntry> = {}) =>
    entry({ id: "food-1", categories: ["food"], ...patch });

  it("asks for a ZIP instead of guessing the service area", () => {
    const assessment = draft({
      household: { zip: { status: "skipped" } },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const decision = decideEntry(assessment, foodRow({
      serviceAreaZips: ["90001"],
      eligibility: {
        incomeCeiling: null,
        requiresZipInServiceArea: true,
        requiresChildren: null,
        statedRequirements: [],
      },
    })).decision;
    expect(decision.kind).toBe("needs_information");
    if (decision.kind === "needs_information") expect(decision.missingEligibility).toContain("zip");
    expect(decision.kind).not.toBe("possible_help");
  });

  it("hides a row when the answered ZIP is outside the service area", () => {
    const assessment = draft({
      household: { zip: { status: "answered", value: "90002" } },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const decision = decideEntry(assessment, foodRow({
      serviceAreaZips: ["90001"],
      eligibility: {
        incomeCeiling: null,
        requiresZipInServiceArea: true,
        requiresChildren: null,
        statedRequirements: [],
      },
    })).decision;
    expect(decision.kind).toBe("not_applicable");
  });

  it("flags an unknown catalog service area", () => {
    const assessment = draft({
      household: { zip: { status: "answered", value: "90001" } },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const decision = decideEntry(assessment, foodRow({
      serviceAreaZips: "unknown",
      eligibility: {
        incomeCeiling: null,
        requiresZipInServiceArea: true,
        requiresChildren: null,
        statedRequirements: [],
      },
    })).decision;
    expect(decision.kind).toBe("needs_information");
    if (decision.kind === "needs_information") expect(decision.missingEligibility).toContain("catalog_service_area");
  });

  it("does not assume an income range when it is missing or opted out", () => {
    const row = foodRow({
      eligibility: {
        incomeCeiling: "30_to_49k",
        requiresZipInServiceArea: false,
        requiresChildren: null,
        statedRequirements: [],
      },
    });
    for (const status of ["skipped", "not_sure", "prefer_not_to_answer"] as const) {
      const assessment = draft({
        financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" }, incomeRange: { status } },
      });
      const decision = decideEntry(assessment, row).decision;
      expect(decision.kind).toBe("needs_information");
      if (decision.kind === "needs_information") expect(decision.missingEligibility).toContain("income_range");
    }
    const declined = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "declined" },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const declinedDecision = decideEntry(declined, row).decision;
    expect(declinedDecision.kind).toBe("needs_information");
    if (declinedDecision.kind === "needs_information") expect(declinedDecision.missingEligibility).toContain("income_range");
  });

  it("hides a row entirely above the ceiling and flags an overlapping range", () => {
    const row = (ceiling: IncomeRange) => foodRow({
      eligibility: {
        incomeCeiling: ceiling,
        requiresZipInServiceArea: false,
        requiresChildren: null,
        statedRequirements: [],
      },
    });
    const above = decideEntry(draft({
      financial: {
        consent: "granted",
        foodSecurity: { status: "answered", value: "often_not_enough" },
        incomeRange: { status: "answered", value: "75k_or_more" },
      },
    }), row("30_to_49k")).decision;
    expect(above.kind).toBe("not_applicable");

    const overlap = decideEntry(draft({
      financial: {
        consent: "granted",
        foodSecurity: { status: "answered", value: "often_not_enough" },
        incomeRange: { status: "answered", value: "30_to_49k" },
      },
    }), row("30_to_49k")).decision;
    expect(overlap.kind).toBe("needs_information");
    if (overlap.kind === "needs_information") expect(overlap.missingEligibility).toContain("catalog_income_rule");

    const below = decideEntry(draft({
      financial: {
        consent: "granted",
        foodSecurity: { status: "answered", value: "often_not_enough" },
        incomeRange: { status: "answered", value: "under_15k" },
      },
    }), row("30_to_49k")).decision;
    expect(below.kind).toBe("possible_help");
  });

  it("treats children as missing or not applicable only from answered data", () => {
    const row = entry({
      id: "care-1",
      categories: ["family_care"],
      eligibility: {
        incomeCeiling: null,
        requiresZipInServiceArea: false,
        requiresChildren: true,
        statedRequirements: [],
      },
    });
    const goal = { priorities: { topGoals: { status: "answered" as const, value: ["family_care" as const] } } };
    expect(decideEntry(draft({ ...goal, household: { children: { status: "not_sure" } } }), row).decision.kind).toBe("needs_information");
    expect(decideEntry(draft({ ...goal, household: { children: { status: "answered", value: 0 } } }), row).decision.kind).toBe("not_applicable");
    expect(decideEntry(draft({ ...goal, household: { children: { status: "answered", value: 2 } } }), row).decision.kind).toBe("possible_help");
    expect(decideEntry(draft({ household: { children: { status: "answered", value: 2 } } }), row).decision.kind).toBe("not_applicable");
  });

  it("does not turn a coverage goal plus an unknown insurance answer into possible help", () => {
    const row = entry({
      id: "coverage-1",
      categories: ["health_coverage"],
      claimText: "The source says this listing helps people compare health plans.",
    });
    const decision = decideEntry(draft({
      health: { consent: "granted", insurance: { status: "not_sure" } },
      priorities: { topGoals: { status: "answered", value: ["health"] } },
    }), row).decision;
    expect(decision.kind).toBe("needs_information");
    if (decision.kind === "needs_information") expect(decision.missingEligibility).toContain("insurance");
    const noSignal = decideEntry(draft({
      health: { consent: "granted", insurance: { status: "not_sure" } },
    }), row).decision;
    expect(noSignal.kind).toBe("not_applicable");
  });
});

describe("why copy and unverified rows", () => {
  it("keeps unverified rows and their text out of the match list", () => {
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" } },
    });
    const secret = "UNIQUE_CLAIM_SHOULD_NOT_APPEAR";
    const rows = matchCatalog(assessment, [
      entry({ id: "bad-flag", categories: ["food"], verified: false as unknown as true, claimText: secret }),
      { ...entry({ id: "bad-source", categories: ["food"], claimText: secret }), sourceName: "  " },
      { ...entry({ id: "bad-claim", categories: ["food"] }), claimText: "" },
      { ...entry({ id: "bad-date", categories: ["food"] }), lastVerified: "not-a-date" },
    ]);
    expect(rows).toHaveLength(0);
    expect(JSON.stringify(rows)).not.toContain(secret);
    expect(isUsableCatalogRow({ verified: "true", sourceName: "A", claimText: "B", lastVerified: "2026-01-01", name: "C" })).toBe(false);
  });

  it("includes the heading and source and never says you qualify", () => {
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" } },
    });
    const row = decideEntry(assessment, entry({ id: "food-1", categories: ["food"] }));
    expect(row.why.heading).toBe("Why this resource may help you");
    expect(row.why.text).toContain("Why this resource may help you");
    expect(row.why.text).toContain("Harbor Community Source");
    expect(row.why.text.toLowerCase()).not.toContain("you qualify");
    expect(row.why.text.toLowerCase()).not.toContain("you are eligible");
    expect(row.why.text.toLowerCase()).not.toContain("guaranteed");
    expect(row.why.text.toLowerCase()).not.toContain("ai recommends");
    expect(row.why.text.toLowerCase()).not.toContain("verified match");
    expect(row.why.text).toContain("You said food was often not enough in the last 30 days.");
  });

  it("uses the goal sentence when that is the only signal", () => {
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "skipped" } },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const row = decideEntry(assessment, entry({ id: "food-1", categories: ["food"] }));
    expect(row.why.text).toContain("You chose food as one of your top goals.");
    expect(row.why.text.toLowerCase()).not.toContain("skipped");
    expect(row.why.text.toLowerCase()).not.toContain("not enough");
  });
});

describe("resident catalog", () => {
  it("ships empty", () => {
    expect(residentCatalog).toEqual([]);
  });
});
