import { randomBytes, timingSafeEqual } from "node:crypto";
import type { DatabaseSync, SqlValue } from "node:sqlite";
import { residentCatalog } from "@/lib/catalog";
import { PROGRAMS, RESOURCES } from "@/lib/impact/catalog";
import { EVENT_RETENTION_DAYS, INGEST_RATE_LIMIT, INGEST_RATE_WINDOW_MS, INGEST_WINDOW_MS } from "@/lib/impact/constants";
import { idempotencyKey } from "@/lib/impact/idempotency";
import { categoryForNeed, isResourceNeedId, objectivesForNeed } from "@/lib/impact/needs";
import { readAnalyticsSession, signConfirmation } from "@/lib/impact/resident-session";
import {
  EVENT_TYPES,
  HP_OBJECTIVE_IDS,
  OUTCOME_TYPES,
  type ApplicationStatus,
  type EventSource,
  type EventType,
  type HpObjectiveId,
  type OutcomeType,
} from "@/lib/impact/types";

const ALLOWED_KEYS = new Set([
  "type",
  "occurredAt",
  "needId",
  "resourceId",
  "programId",
  "goalId",
  "actionId",
  "applicationId",
  "outcomeId",
  "sessionId",
  "nonce",
  "sentAt",
  "confirmationToken",
  "outcomeType",
  "objectiveId",
  "phase",
  "indicator",
  "followUpIntervalDays",
  "verificationMethod",
  "verificationSource",
]);

const BANNED_KEY = /income|ssn|social|transcript|diagnosis|immigrat|dob|street|answer|message|chat|paystub|household|password|email|name/i;
const SSN = /\b\d{3}-?\d{2}-?\d{4}\b/;
const ID = /^[a-z0-9_-]{4,64}$/;
const NONCE = /^[a-f0-9]{16,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const VERIFICATION_METHODS = new Set(["partner_roster_check", "agency_notice", "provider_confirmation"]);
const VERIFICATION_SOURCES = new Set(["partner_notice", "agency_file", "care_provider"]);
const NEEDS_EVENT = new Set<EventType>([
  "need_selected",
  "resource_viewed",
  "resource_saved",
  "action_started",
  "action_completed",
  "application_started",
  "application_draft_saved",
  "application_submitted_confirmed",
  "goal_completed",
  "outcome_reported",
  "outcome_verified",
]);

type IngestOptions = { now?: string; rateLimit?: number; eventId?: string };

export type IngestResult =
  | { ok: true; status: "accepted" | "duplicate"; eventId: string }
  | { ok: false; status: number; error: string };

type ConfirmClaims = {
  v: 1;
  residentId: string;
  type: "application_submitted_confirmed" | "outcome_verified";
  subjectId: string;
  method: string;
  source: string;
  exp: number;
};

type Body = Record<string, string | number>;

function fail(status: number, error: string): { ok: false; status: number; error: string } {
  return { ok: false, status, error };
}

function text(value: SqlValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function optional(body: Body, key: string): string | null {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

function knownResource(id: string): boolean {
  return RESOURCES.some((item) => item.id === id) || residentCatalog.some((item) => item.id === id);
}

function knownProgram(id: string): boolean {
  return PROGRAMS.some((item) => item.id === id) || residentCatalog.some((item) => item.id === id);
}

export function issueServerConfirmation(
  input: {
    residentId: string;
    type: "application_submitted_confirmed" | "outcome_verified";
    subjectId: string;
    method?: string;
    source?: string;
  },
  nowIso: string,
): string {
  const claims: ConfirmClaims = {
    v: 1,
    residentId: input.residentId,
    type: input.type,
    subjectId: input.subjectId,
    method: input.method ?? "",
    source: input.source ?? "",
    exp: Date.parse(nowIso) + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signConfirmation(payload)}`;
}

function readConfirmation(token: string, nowMs: number): ConfirmClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = signConfirmation(parts[0]);
  const left = Buffer.from(parts[1]);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as ConfirmClaims;
    if (claims.v !== 1 || !Number.isFinite(claims.exp) || claims.exp <= nowMs) return null;
    return claims;
  } catch {
    return null;
  }
}

function parseBody(input: unknown): { ok: true; body: Body } | { ok: false; status: number; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail(400, "Payload must be an object.");
  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key) || BANNED_KEY.test(key)) return fail(400, "That field cannot be stored.");
  }
  const body: Body = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue;
    if (key === "followUpIntervalDays") {
      if (typeof value !== "number" || !Number.isFinite(value)) return fail(400, "Follow-up interval must be 90 days.");
      body[key] = value;
      continue;
    }
    if (typeof value !== "string") return fail(400, "That field cannot be stored.");
    if (key === "confirmationToken") {
      if (value.length < 20 || value.length > 600 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
        return fail(400, "Server confirmation is required.");
      }
      body[key] = value;
      continue;
    }
    if (value.length > 80 || SSN.test(value) || value.includes("@")) return fail(400, "That field cannot be stored.");
    body[key] = value;
  }
  return { ok: true, body };
}

function statusRank(status: ApplicationStatus): number {
  if (status === "submitted_confirmed") return 3;
  if (status === "draft_saved") return 2;
  return 1;
}

function applicationStatus(value: string): ApplicationStatus {
  if (value === "draft_saved" || value === "submitted_confirmed") return value;
  return "started";
}

export function ingestResidentEvent(db: DatabaseSync, token: string, input: unknown, options: IngestOptions = {}): IngestResult {
  const parsed = parseBody(input);
  if (!parsed.ok) return parsed;
  const body = parsed.body;
  const nowIso = options.now ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const session = readAnalyticsSession(db, token, nowIso);
  if (!session.ok) return fail(session.error === "Analytics consent is required." ? 403 : 401, session.error);
  if (session.residentId.startsWith("demo-")) return fail(403, "Demonstration residents cannot record live events.");

  const sentAt = optional(body, "sentAt");
  const nonce = optional(body, "nonce");
  const occurredAt = optional(body, "occurredAt");
  const type = optional(body, "type");
  if (!sentAt || !ISO.test(sentAt) || Math.abs(Date.parse(sentAt) - nowMs) > INGEST_WINDOW_MS) {
    return fail(400, "The request time is outside the allowed window.");
  }
  if (!nonce || !NONCE.test(nonce)) return fail(400, "The request nonce is not valid.");
  if (!occurredAt || !ISO.test(occurredAt)) return fail(400, "The event time is not valid.");
  const occurredMs = Date.parse(occurredAt);
  if (occurredMs > nowMs + INGEST_WINDOW_MS || occurredMs < nowMs - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000) {
    return fail(400, "The event time is outside the retention window.");
  }
  if (!type || !EVENT_TYPES.includes(type as EventType)) return fail(400, "That event type is not accepted.");
  const eventType = type as EventType;

  const resident = db
    .prepare(
      "SELECT organization_id, jurisdiction_id, city, analytics_consent, consent_granted_at, consent_withdrawn_at, deleted_at FROM residents WHERE id = ?",
    )
    .get(session.residentId) as Record<string, SqlValue> | undefined;
  if (!resident || text(resident.analytics_consent) !== "granted" || resident.deleted_at || resident.consent_withdrawn_at) {
    return fail(403, "Analytics consent is required.");
  }
  const consentedAt = text(resident.consent_granted_at);
  if (!consentedAt || occurredAt < consentedAt) return fail(403, "Analytics consent is required.");

  const limit = options.rateLimit ?? INGEST_RATE_LIMIT;
  const since = new Date(nowMs - INGEST_RATE_WINDOW_MS).toISOString();
  const recent = db.prepare("SELECT COUNT(*) AS n FROM ingest_nonces WHERE resident_id = ? AND received_at >= ?").get(session.residentId, since) as
    | Record<string, SqlValue>
    | undefined;
  if (Number(recent?.n ?? 0) >= limit) return fail(429, "Too many events. Try again in a minute.");

  const needValue = optional(body, "needId");
  if (NEEDS_EVENT.has(eventType)) {
    if (!needValue || !isResourceNeedId(needValue)) return fail(400, "The need is not in the resource list.");
  } else if (needValue && !isResourceNeedId(needValue)) {
    return fail(400, "The need is not in the resource list.");
  }
  const needId = needValue && isResourceNeedId(needValue) ? needValue : null;
  const category = needId ? categoryForNeed(needId) : null;
  const resourceId = optional(body, "resourceId");
  const programId = optional(body, "programId");
  const actionId = optional(body, "actionId");
  const applicationId = optional(body, "applicationId");
  const goalId = optional(body, "goalId");
  const outcomeId = optional(body, "outcomeId");
  const sessionId = optional(body, "sessionId");
  if (resourceId && (!ID.test(resourceId) || !knownResource(resourceId))) return fail(400, "That resource is not recognized.");
  if (programId && (!ID.test(programId) || !knownProgram(programId))) return fail(400, "That program is not recognized.");
  if ((eventType === "resource_viewed" || eventType === "resource_saved") && !resourceId) return fail(400, "A resource id is required.");
  if ((eventType === "action_started" || eventType === "action_completed") && (!actionId || !ID.test(actionId))) {
    return fail(400, "An action id is required.");
  }
  if (eventType.startsWith("application_") && (!applicationId || !ID.test(applicationId) || !programId)) {
    return fail(400, "An application id and program id are required.");
  }
  if (eventType === "goal_completed" && (!goalId || !ID.test(goalId))) return fail(400, "A goal id is required.");
  if ((eventType === "outcome_reported" || eventType === "outcome_verified") && (!outcomeId || !ID.test(outcomeId))) {
    return fail(400, "An outcome id is required.");
  }
  if (eventType === "chat_session_started" && (!sessionId || !ID.test(sessionId))) return fail(400, "A session id is required.");
  for (const value of [actionId, applicationId, goalId, outcomeId, sessionId]) {
    if (value && !ID.test(value)) return fail(400, "An id is not valid.");
  }

  let objectiveId: HpObjectiveId | null = null;
  let outcomeType: OutcomeType | null = null;
  let phase: "baseline" | "follow_up" | null = null;
  let indicator: "positive" | "negative" | null = null;
  let verificationMethod: string | null = null;
  let verificationSource: string | null = null;
  let serverConfirmed = false;
  if (eventType === "outcome_reported" || eventType === "outcome_verified") {
    if (!needId) return fail(400, "The need is not in the resource list.");
    const outcomeName = optional(body, "outcomeType");
    if (!outcomeName || !OUTCOME_TYPES.includes(outcomeName as OutcomeType)) return fail(400, "That outcome type is not accepted.");
    outcomeType = outcomeName as OutcomeType;
    const phaseName = optional(body, "phase");
    const indicatorName = optional(body, "indicator");
    if (phaseName !== "baseline" && phaseName !== "follow_up") return fail(400, "The outcome phase is not valid.");
    if (indicatorName !== "positive" && indicatorName !== "negative") return fail(400, "The outcome indicator is not valid.");
    if (body.followUpIntervalDays !== 90) return fail(400, "Follow-up interval must be 90 days.");
    phase = phaseName;
    indicator = indicatorName;
    const requestedObjective = optional(body, "objectiveId");
    const allowed = objectivesForNeed(needId);
    if (requestedObjective) {
      if (!HP_OBJECTIVE_IDS.includes(requestedObjective as HpObjectiveId) || !allowed.includes(requestedObjective as HpObjectiveId)) {
        return fail(400, "That objective is not mapped to this need.");
      }
      objectiveId = requestedObjective as HpObjectiveId;
    } else if (allowed.length === 1) {
      objectiveId = allowed[0] ?? null;
    }
    verificationMethod = optional(body, "verificationMethod");
    verificationSource = optional(body, "verificationSource");
    if (eventType === "outcome_reported" && (verificationMethod || verificationSource || body.confirmationToken)) {
      return fail(400, "A self-reported outcome cannot carry verification.");
    }
    if (eventType === "outcome_verified") {
      if (!verificationMethod || !VERIFICATION_METHODS.has(verificationMethod)) return fail(400, "A verification method is required.");
      if (!verificationSource || !VERIFICATION_SOURCES.has(verificationSource)) return fail(400, "A verification source is required.");
    }
  }

  if (eventType === "application_submitted_confirmed" || eventType === "outcome_verified") {
    const confirmationToken = optional(body, "confirmationToken");
    if (!confirmationToken) return fail(400, "Server confirmation is required.");
    const claims = readConfirmation(confirmationToken, nowMs);
    const subjectId = eventType === "outcome_verified" ? outcomeId : applicationId;
    if (
      !claims ||
      claims.residentId !== session.residentId ||
      claims.type !== eventType ||
      claims.subjectId !== subjectId ||
      claims.method !== (verificationMethod ?? "") ||
      claims.source !== (verificationSource ?? "")
    ) {
      return fail(400, "Server confirmation is required.");
    }
    serverConfirmed = true;
  }

  const source: EventSource =
    eventType === "outcome_reported" ? "self_reported_outcome" : eventType === "outcome_verified" ? "externally_verified_outcome" : "resident_event";
  const dedupeKey = idempotencyKey({
    type: eventType,
    residentId: session.residentId,
    occurredAt,
    resourceId,
    needId,
    actionId,
    applicationId,
    goalId,
    outcomeId,
    sessionId,
  });

  db.exec("SAVEPOINT impact_ingest");
  try {
    try {
      db.prepare("INSERT INTO ingest_nonces (nonce, resident_id, received_at) VALUES (?, ?, ?)").run(nonce, session.residentId, nowIso);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|constraint/i.test(message)) {
        db.exec("ROLLBACK TO impact_ingest");
        db.exec("RELEASE impact_ingest");
        return fail(409, "This request was already used.");
      }
      throw error;
    }
    const existing = db.prepare("SELECT id FROM events WHERE dedupe_key = ?").get(dedupeKey) as Record<string, SqlValue> | undefined;
    if (existing) {
      db.exec("RELEASE impact_ingest");
      return { ok: true, status: "duplicate", eventId: text(existing.id) };
    }
    const eventId = options.eventId && ID.test(options.eventId) ? options.eventId : `evt-${randomBytes(8).toString("hex")}`;
    db.prepare(
      `INSERT INTO events (
        id, dedupe_key, resident_id, organization_id, jurisdiction_id, city, event_type, occurred_at, source,
        resource_id, program_id, category, need_id, server_confirmed, goal_id, action_id, application_id, outcome_id, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      eventId,
      dedupeKey,
      session.residentId,
      text(resident.organization_id),
      text(resident.jurisdiction_id),
      text(resident.city),
      eventType,
      occurredAt,
      source,
      resourceId,
      programId,
      category,
      needId,
      serverConfirmed ? 1 : 0,
      goalId,
      actionId,
      applicationId,
      outcomeId,
      sessionId,
    );
    applySideEffects(db, {
      eventType,
      residentId: session.residentId,
      organizationId: text(resident.organization_id),
      jurisdictionId: text(resident.jurisdiction_id),
      city: text(resident.city),
      occurredAt,
      needId,
      programId,
      actionId,
      applicationId,
      goalId,
      outcomeId,
      objectiveId,
      outcomeType,
      phase,
      indicator,
      source,
      serverConfirmed,
      verificationMethod,
      verificationSource,
    });
    db.exec("RELEASE impact_ingest");
    return { ok: true, status: "accepted", eventId };
  } catch (error) {
    db.exec("ROLLBACK TO impact_ingest");
    db.exec("RELEASE impact_ingest");
    throw error;
  }
}

function applySideEffects(
  db: DatabaseSync,
  input: {
    eventType: EventType;
    residentId: string;
    organizationId: string;
    jurisdictionId: string;
    city: string;
    occurredAt: string;
    needId: string | null;
    programId: string | null;
    actionId: string | null;
    applicationId: string | null;
    goalId: string | null;
    outcomeId: string | null;
    objectiveId: HpObjectiveId | null;
    outcomeType: OutcomeType | null;
    phase: "baseline" | "follow_up" | null;
    indicator: "positive" | "negative" | null;
    source: EventSource;
    serverConfirmed: boolean;
    verificationMethod: string | null;
    verificationSource: string | null;
  },
): void {
  if ((input.eventType === "action_started" || input.eventType === "action_completed") && input.actionId) {
    const completedAt = input.eventType === "action_completed" ? input.occurredAt : null;
    const current = db.prepare("SELECT id, completed_at FROM actions WHERE id = ?").get(input.actionId) as Record<string, SqlValue> | undefined;
    if (!current) {
      db.prepare(
        "INSERT INTO actions (id, resident_id, organization_id, jurisdiction_id, action_type, goal_id, started_at, completed_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)",
      ).run(input.actionId, input.residentId, input.organizationId, input.jurisdictionId, input.needId ?? "action", input.occurredAt, completedAt);
    } else if (completedAt && !current.completed_at) {
      db.prepare("UPDATE actions SET completed_at = ? WHERE id = ? AND resident_id = ?").run(completedAt, input.actionId, input.residentId);
    }
  }
  if (input.eventType.startsWith("application_") && input.applicationId && input.programId) {
    const nextStatus: ApplicationStatus =
      input.eventType === "application_submitted_confirmed"
        ? "submitted_confirmed"
        : input.eventType === "application_draft_saved"
          ? "draft_saved"
          : "started";
    const current = db.prepare("SELECT status FROM applications WHERE id = ?").get(input.applicationId) as Record<string, SqlValue> | undefined;
    if (!current) {
      db.prepare("INSERT INTO applications (id, resident_id, organization_id, jurisdiction_id, program_id, status) VALUES (?, ?, ?, ?, ?, ?)").run(
        input.applicationId,
        input.residentId,
        input.organizationId,
        input.jurisdictionId,
        input.programId,
        nextStatus,
      );
    } else if (statusRank(nextStatus) >= statusRank(applicationStatus(text(current.status)))) {
      db.prepare("UPDATE applications SET status = ? WHERE id = ? AND resident_id = ?").run(nextStatus, input.applicationId, input.residentId);
    }
  }
  if (input.eventType === "goal_completed" && input.goalId) {
    const current = db.prepare("SELECT id FROM goals WHERE id = ?").get(input.goalId);
    if (!current) {
      db.prepare(
        "INSERT INTO goals (id, resident_id, organization_id, jurisdiction_id, goal_type, status, objective_id, completed_at) VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)",
      ).run(input.goalId, input.residentId, input.organizationId, input.jurisdictionId, input.needId ?? "goal", input.objectiveId, input.occurredAt);
    } else {
      db.prepare("UPDATE goals SET status = 'completed', objective_id = ?, completed_at = ? WHERE id = ? AND resident_id = ?").run(
        input.objectiveId,
        input.occurredAt,
        input.goalId,
        input.residentId,
      );
    }
  }
  if ((input.eventType === "outcome_reported" || input.eventType === "outcome_verified") && input.outcomeId && input.outcomeType) {
    const evidence = input.eventType === "outcome_verified" && input.serverConfirmed ? "verified" : "self_reported";
    const outcomeSource = input.eventType === "outcome_verified" ? "externally_verified_outcome" : "self_reported_outcome";
    const method = evidence === "verified" ? input.verificationMethod : null;
    const source = evidence === "verified" ? input.verificationSource : null;
    const current = db.prepare("SELECT evidence FROM outcomes WHERE id = ?").get(input.outcomeId) as Record<string, SqlValue> | undefined;
    if (!current) {
      db.prepare(
        `INSERT INTO outcomes (
          id, resident_id, organization_id, jurisdiction_id, city, outcome_type, objective_id, phase, indicator,
          follow_up_interval_days, consent, evidence, source, verification_method, verification_source, recorded_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 90, 'granted', ?, ?, ?, ?, ?)`,
      ).run(
        input.outcomeId,
        input.residentId,
        input.organizationId,
        input.jurisdictionId,
        input.city,
        input.outcomeType,
        input.objectiveId,
        input.phase,
        input.indicator,
        evidence,
        outcomeSource,
        method,
        source,
        input.occurredAt,
      );
    } else if (evidence === "verified" && text(current.evidence) !== "verified") {
      db.prepare(
        "UPDATE outcomes SET evidence = 'verified', source = 'externally_verified_outcome', verification_method = ?, verification_source = ?, indicator = ?, recorded_on = ? WHERE id = ? AND resident_id = ?",
      ).run(method, source, input.indicator, input.occurredAt, input.outcomeId, input.residentId);
    }
  }
}
