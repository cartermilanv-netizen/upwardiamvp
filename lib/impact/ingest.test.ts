import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_LOGINS } from "@/lib/impact/catalog";
import {
  declineAnalyticsConsent,
  deleteAnalyticsForResident,
  grantHoldingConsent,
  resetConsentRateLimit,
  saveConsent,
  withdrawAnalyticsConsent,
} from "@/lib/impact/consent";
import { SYNTHETIC_EVENT_ID, SYNTHETIC_RESIDENT_ID } from "@/lib/impact/constants";
import { authenticateUser, closeDb, loadFacts, openDatabase } from "@/lib/impact/db";
import { ingestResidentEvent, issueServerConfirmation } from "@/lib/impact/ingest";
import { tally } from "@/lib/impact/metrics";
import { buildImpactReport } from "@/lib/impact/report";
import { issueAnalyticsSession } from "@/lib/impact/resident-session";
import type { Principal } from "@/lib/impact/types";
import type { DatabaseSync, SqlValue } from "node:sqlite";

const now = "2026-10-21T15:00:00.000Z";
const residentId = `res_${"ab".repeat(16)}`;
const cedarId = `res_${"cd".repeat(16)}`;

function nonce(): string {
  return randomBytes(16).toString("hex");
}

function count(db: DatabaseSync, sql: string, ...params: SqlValue[]): number {
  const row = db.prepare(sql).get(...params) as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

describe("resident analytics ingest", () => {
  let db: DatabaseSync;
  let token = "";

  beforeAll(() => {
    resetConsentRateLimit();
    const dir = mkdtempSync(path.join(tmpdir(), "upwardia-ingest-"));
    db = openDatabase(path.join(dir, "impact.sqlite"));
    saveConsent(db, {
      id: residentId,
      organizationId: "org_harborlight",
      jurisdictionId: "jur_harbor",
      city: "North Harbor",
      consent: "granted",
      at: now,
    });
    const session = issueAnalyticsSession(db, residentId, now);
    if (!session.ok) throw new Error(session.error);
    token = session.token;
  });

  afterAll(() => {
    closeDb(db);
  });

  it("refuses tracking without consent and keeps a denial from opening a session", () => {
    const denied = `res_${"ef".repeat(16)}`;
    expect(issueAnalyticsSession(db, denied, now).ok).toBe(false);
    expect(declineAnalyticsConsent(db, denied, now).ok).toBe(true);
    expect(issueAnalyticsSession(db, denied, now).ok).toBe(false);
    const before = count(db, "SELECT COUNT(*) AS n FROM events WHERE resident_id = ?", denied);
    const result = ingestResidentEvent(
      db,
      token,
      {
        type: "need_selected",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "rent-assistance",
      },
      { now },
    );
    expect(result.ok).toBe(true);
    expect(count(db, "SELECT COUNT(*) AS n FROM events WHERE resident_id = ?", denied)).toBe(before);
    expect(issueAnalyticsSession(db, "demo-r-0001", now).ok).toBe(false);
  });

  it("accepts a granted resident, collapses duplicates, and rejects a replayed nonce", () => {
    const actionId = "action-live-food";
    const body = {
      type: "action_started",
      occurredAt: now,
      sentAt: now,
      nonce: nonce(),
      needId: "food-groceries",
      actionId,
    };
    const first = ingestResidentEvent(db, token, body, { now });
    const second = ingestResidentEvent(db, token, { ...body, nonce: nonce() }, { now });
    expect(first.ok && first.status).toBe("accepted");
    expect(second.ok && second.status).toBe("duplicate");
    expect(count(db, "SELECT COUNT(*) AS n FROM events WHERE action_id = ?", actionId)).toBe(1);
    const replay = ingestResidentEvent(db, token, body, { now });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.status).toBe(409);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    const forged = ingestResidentEvent(db, tampered, { ...body, nonce: nonce(), actionId: "action-forged" }, { now });
    expect(forged.ok).toBe(false);
    if (!forged.ok) expect(forged.status).toBe(401);
  });

  it("attributes the need and does not treat a view or a click as a verified outcome", () => {
    const viewed = ingestResidentEvent(
      db,
      token,
      { type: "resource_viewed", occurredAt: now, sentAt: now, nonce: nonce(), needId: "food-groceries", resourceId: "res_market" },
      { now },
    );
    const clicked = ingestResidentEvent(
      db,
      token,
      { type: "need_selected", occurredAt: now, sentAt: now, nonce: nonce(), needId: "rent-assistance" },
      { now },
    );
    expect(viewed.ok).toBe(true);
    expect(clicked.ok).toBe(true);
    const stored = db.prepare("SELECT source, server_confirmed FROM events WHERE event_type = 'resource_viewed' AND resident_id = ?").get(residentId) as {
      source: string;
      server_confirmed: number;
    };
    expect(stored).toEqual({ source: "resident_event", server_confirmed: 0 });
    const sensitive = ingestResidentEvent(
      db,
      token,
      { type: "need_selected", occurredAt: now, sentAt: now, nonce: nonce(), needId: "utilities", income: "20000", ssn: "123-45-6789" },
      { now },
    );
    expect(sensitive.ok).toBe(false);
    if (!sensitive.ok) expect(sensitive.status).toBe(400);
  });

  it("keeps application and outcome status rules, including server confirmation", () => {
    const applicationId = "application-live-food";
    const started = ingestResidentEvent(
      db,
      token,
      {
        type: "application_started",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        applicationId,
        programId: "prog_market",
      },
      { now },
    );
    const drafted = ingestResidentEvent(
      db,
      token,
      {
        type: "application_draft_saved",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        applicationId,
        programId: "prog_market",
      },
      { now },
    );
    const unconfirmed = ingestResidentEvent(
      db,
      token,
      {
        type: "application_submitted_confirmed",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        applicationId,
        programId: "prog_market",
      },
      { now },
    );
    expect(started.ok && drafted.ok).toBe(true);
    expect(unconfirmed.ok).toBe(false);
    const draftStatus = db.prepare("SELECT status FROM applications WHERE id = ?").get(applicationId) as { status: string };
    expect(draftStatus.status).toBe("draft_saved");
    const confirmation = issueServerConfirmation(
      { residentId, type: "application_submitted_confirmed", subjectId: applicationId },
      now,
    );
    const confirmed = ingestResidentEvent(
      db,
      token,
      {
        type: "application_submitted_confirmed",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        applicationId,
        programId: "prog_market",
        confirmationToken: confirmation,
      },
      { now },
    );
    expect(confirmed.ok).toBe(true);
    const application = db.prepare("SELECT status FROM applications WHERE id = ?").get(applicationId) as { status: string };
    expect(application.status).toBe("submitted_confirmed");

    const outcomeId = "outcome-live-food";
    const reported = ingestResidentEvent(
      db,
      token,
      {
        type: "outcome_reported",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        outcomeId,
        outcomeType: "food_access",
        objectiveId: "NWS-01",
        phase: "follow_up",
        indicator: "positive",
        followUpIntervalDays: 90,
      },
      { now },
    );
    const fakeVerified = ingestResidentEvent(
      db,
      token,
      {
        type: "outcome_verified",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        outcomeId,
        outcomeType: "food_access",
        objectiveId: "NWS-01",
        phase: "follow_up",
        indicator: "positive",
        followUpIntervalDays: 90,
        verificationMethod: "partner_roster_check",
        verificationSource: "partner_notice",
      },
      { now },
    );
    expect(reported.ok).toBe(true);
    expect(fakeVerified.ok).toBe(false);
    const proof = issueServerConfirmation(
      {
        residentId,
        type: "outcome_verified",
        subjectId: outcomeId,
        method: "partner_roster_check",
        source: "partner_notice",
      },
      now,
    );
    const verified = ingestResidentEvent(
      db,
      token,
      {
        type: "outcome_verified",
        occurredAt: now,
        sentAt: now,
        nonce: nonce(),
        needId: "food-groceries",
        outcomeId,
        outcomeType: "food_access",
        objectiveId: "NWS-01",
        phase: "follow_up",
        indicator: "positive",
        followUpIntervalDays: 90,
        verificationMethod: "partner_roster_check",
        verificationSource: "partner_notice",
        confirmationToken: proof,
      },
      { now },
    );
    expect(verified.ok).toBe(true);
    const outcome = db.prepare("SELECT evidence, source FROM outcomes WHERE id = ?").get(outcomeId) as { evidence: string; source: string };
    expect(outcome).toEqual({ evidence: "verified", source: "externally_verified_outcome" });
    const reportEvent = db.prepare("SELECT source FROM events WHERE event_type = 'outcome_reported' AND outcome_id = ?").get(outcomeId) as {
      source: string;
    };
    const verifiedEvent = db.prepare("SELECT source, server_confirmed FROM events WHERE event_type = 'outcome_verified' AND outcome_id = ?").get(outcomeId) as {
      source: string;
      server_confirmed: number;
    };
    expect(reportEvent.source).toBe("self_reported_outcome");
    expect(verifiedEvent).toEqual({ source: "externally_verified_outcome", server_confirmed: 1 });
  });

  it("rate limits a resident and drops events after withdrawal or deletion", () => {
    const limited = ingestResidentEvent(
      db,
      token,
      { type: "need_selected", occurredAt: now, sentAt: now, nonce: nonce(), needId: "utilities" },
      { now, rateLimit: 1 },
    );
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.status).toBe(429);

    expect(withdrawAnalyticsConsent(db, SYNTHETIC_RESIDENT_ID, now).ok).toBe(false);
    expect(withdrawAnalyticsConsent(db, residentId, now).ok).toBe(true);
    const afterWithdraw = ingestResidentEvent(
      db,
      token,
      { type: "need_selected", occurredAt: now, sentAt: now, nonce: nonce(), needId: "utilities" },
      { now },
    );
    expect(afterWithdraw.ok).toBe(false);
    if (!afterWithdraw.ok) expect([401, 403]).toContain(afterWithdraw.status);
    expect(count(db, "SELECT COUNT(*) AS n FROM events WHERE resident_id = ?", residentId)).toBeGreaterThan(0);

    expect(deleteAnalyticsForResident(db, residentId, now).ok).toBe(true);
    expect(count(db, "SELECT COUNT(*) AS n FROM events WHERE resident_id = ?", residentId)).toBe(0);
    expect(count(db, "SELECT COUNT(*) AS n FROM outcomes WHERE resident_id = ?", residentId)).toBe(0);
    expect(count(db, "SELECT COUNT(*) AS n FROM applications WHERE resident_id = ?", residentId)).toBe(0);
  });

  it("keeps demo and live totals apart and inside role boundaries", () => {
    saveConsent(db, {
      id: cedarId,
      organizationId: "org_cedar",
      jurisdictionId: "jur_cedar",
      city: "Cedar Flats",
      consent: "granted",
      at: now,
    });
    const cedarSession = issueAnalyticsSession(db, cedarId, now);
    if (!cedarSession.ok) throw new Error(cedarSession.error);
    const cedarEvent = ingestResidentEvent(
      db,
      cedarSession.token,
      { type: "action_started", occurredAt: now, sentAt: now, nonce: nonce(), needId: "affordable-housing", actionId: "action-cedar-live" },
      { now },
    );
    expect(cedarEvent.ok).toBe(true);

    const superAdmin = signIn(db, "super@impact.demo");
    const harborlight = signIn(db, "harborlight@impact.demo");
    const government = signIn(db, "harbor.partner@impact.demo");
    const cedarAdmin: Principal = {
      userId: "cedar-test",
      email: "cedar-test",
      displayName: "Cedar test",
      role: "organization_admin",
      organizationId: "org_cedar",
      jurisdictionId: "jur_cedar",
    };
    expect(loadFacts(db, harborlight).events.some((event) => event.residentId === cedarId)).toBe(false);
    expect(loadFacts(db, government).events.some((event) => event.residentId === cedarId)).toBe(false);
    expect(loadFacts(db, cedarAdmin).events.some((event) => event.id === SYNTHETIC_EVENT_ID)).toBe(false);
    expect(loadFacts(db, superAdmin).events.some((event) => event.id === SYNTHETIC_EVENT_ID)).toBe(true);

    const demo = buildImpactReport(db, superAdmin, { dataset: "demo" }, now);
    const live = buildImpactReport(db, superAdmin, { dataset: "live" }, now);
    expect(demo.participating.value).toBe(172);
    expect(demo.separation.demo.value).toBe(172);
    expect(demo.separation.live.suppressed).toBe(true);
    expect(demo.separation.live.value).toBeNull();
    expect(live.participating).toEqual({ value: null, suppressed: true });
    expect(live.populationHidden).toBe(true);
    expect(live.disclaimer).toBe("Synthetic test activity. Not real residents.");

    const holdingId = `res_${"a1".repeat(16)}`;
    expect(grantHoldingConsent(db, holdingId, now).ok).toBe(true);
    const holdingSession = issueAnalyticsSession(db, holdingId, now);
    if (!holdingSession.ok) throw new Error(holdingSession.error);
    const holdingEvent = ingestResidentEvent(
      db,
      holdingSession.token,
      { type: "need_selected", occurredAt: now, sentAt: now, nonce: nonce(), needId: "health-insurance" },
      { now },
    );
    expect(holdingEvent.ok).toBe(true);
    expect(loadFacts(db, superAdmin).events.some((event) => event.residentId === holdingId)).toBe(false);
    expect(count(db, "SELECT COUNT(*) AS n FROM events WHERE resident_id = ?", holdingId)).toBe(1);

    const facts = loadFacts(db, superAdmin);
    const counted = tally({
      residents: facts.residents,
      events: facts.events,
      outcomes: facts.outcomes,
      barriers: facts.barriers,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-10-21T23:59:59.000Z",
      city: null,
      jurisdictionId: null,
      programId: null,
      category: null,
      cities: ["North Harbor", "Cedar Flats"],
      categories: ["food", "housing"],
      barrierIds: [],
      dataset: "live",
      needs: [
        { id: "food-groceries", label: "Food and groceries" },
        { id: "affordable-housing", label: "Affordable housing" },
        { id: "rent-assistance", label: "Rent assistance" },
      ],
    });
    expect(counted.needs.find((need) => need.id === "affordable-housing")?.n).toBe(1);
    expect(counted.needs.find((need) => need.id === "food-groceries")?.n).toBe(1);
    expect(counted.needs.find((need) => need.id === "rent-assistance")?.n).toBe(0);
    expect(counted.outcomesVerified).toBe(0);
  });
});

function signIn(db: DatabaseSync, email: string): Principal {
  const login = DEMO_LOGINS.find((item) => item.email === email);
  if (!login) throw new Error(email);
  const principal = authenticateUser(db, login.email, login.password);
  if (!principal) throw new Error(email);
  return principal;
}
