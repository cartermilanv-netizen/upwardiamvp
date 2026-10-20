import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublishedFacts, loadResourceCatalog } from "@/lib/resource-database/load";
import { checkSource, priorFromCatalogSource } from "@/lib/resource-database/monitor/check";
import { cleanHtml } from "@/lib/resource-database/monitor/clean";
import { compareCleaned } from "@/lib/resource-database/monitor/compare";
import { sha256 } from "@/lib/resource-database/monitor/hash";
import { judgeBody } from "@/lib/resource-database/monitor/retrieve";
import { decideWrite, restoreFields } from "@/lib/resource-database/monitor/review";
import { robotsAllows } from "@/lib/resource-database/monitor/robots";
import type { CheckRecord, FieldSnapshot, Observation, Proposal, SourceSnapshot } from "@/lib/resource-database/monitor/types";
import type { FieldClass } from "@/lib/resource-database/monitor/types";

const PAGE = "https://dpss.lacounty.gov/en/food/calfresh.html";

function snapshot(cleanedText: string | null, id = "prior-test"): SourceSnapshot {
  return {
    id,
    sourceId: "source-test",
    url: PAGE,
    retrievedOn: "2026-10-20",
    httpStatus: cleanedText === null ? null : 200,
    contentRetrieved: cleanedText !== null,
    bodyRetained: cleanedText !== null,
    cleanedText,
    byteLength: cleanedText === null ? null : cleanedText.length,
    sha256: cleanedText === null ? null : "prior-hash",
    notes: "Fixture snapshot.",
  };
}

function observation(cleanedText: string | null, failureKind: Observation["failureKind"] = null): Observation {
  const fetched = cleanedText !== null && failureKind === null;
  return {
    id: "observation-test",
    sourceId: "source-test",
    url: PAGE,
    userAgent: "UpwardiaSourceMonitor/0.1",
    attemptedOn: "2026-10-20",
    observedAt: "2026-10-20T05:30:00.000Z",
    outcome: fetched ? "fetched" : "failed",
    failureKind: fetched ? null : (failureKind ?? "http_error"),
    httpStatus: fetched ? 200 : 403,
    contentRetrieved: fetched,
    finalUrl: fetched ? PAGE : null,
    cleanedText,
    byteLength: fetched ? 1200 : 180,
    sha256: fetched ? "next-hash" : null,
    lastModified: null,
    contentType: fetched ? "text/html" : null,
    robotsUrl: "https://dpss.lacounty.gov/robots.txt",
    robotsStatus: 200,
    robotsBody: "User-agent: *\nAllow: /\n",
    robotsDecision: "allow",
    robotsReason: "Allow / matches the path.",
    failureNote: fetched ? null : "Fixture failure.",
  };
}

function run(priorText: string | null, nextText: string | null, failureKind: Observation["failureKind"] = null): CheckRecord {
  return checkSource({
    prior: snapshot(priorText),
    observation: observation(nextText, failureKind),
    at: "2026-10-20T05:30:00.000Z",
    auditId: "audit-test",
    proposalId: "proposal-test",
    catalogSha256: "abc",
  });
}

function heldProposal(excerpt: string): Proposal {
  return {
    id: "proposal-test",
    status: "pending_human_approval",
    evidence: { observationId: "observation-test", excerpt, priorExcerpt: "Previous line." },
  };
}

describe("source monitor", () => {
  it("treats an unchanged page as no proposal", () => {
    const text = "Benefits are issued on an EBT card.\nCall (866) 613-3777.";
    const record = run(`${text}\n`, text);
    expect(record.comparisonKind).toBe("unchanged");
    expect(compareCleaned(text, `${text}\n`)).toBe("unchanged");
    expect(record.proposal).toEqual({ id: "proposal-test", status: "not_proposed", evidence: null });
    expect(record.audit.catalogWritten).toBe(false);
    expect(record.audit.writes).toEqual([]);
    expect(record.programClosed).toBe(false);
  });

  it("holds a substantive change for approval and does not overwrite a verified field", () => {
    const prior = "The minimum allotment for Federal Fiscal Year 2026-2027 is $25.";
    const next = "The minimum allotment for Federal Fiscal Year 2026-2027 is $30.";
    const record = run(prior, next);
    expect(record.comparisonKind).toBe("substantive");
    expect(record.proposal.status).toBe("pending_human_approval");
    expect(record.proposal.evidence?.excerpt).toBe(next);
    expect(record.proposal.evidence?.priorExcerpt).toBe(prior);
    expect(record.after.cleanedText).toContain(record.proposal.evidence?.excerpt ?? "");
    expect(record.audit.catalogWritten).toBe(false);
    expect(record.audit.writes).toEqual([]);
    expect(record.programClosed).toBe(false);

    const fetchedText = record.after.cleanedText;
    const classes: FieldClass[] = ["eligibility", "income", "deadline", "application_rule"];
    for (const fieldClass of classes) {
      expect(
        decideWrite({
          comparisonKind: "substantive",
          proposal: record.proposal,
          fetchedText,
          targetReviewStatus: "extracted_pending_review",
          fieldClass,
        }),
      ).toMatchObject({
        effect: "held",
        catalogWritten: false,
        programClosed: false,
        reason: "Eligibility, income, deadlines, and application rules stay pending human approval.",
      });
    }
    expect(
      decideWrite({
        comparisonKind: "substantive",
        proposal: record.proposal,
        fetchedText,
        targetReviewStatus: "human_verified",
        fieldClass: "other",
      }),
    ).toMatchObject({ effect: "refused", reason: "A verified field is not overwritten.", catalogWritten: false });
    expect(
      decideWrite({
        comparisonKind: "substantive",
        proposal: heldProposal("A sentence the page did not return."),
        fetchedText,
        targetReviewStatus: "extracted_pending_review",
        fieldClass: "other",
      }).effect,
    ).toBe("rejected");
  });

  it("records a cosmetic change without a proposal", () => {
    const prior = "Benefits are issued on an EBT card.";
    const next = "benefits   are issued on an EBT card";
    expect(compareCleaned(prior, next)).toBe("cosmetic");
    const record = run(prior, next);
    expect(record.comparisonKind).toBe("cosmetic");
    expect(record.proposal.status).toBe("not_proposed");
    expect(record.proposal.evidence).toBeNull();
    expect(record.before.cleanedText).toBe(prior);
    expect(record.after.cleanedText).toBe(next);
    expect(record.audit.catalogWritten).toBe(false);
    expect(record.audit.note).toMatch(/punctuation/i);
  });

  it("records a failed fetch as a failure, not a closure", () => {
    const fields: FieldSnapshot[] = [
      { recordId: "program", field: "openingStatus", value: "Applications are being accepted." },
      { recordId: "program", field: "closingStatus", value: null },
    ];
    const record = run("Benefits are issued on an EBT card.", null, "http_error");
    expect(record.comparisonKind).toBe("fetch_failed");
    expect(record.after.outcome).toBe("failed");
    expect(record.after.cleanedText).toBeNull();
    expect(record.proposal.status).toBe("not_proposed");
    expect(record.programClosed).toBe(false);
    expect(record.audit.programClosed).toBe(false);
    expect(record.audit.catalogWritten).toBe(false);
    expect(record.audit.writes).toEqual([]);
    expect(record.audit.note).toMatch(/not a program closure/i);
    expect(restoreFields(fields, record.audit.writes)).toEqual(fields);
    expect(
      decideWrite({
        comparisonKind: record.comparisonKind,
        proposal: record.proposal,
        fetchedText: null,
        targetReviewStatus: "extracted_pending_review",
        fieldClass: "other",
      }),
    ).toMatchObject({ effect: "not_proposed", programClosed: false });

    const interstitial = judgeBody({
      httpStatus: 200,
      byteLength: 212,
      body: "<html><head><meta name=\"robots\" content=\"noindex\"><title>Incapsula</title></head><body></body></html>",
    });
    expect(interstitial).toEqual({ contentRetrieved: false, failureKind: "interstitial" });
    const denied = judgeBody({ httpStatus: 403, byteLength: 500, body: "<html><title>Error</title><body>no</body></html>" });
    expect(denied).toEqual({ contentRetrieved: false, failureKind: "http_error" });
  });

  it("drops navigation, ads, and the document head before comparing", () => {
    const html = [
      "<html><head><title>Program</title><meta name=\"description\" content=\"Hidden blurb\"></head>",
      "<body><header><nav>Menu link</nav></header>",
      "<div class=\"advertisement\">Sponsored offer</div>",
      "<main><p>Benefits are issued on an EBT card.</p><p>Call (866) 613-3777.</p></main>",
      "<footer><p>All rights reserved</p><a>Contact Webmaster</a></footer></body></html>",
    ].join("");
    expect(cleanHtml(html)).toBe("Benefits are issued on an EBT card.\nCall (866) 613-3777.");
  });

  it("rolls a simulated write back to the previous value", () => {
    const current: FieldSnapshot[] = [{ recordId: "program", field: "closingStatus", value: "closed" }];
    const restored = restoreFields(current, [
      { recordId: "program", field: "closingStatus", previous: null, next: "closed" },
    ]);
    expect(restored).toEqual([{ recordId: "program", field: "closingStatus", value: null }]);
  });

  it("allows the program path in the current robots file and blocks a disallowed path", () => {
    const robots = "User-agent: *\nAllow: /\n\nSitemap:https://dpss.lacounty.gov/sitemap.xml\n";
    expect(robotsAllows(robots, "/en/food/calfresh.html", "UpwardiaSourceMonitor/0.1").decision).toBe("allow");
    const blocked = "User-agent: *\nDisallow: /private\nAllow: /private/public\n";
    expect(robotsAllows(blocked, "/private/page", "UpwardiaSourceMonitor/0.1").decision).toBe("disallow");
    expect(robotsAllows(blocked, "/private/public/form", "UpwardiaSourceMonitor/0.1").decision).toBe("allow");
    expect(robotsAllows("<html><title>Incapsula</title></html>", "/en/food/calfresh.html", "UpwardiaSourceMonitor/0.1").decision).toBe(
      "unavailable",
    );
  });
});

describe("stored source check", () => {
  const proofDir = path.join(process.cwd(), "lib/resource-database/monitor/proof");
  const prior = JSON.parse(readFileSync(path.join(proofDir, "prior.json"), "utf8")) as SourceSnapshot;
  const observation = JSON.parse(readFileSync(path.join(proofDir, "observation.json"), "utf8")) as Observation;
  const record = JSON.parse(readFileSync(path.join(proofDir, "record.json"), "utf8")) as CheckRecord;

  it("matches the stored check and does not record a catalog write", () => {
    const catalogPath = path.join(process.cwd(), "lib/resource-database/seed/catalog.json");
    const catalogBytes = readFileSync(catalogPath);
    const recomputed = checkSource({
      prior,
      observation,
      at: record.audit.at,
      auditId: record.audit.id,
      proposalId: record.proposal.id,
      catalogSha256: record.audit.catalogSha256,
    });
    expect(recomputed).toEqual(record);
    expect(record.audit.catalogSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(catalogBytes)).toMatch(/^[a-f0-9]{64}$/);
    expect(record.audit.catalogWritten).toBe(false);
    expect(record.audit.writes).toEqual([]);
    expect(record.programClosed).toBe(false);
    expect(prior.url).toBe(observation.url);
    expect(new URL(observation.url).hostname).toBe("dpss.lacounty.gov");
    expect(observation.url).toBe(PAGE);
    expect(robotsAllows(observation.robotsBody ?? "", new URL(observation.url).pathname, observation.userAgent).decision).toBe(
      observation.robotsDecision,
    );
    if (observation.outcome === "fetched") {
      expect(observation.contentRetrieved).toBe(true);
      expect(observation.cleanedText).toContain("Federal Fiscal Year 2026-2027 is $25");
      expect(observation.cleanedText).not.toMatch(/Contact Webmaster|All rights reserved|Privacy Policy/);
      expect(record.comparisonKind === "no_prior_text" || record.comparisonKind === "unchanged" || record.comparisonKind === "cosmetic" || record.comparisonKind === "substantive").toBe(true);
    } else {
      expect(record.comparisonKind).toBe("fetch_failed");
      expect(record.proposal.status).toBe("not_proposed");
      expect(observation.cleanedText).toBeNull();
    }
    expect(record.proposal.status === "pending_human_approval" ? record.proposal.evidence !== null : record.proposal.evidence === null).toBe(true);
    if (record.proposal.evidence) {
      expect(observation.cleanedText).toContain(record.proposal.evidence.excerpt);
    }
    const catalog = loadResourceCatalog();
    const seeded = catalog.sources.find((source) => source.url === PAGE);
    expect(priorFromCatalogSource(seeded!, "prior-1").bodyRetained).toBe(false);
    const facts = loadPublishedFacts();
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.some((fact) => fact.recordId === "medi-cal" || fact.recordId.includes("bmh"))).toBe(false);
    expect(catalog.programs.filter((program) => program.publicationStatus === "published").map((program) => program.id)).toEqual([
      "la-county-dpss-calfresh",
      "california-wic",
    ]);
    expect(catalog.programs.filter((program) => program.publicationStatus === "unpublished").map((program) => program.id)).toEqual([
      "medi-cal",
      "santa-monica-below-market-housing",
    ]);
  });
});
