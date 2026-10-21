import { createHmac, timingSafeEqual } from "node:crypto";
import type { DatabaseSync, SqlValue } from "node:sqlite";
import { hashToken } from "@/lib/impact/auth";
import { ANALYTICS_SESSION_HOURS, ingestSecret } from "@/lib/impact/constants";

type SessionClaims = { v: 1; residentId: string; exp: number };

function text(value: SqlValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function signPayload(purpose: "session" | "confirm", payload: string): string {
  return createHmac("sha256", ingestSecret()).update(`${purpose}.${payload}`).digest("base64url");
}

export function signConfirmation(payload: string): string {
  return signPayload("confirm", payload);
}

function signaturesMatch(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueAnalyticsSession(
  db: DatabaseSync,
  residentId: string,
  nowIso: string,
): { ok: true; token: string } | { ok: false; error: string } {
  if (residentId.startsWith("demo-")) {
    return { ok: false, error: "Demonstration residents cannot open an analytics session." };
  }
  const resident = db.prepare("SELECT analytics_consent, deleted_at, consent_withdrawn_at FROM residents WHERE id = ?").get(residentId) as
    | Record<string, SqlValue>
    | undefined;
  if (!resident || text(resident.analytics_consent) !== "granted" || resident.deleted_at || resident.consent_withdrawn_at) {
    return { ok: false, error: "Analytics consent is required." };
  }
  const exp = Date.parse(nowIso) + ANALYTICS_SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ v: 1, residentId, exp } satisfies SessionClaims)).toString("base64url");
  const token = `${payload}.${signPayload("session", payload)}`;
  const expiresAt = new Date(exp).toISOString();
  db.prepare("INSERT INTO analytics_sessions (id, token_hash, resident_id, issued_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    hashToken(token),
    hashToken(token),
    residentId,
    nowIso,
    expiresAt,
  );
  return { ok: true, token };
}

export function readAnalyticsSession(
  db: DatabaseSync,
  token: string,
  nowIso: string,
): { ok: true; residentId: string } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "Authentication required." };
  if (!signaturesMatch(parts[1], signPayload("session", parts[0]))) return { ok: false, error: "Authentication required." };
  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as SessionClaims;
  } catch {
    return { ok: false, error: "Authentication required." };
  }
  if (claims.v !== 1 || typeof claims.residentId !== "string" || typeof claims.exp !== "number") {
    return { ok: false, error: "Authentication required." };
  }
  if (!Number.isFinite(claims.exp) || claims.exp <= Date.parse(nowIso)) return { ok: false, error: "Authentication required." };
  const stored = db.prepare("SELECT resident_id, expires_at FROM analytics_sessions WHERE token_hash = ?").get(hashToken(token)) as
    | Record<string, SqlValue>
    | undefined;
  if (!stored || text(stored.resident_id) !== claims.residentId || text(stored.expires_at) <= nowIso) {
    return { ok: false, error: "Authentication required." };
  }
  const resident = db.prepare("SELECT analytics_consent, deleted_at, consent_withdrawn_at FROM residents WHERE id = ?").get(claims.residentId) as
    | Record<string, SqlValue>
    | undefined;
  if (!resident || text(resident.analytics_consent) !== "granted" || resident.deleted_at || resident.consent_withdrawn_at) {
    return { ok: false, error: "Analytics consent is required." };
  }
  return { ok: true, residentId: claims.residentId };
}

export function revokeAnalyticsSessions(db: DatabaseSync, residentId: string): void {
  db.prepare("DELETE FROM analytics_sessions WHERE resident_id = ?").run(residentId);
}
