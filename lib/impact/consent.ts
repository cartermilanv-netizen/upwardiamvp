import type { DatabaseSync, SqlValue } from "node:sqlite";
import {
  HOLDING_CITY,
  HOLDING_JURISDICTION_ID,
  HOLDING_ORGANIZATION_ID,
  PUBLIC_RESIDENT_ID,
} from "@/lib/impact/constants";
import { revokeAnalyticsSessions } from "@/lib/impact/resident-session";
import type { ConsentState } from "@/lib/impact/types";

const grantStamps: number[] = [];

export function resetConsentRateLimit(): void {
  grantStamps.length = 0;
}

function allowGrant(nowMs: number): boolean {
  const recent = grantStamps.filter((stamp) => nowMs - stamp < 60_000);
  grantStamps.length = 0;
  grantStamps.push(...recent);
  if (grantStamps.length >= 20) return false;
  grantStamps.push(nowMs);
  return true;
}

function text(value: SqlValue | undefined): string {
  return typeof value === "string" ? value : "";
}

export function saveConsent(
  db: DatabaseSync,
  input: {
    id: string;
    organizationId: string;
    jurisdictionId: string;
    city: string;
    consent: ConsentState;
    at: string;
  },
): void {
  const existing = db.prepare("SELECT id FROM residents WHERE id = ?").get(input.id) as Record<string, SqlValue> | undefined;
  if (!existing) {
    db.prepare(
      "INSERT INTO residents (id, organization_id, jurisdiction_id, city, analytics_consent, consent_granted_at, consent_withdrawn_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
    ).run(
      input.id,
      input.organizationId,
      input.jurisdictionId,
      input.city,
      input.consent,
      input.consent === "granted" ? input.at : null,
      input.consent === "withdrawn" ? input.at : null,
    );
    return;
  }
  if (input.consent === "granted") {
    db.prepare(
      "UPDATE residents SET analytics_consent = 'granted', consent_granted_at = ?, consent_withdrawn_at = NULL, deleted_at = NULL WHERE id = ?",
    ).run(input.at, input.id);
    return;
  }
  if (input.consent === "declined") {
    db.prepare("UPDATE residents SET analytics_consent = 'declined', consent_withdrawn_at = NULL WHERE id = ?").run(input.id);
    return;
  }
  db.prepare("UPDATE residents SET analytics_consent = 'withdrawn', consent_withdrawn_at = ? WHERE id = ?").run(input.at, input.id);
}

export function grantHoldingConsent(db: DatabaseSync, id: string, at: string): { ok: true } | { ok: false; error: string } {
  if (!PUBLIC_RESIDENT_ID.test(id)) return { ok: false, error: "That analytics id is not valid." };
  if (!allowGrant(Date.parse(at))) return { ok: false, error: "Too many consent updates. Try again in a minute." };
  saveConsent(db, {
    id,
    organizationId: HOLDING_ORGANIZATION_ID,
    jurisdictionId: HOLDING_JURISDICTION_ID,
    city: HOLDING_CITY,
    consent: "granted",
    at,
  });
  return { ok: true };
}

export function declineAnalyticsConsent(db: DatabaseSync, id: string, at: string): { ok: true } | { ok: false; error: string } {
  if (!PUBLIC_RESIDENT_ID.test(id)) return { ok: false, error: "That analytics id is not valid." };
  const existing = db.prepare("SELECT analytics_consent FROM residents WHERE id = ?").get(id) as Record<string, SqlValue> | undefined;
  if (existing && text(existing.analytics_consent) === "granted") {
    return { ok: false, error: "Use withdraw to turn analytics off." };
  }
  saveConsent(db, {
    id,
    organizationId: HOLDING_ORGANIZATION_ID,
    jurisdictionId: HOLDING_JURISDICTION_ID,
    city: HOLDING_CITY,
    consent: "declined",
    at,
  });
  revokeAnalyticsSessions(db, id);
  return { ok: true };
}

export function withdrawAnalyticsConsent(db: DatabaseSync, id: string, at: string): { ok: true } | { ok: false; error: string } {
  if (!PUBLIC_RESIDENT_ID.test(id)) return { ok: false, error: "That analytics id is not valid." };
  const existing = db.prepare("SELECT analytics_consent FROM residents WHERE id = ?").get(id) as Record<string, SqlValue> | undefined;
  if (!existing || text(existing.analytics_consent) !== "granted") {
    return { ok: false, error: "There is no analytics consent to withdraw." };
  }
  saveConsent(db, {
    id,
    organizationId: HOLDING_ORGANIZATION_ID,
    jurisdictionId: HOLDING_JURISDICTION_ID,
    city: HOLDING_CITY,
    consent: "withdrawn",
    at,
  });
  revokeAnalyticsSessions(db, id);
  return { ok: true };
}

export function deleteAnalyticsForResident(db: DatabaseSync, id: string, at: string): { ok: true } | { ok: false; error: string } {
  if (!PUBLIC_RESIDENT_ID.test(id)) return { ok: false, error: "That analytics id is not valid." };
  const existing = db.prepare("SELECT id FROM residents WHERE id = ?").get(id);
  if (!existing) return { ok: false, error: "There is no analytics record to delete." };
  for (const table of ["events", "outcomes", "barriers", "goals", "actions", "applications", "ingest_nonces", "analytics_sessions"]) {
    db.prepare(`DELETE FROM ${table} WHERE resident_id = ?`).run(id);
  }
  db.prepare(
    "UPDATE residents SET deleted_at = ?, city = '', analytics_consent = 'withdrawn', consent_withdrawn_at = COALESCE(consent_withdrawn_at, ?) WHERE id = ?",
  ).run(at, at, id);
  return { ok: true };
}
