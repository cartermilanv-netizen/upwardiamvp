import { describe, expect, it } from "vitest";
import { actionTitle, generateDailyActions, rebuildToday } from "@/lib/actions";
import { sectionsVisited, progressCounts } from "@/lib/progress";
import type { DraftAssessment, MicroAction, VerifiedCatalogEntry } from "@/lib/types";

function draft(partial: Partial<DraftAssessment> = {}): DraftAssessment {
  return {
    schemaVersion: 1,
    id: "test",
    locale: "en",
    createdAt: "2026-10-19T00:00:00.000Z",
    updatedAt: "2026-10-19T00:00:00.000Z",
    prototypeStorage: "memory_only",
    sensitiveConsent: "granted",
    household: { zip: { status: "answered", value: "90001" }, children: { status: "answered", value: 1 } },
    financial: {
      consent: "granted",
      incomeRange: { status: "answered", value: "under_15k" },
      foodSecurity: { status: "answered", value: "often_not_enough" },
    },
    health: { consent: "granted", insurance: { status: "answered", value: "none" } },
    educationEmployment: {},
    transportation: {},
    digital: {},
    priorities: { topGoals: { status: "answered", value: ["food", "health"] }, urgency: { status: "answered", value: "this_week" } },
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
    serviceAreaZips: ["90001"],
    channels: ["phone", "online"],
    phone: "555-0100",
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

describe("daily actions", () => {
  it("returns the same three ids for the same assessment, catalog, and local date", () => {
    const catalog = [
      entry({ id: "b", categories: ["food"] }),
      entry({ id: "a", categories: ["food"], name: "Second pantry" }),
      entry({ id: "c", categories: ["health_coverage"], name: "Coverage desk", claimText: "The source says this desk explains plan options." }),
      entry({ id: "d", categories: ["housing"], name: "Housing desk", claimText: "The source says this desk explains housing options." }),
    ];
    const assessment = draft();
    const first = generateDailyActions(assessment, catalog, "2026-10-19").map((action) => action.id);
    const second = generateDailyActions(assessment, catalog, "2026-10-19").map((action) => action.id);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });

  it("puts a missing-fact action ahead of possible help", () => {
    const catalog = [entry({
      id: "food",
      categories: ["food"],
      eligibility: {
        incomeCeiling: "50_to_74k",
        requiresZipInServiceArea: true,
        requiresChildren: null,
        statedRequirements: [],
      },
    })];
    const assessment = draft({
      household: { zip: { status: "skipped" }, children: { status: "answered", value: 1 } },
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" }, incomeRange: { status: "not_sure" } },
    });
    const actions = generateDailyActions(assessment, catalog, "2026-10-19");
    expect(actions[0]?.channel).toBe("on_device");
    expect(actions[0]?.missingFact).toBe("zip");
    expect(actions[0]?.catalogId).toBeNull();
  });

  it("does not add a phone channel to an in-person transportation listing", () => {
    const catalog = [entry({
      id: "ride",
      categories: ["transportation"],
      channels: ["in_person"],
      name: "Ride desk",
      claimText: "The source says visits are in the office.",
    })];
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "enough" } },
      priorities: { topGoals: { status: "answered", value: ["transportation"] } },
      transportation: { modes: { status: "answered", value: ["cannot_get_there"] } },
    });
    const actions = generateDailyActions(assessment, catalog, "2026-10-19");
    expect(actions).toHaveLength(1);
    expect(actions[0]?.channel).toBe("in_person");
    expect(actions[0]?.channel).not.toBe("phone");
    expect(catalog[0]?.channels).toEqual(["in_person"]);
  });

  it("does not title an online-only digital barrier action as submit the form", () => {
    const catalog = [entry({
      id: "device",
      categories: ["digital"],
      channels: ["online"],
      name: "Device desk",
      claimText: "The source says this listing explains device access.",
    })];
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "enough" } },
      digital: { access: { status: "answered", value: ["none"] } },
      priorities: { topGoals: { status: "answered", value: ["digital"] } },
    });
    const actions = generateDailyActions(assessment, catalog, "2026-10-19");
    const title = actionTitle(actions[0]!, assessment, catalog);
    expect(title.toLowerCase()).not.toContain("submit the form");
    expect(title).toBe("Ask someone you trust to sit with you for this online form.");
    expect(actions[0]?.channel).toBe("online");
  });

  it("keeps done actions in history when today's open list is rebuilt", () => {
    const catalog = [entry({ id: "food", categories: ["food"] })];
    const assessment = draft({
      financial: { consent: "granted", foodSecurity: { status: "answered", value: "often_not_enough" } },
      priorities: { topGoals: { status: "answered", value: ["food"] } },
    });
    const [first] = generateDailyActions(assessment, catalog, "2026-10-19");
    const done: MicroAction = { ...first!, status: "done", completedAt: "2026-10-19T18:00:00.000Z" };
    const rebuilt = rebuildToday([done], assessment, catalog, "2026-10-19");
    expect(rebuilt.find((action) => action.id === done.id)?.status).toBe("done");
    expect(rebuilt.filter((action) => action.status === "open").some((action) => action.id === done.id)).toBe(false);
  });
});

describe("progress counts", () => {
  it("counts declined consent as the financial and health sections", () => {
    const assessment = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "declined" },
      household: {},
      priorities: {},
    });
    expect(sectionsVisited(assessment)).toBe(2);
  });

  it("counts an explicit skip and weekly completions", () => {
    const assessment = draft({
      sensitiveConsent: "declined",
      financial: { consent: "declined" },
      health: { consent: "declined" },
      household: { zip: { status: "skipped" } },
      educationEmployment: { highestEducation: { status: "skipped" } },
      transportation: { modes: { status: "skipped" } },
      digital: { access: { status: "skipped" } },
      priorities: { urgency: { status: "skipped" } },
    });
    const now = new Date(2026, 9, 21, 12);
    const actions: MicroAction[] = [
      {
        id: "this-week",
        localDate: "2026-10-19",
        ruleId: "R1",
        catalogId: null,
        missingFact: "zip",
        channel: "on_device",
        barrierNote: null,
        status: "done",
        completedAt: new Date(2026, 9, 19, 12).toISOString(),
      },
      {
        id: "last-week",
        localDate: "2026-10-12",
        ruleId: "R1",
        catalogId: null,
        missingFact: "zip",
        channel: "on_device",
        barrierNote: null,
        status: "done",
        completedAt: new Date(2026, 9, 18, 12).toISOString(),
      },
    ];
    const counts = progressCounts(assessment, [], actions, now);
    expect(counts.sectionsVisited).toBe(7);
    expect(counts.missingFacts).toBe(0);
    expect(counts.actionsDone).toBe(2);
    expect(counts.actionsDoneThisWeek).toBe(1);
  });
});
