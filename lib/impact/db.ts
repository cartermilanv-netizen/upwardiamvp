import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SqlValue } from "node:sqlite";
import { hashPassword, hashToken, makeSalt, newSessionToken, passwordMatches } from "@/lib/impact/auth";
import { CATEGORIES, DEMO_LOGINS, JURISDICTIONS, ORGANIZATIONS, PROGRAMS, categoryLabel, jurisdictionName, organizationName, programName } from "@/lib/impact/catalog";
import { saveConsent } from "@/lib/impact/consent";
import {
  AUDIT_RETENTION_DAYS,
  DEMO_AS_OF,
  EVENT_RETENTION_DAYS,
  HOLDING_ORGANIZATION_ID,
  OUTCOME_RETENTION_DAYS,
  SEED_VERSION,
  SESSION_HOURS,
  SYNTHETIC_ACTION_ID,
  SYNTHETIC_EVENT_ID,
  SYNTHETIC_NEED_ID,
  SYNTHETIC_RESIDENT_ID,
  plusDays,
} from "@/lib/impact/constants";
import { ingestResidentEvent } from "@/lib/impact/ingest";
import { issueAnalyticsSession } from "@/lib/impact/resident-session";
import { buildDemoDataset } from "@/lib/impact/seed";
import type { Directory } from "@/lib/impact/query";
import type {
  ActionFact,
  ApplicationFact,
  BarrierFact,
  CategoryId,
  EventFact,
  EventSource,
  EventType,
  GoalFact,
  OutcomeFact,
  OutcomeSource,
  Principal,
  ResidentFact,
} from "@/lib/impact/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jurisdictions (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  organization_id TEXT,
  jurisdiction_id TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  city TEXT NOT NULL,
  analytics_consent TEXT NOT NULL,
  consent_granted_at TEXT,
  consent_withdrawn_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  city TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL,
  resource_id TEXT,
  program_id TEXT,
  category TEXT,
  need_id TEXT,
  server_confirmed INTEGER NOT NULL DEFAULT 0,
  goal_id TEXT,
  action_id TEXT,
  application_id TEXT,
  outcome_id TEXT,
  session_id TEXT
);
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  resident_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ingest_nonces (
  nonce TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  city TEXT NOT NULL,
  outcome_type TEXT NOT NULL,
  objective_id TEXT,
  phase TEXT,
  indicator TEXT,
  follow_up_interval_days INTEGER NOT NULL,
  consent TEXT NOT NULL,
  evidence TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'demo_fixture',
  verification_method TEXT,
  verification_source TEXT,
  recorded_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS barriers (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  city TEXT NOT NULL,
  barrier TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  status TEXT NOT NULL,
  objective_id TEXT,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  goal_id TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  jurisdiction_id TEXT NOT NULL,
  program_id TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS retention_policy (
  id TEXT PRIMARY KEY,
  event_days INTEGER NOT NULL,
  outcome_days INTEGER NOT NULL,
  audit_days INTEGER NOT NULL,
  session_hours INTEGER NOT NULL,
  note TEXT NOT NULL
);
`;

type Row = Record<string, SqlValue>;

function text(value: SqlValue | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return "";
}

function nullable(value: SqlValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  return text(value);
}

function scope(principal: Principal): { sql: string; params: string[] } {
  const holding = "organization_id != ?";
  if (principal.role === "super_admin") return { sql: holding, params: [HOLDING_ORGANIZATION_ID] };
  if (principal.role === "government_admin") {
    return { sql: `${holding} AND jurisdiction_id = ?`, params: [HOLDING_ORGANIZATION_ID, principal.jurisdictionId ?? ""] };
  }
  return {
    sql: `${holding} AND organization_id = ? AND jurisdiction_id = ?`,
    params: [HOLDING_ORGANIZATION_ID, principal.organizationId ?? "", principal.jurisdictionId ?? ""],
  };
}

function all(db: DatabaseSync, sql: string, params: SqlValue[] = []): Row[] {
  return db.prepare(sql).all(...params);
}

function one(db: DatabaseSync, sql: string, params: SqlValue[] = []): Row | undefined {
  return db.prepare(sql).get(...params);
}

export function databasePath(): string {
  return process.env.IMPACT_DB_PATH ?? path.join(process.cwd(), "data", "impact.sqlite");
}

export function openDatabase(filePath: string): DatabaseSync {
  if (filePath !== ":memory:") mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  ensureColumn(db, "events", "need_id", "TEXT");
  ensureColumn(db, "events", "server_confirmed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "outcomes", "source", "TEXT NOT NULL DEFAULT 'demo_fixture'");
  const seeded = one(db, "SELECT value FROM meta WHERE key = 'seed'");
  if (!seeded || text(seeded.value) !== SEED_VERSION) seed(db);
  purgeExpired(db, new Date().toISOString());
  return db;
}

const globalForImpact = globalThis as unknown as { impactDb?: DatabaseSync; impactDbPath?: string };

export function getDb(): DatabaseSync {
  const filePath = databasePath();
  if (!globalForImpact.impactDb || globalForImpact.impactDbPath !== filePath) {
    globalForImpact.impactDb?.close();
    globalForImpact.impactDb = openDatabase(filePath);
    globalForImpact.impactDbPath = filePath;
  }
  return globalForImpact.impactDb;
}

export function closeDb(db: DatabaseSync): void {
  db.close();
  if (globalForImpact.impactDb === db) {
    globalForImpact.impactDb = undefined;
    globalForImpact.impactDbPath = undefined;
  }
}

function clearRows(db: DatabaseSync): void {
  for (const table of [
    "events",
    "outcomes",
    "barriers",
    "goals",
    "actions",
    "applications",
    "sessions",
    "analytics_sessions",
    "ingest_nonces",
    "audit_log",
    "residents",
    "users",
    "programs",
    "organizations",
    "jurisdictions",
    "retention_policy",
    "meta",
  ]) {
    db.exec(`DELETE FROM ${table}`);
  }
}

function seed(db: DatabaseSync): void {
  const dataset = buildDemoDataset(DEMO_AS_OF);
  db.exec("BEGIN");
  try {
    clearRows(db);
    const insertJurisdiction = db.prepare("INSERT INTO jurisdictions (id, name) VALUES (?, ?)");
    for (const jurisdiction of JURISDICTIONS) insertJurisdiction.run(jurisdiction.id, jurisdiction.name);
    const insertOrg = db.prepare("INSERT INTO organizations (id, name, jurisdiction_id) VALUES (?, ?, ?)");
    for (const organization of ORGANIZATIONS) insertOrg.run(organization.id, organization.name, organization.jurisdictionId);
    const insertProgram = db.prepare("INSERT INTO programs (id, name, category) VALUES (?, ?, ?)");
    for (const program of PROGRAMS) insertProgram.run(program.id, program.name, program.category);
    const insertUser = db.prepare(
      "INSERT INTO users (id, email, display_name, role, organization_id, jurisdiction_id, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const login of DEMO_LOGINS) {
      const salt = makeSalt();
      insertUser.run(
        login.email,
        login.email,
        login.displayName,
        login.role,
        login.organizationId,
        login.jurisdictionId,
        hashPassword(login.password, salt),
        salt,
      );
    }
    const insertResident = db.prepare(
      "INSERT INTO residents (id, organization_id, jurisdiction_id, city, analytics_consent, consent_granted_at, consent_withdrawn_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const resident of dataset.residents) {
      insertResident.run(
        resident.id,
        resident.organizationId,
        resident.jurisdictionId,
        resident.city,
        resident.consent,
        resident.consentedAt,
        resident.withdrawnAt,
        resident.deletedAt,
      );
    }
    const insertEvent = db.prepare(
      `INSERT OR IGNORE INTO events (
        id, dedupe_key, resident_id, organization_id, jurisdiction_id, city, event_type, occurred_at, source,
        resource_id, program_id, category, need_id, server_confirmed, goal_id, action_id, application_id, outcome_id, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const event of dataset.events) {
      insertEvent.run(
        event.id,
        event.dedupeKey,
        event.residentId,
        event.organizationId,
        event.jurisdictionId,
        event.city,
        event.type,
        event.occurredAt,
        event.source,
        event.resourceId,
        event.programId,
        event.category,
        event.needId,
        event.serverConfirmed ? 1 : 0,
        event.goalId,
        event.actionId,
        event.applicationId,
        event.outcomeId,
        event.sessionId,
      );
    }
    const insertOutcome = db.prepare(
      `INSERT INTO outcomes (
        id, resident_id, organization_id, jurisdiction_id, city, outcome_type, objective_id, phase, indicator,
        follow_up_interval_days, consent, evidence, source, verification_method, verification_source, recorded_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const outcome of dataset.outcomes) {
      insertOutcome.run(
        outcome.id,
        outcome.residentId,
        outcome.organizationId,
        outcome.jurisdictionId,
        outcome.city,
        outcome.outcomeType,
        outcome.objectiveId,
        outcome.phase,
        outcome.indicator,
        outcome.followUpIntervalDays,
        outcome.consent,
        outcome.evidence,
        outcome.source,
        outcome.verificationMethod,
        outcome.verificationSource,
        outcome.recordedOn,
      );
    }
    const insertBarrier = db.prepare(
      "INSERT INTO barriers (id, resident_id, organization_id, jurisdiction_id, city, barrier, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const barrier of dataset.barriers) {
      insertBarrier.run(barrier.id, barrier.residentId, barrier.organizationId, barrier.jurisdictionId, barrier.city, barrier.barrier, barrier.occurredAt);
    }
    const insertGoal = db.prepare(
      "INSERT INTO goals (id, resident_id, organization_id, jurisdiction_id, goal_type, status, objective_id, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const goal of dataset.goals) {
      insertGoal.run(goal.id, goal.residentId, goal.organizationId, goal.jurisdictionId, goal.goalType, goal.status, goal.objectiveId, goal.completedAt);
    }
    const insertAction = db.prepare(
      "INSERT INTO actions (id, resident_id, organization_id, jurisdiction_id, action_type, goal_id, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const action of dataset.actions) {
      insertAction.run(
        action.id,
        action.residentId,
        action.organizationId,
        action.jurisdictionId,
        action.actionType,
        action.goalId,
        action.startedAt,
        action.completedAt,
      );
    }
    const insertApplication = db.prepare(
      "INSERT INTO applications (id, resident_id, organization_id, jurisdiction_id, program_id, status) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const application of dataset.applications) {
      insertApplication.run(
        application.id,
        application.residentId,
        application.organizationId,
        application.jurisdictionId,
        application.programId,
        application.status,
      );
    }
    db.prepare(
      "INSERT INTO retention_policy (id, event_days, outcome_days, audit_days, session_hours, note) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      "default",
      EVENT_RETENTION_DAYS,
      OUTCOME_RETENTION_DAYS,
      AUDIT_RETENTION_DAYS,
      SESSION_HOURS,
      "Demonstration retention. Events and outcomes are eligible for deletion after the stated number of days. Sessions expire on the hour count. Audit rows age out after the audit window.",
    );
    const nowIso = new Date().toISOString();
    saveConsent(db, {
      id: SYNTHETIC_RESIDENT_ID,
      organizationId: "org_harborlight",
      jurisdictionId: "jur_harbor",
      city: "North Harbor",
      consent: "granted",
      at: nowIso,
    });
    const session = issueAnalyticsSession(db, SYNTHETIC_RESIDENT_ID, nowIso);
    if (!session.ok) throw new Error(session.error);
    const ingested = ingestResidentEvent(
      db,
      session.token,
      {
        type: "action_started",
        occurredAt: nowIso,
        sentAt: nowIso,
        nonce: randomBytes(16).toString("hex"),
        needId: SYNTHETIC_NEED_ID,
        actionId: SYNTHETIC_ACTION_ID,
      },
      { now: nowIso, eventId: SYNTHETIC_EVENT_ID },
    );
    if (!ingested.ok || ingested.status !== "accepted") {
      throw new Error(ingested.ok ? "The synthetic test event was already stored." : ingested.error);
    }
    db.prepare("DELETE FROM analytics_sessions WHERE resident_id = ?").run(SYNTHETIC_RESIDENT_ID);
    db.prepare("INSERT INTO meta (key, value) VALUES ('seed', ?)").run(SEED_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export type ScopedFacts = {
  residents: ResidentFact[];
  events: EventFact[];
  outcomes: OutcomeFact[];
  barriers: BarrierFact[];
  goals: GoalFact[];
  actions: ActionFact[];
  applications: ApplicationFact[];
};

export function loadFacts(db: DatabaseSync, principal: Principal): ScopedFacts {
  const limited = scope(principal);
  const residentSql = `SELECT * FROM residents WHERE analytics_consent = 'granted' AND deleted_at IS NULL AND consent_withdrawn_at IS NULL AND ${limited.sql}`;
  const residents = all(db, residentSql, limited.params).map(mapResident);
  const events = all(db, `SELECT * FROM events WHERE ${limited.sql}`, limited.params)
    .map(mapEvent)
    .filter((event): event is EventFact => event !== null);
  const outcomes = all(db, `SELECT * FROM outcomes WHERE consent = 'granted' AND ${limited.sql}`, limited.params).map(mapOutcome);
  const barriers = all(db, `SELECT * FROM barriers WHERE ${limited.sql}`, limited.params).map(mapBarrier);
  const goals = all(db, `SELECT * FROM goals WHERE ${limited.sql}`, limited.params).map(mapGoal);
  const actions = all(db, `SELECT * FROM actions WHERE ${limited.sql}`, limited.params).map(mapAction);
  const applications = all(db, `SELECT * FROM applications WHERE ${limited.sql}`, limited.params).map(mapApplication);
  return { residents, events, outcomes, barriers, goals, actions, applications };
}

export function directoryFor(db: DatabaseSync, principal: Principal): Directory {
  const facts = loadFacts(db, principal);
  const cities = [...new Set(facts.residents.map((resident) => resident.city))].sort();
  const jurisdictions = [...new Set(facts.residents.map((resident) => resident.jurisdictionId))].sort().map((id) => ({
    id,
    label: jurisdictionName(id),
  }));
  return {
    cities,
    programs: PROGRAMS.map((program) => ({ id: program.id, label: programName(program.id) })),
    categories: CATEGORIES.map((category) => ({ id: category.id, label: categoryLabel(category.id) })),
    jurisdictions,
  };
}

export function findUser(db: DatabaseSync, email: string): (Principal & { passwordHash: string; passwordSalt: string }) | null {
  const row = one(db, "SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (!row) return null;
  const role = text(row.role);
  if (role !== "super_admin" && role !== "government_admin" && role !== "organization_admin") return null;
  return {
    userId: text(row.email),
    email: text(row.email),
    displayName: text(row.display_name),
    role,
    organizationId: nullable(row.organization_id),
    jurisdictionId: nullable(row.jurisdiction_id),
    passwordHash: text(row.password_hash),
    passwordSalt: text(row.password_salt),
  };
}

export function createSession(db: DatabaseSync, userId: string, token: string, nowIso: string): void {
  const expires = new Date(Date.parse(nowIso) + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    `session-${hashToken(token).slice(0, 16)}`,
    hashToken(token),
    userId,
    nowIso,
    expires,
  );
}

export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function principalForToken(db: DatabaseSync, token: string, nowIso: string): Principal | null {
  const session = one(db, "SELECT * FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  if (!session) return null;
  if (text(session.expires_at) <= nowIso) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  const row = one(db, "SELECT * FROM users WHERE email = ?", [text(session.user_id)]);
  if (!row) return null;
  const role = text(row.role);
  if (role !== "super_admin" && role !== "government_admin" && role !== "organization_admin") return null;
  return {
    userId: text(row.email),
    email: text(row.email),
    displayName: text(row.display_name),
    role,
    organizationId: nullable(row.organization_id),
    jurisdictionId: nullable(row.jurisdiction_id),
  };
}

export function writeAudit(db: DatabaseSync, actorUserId: string, action: string, detail: string, nowIso: string): void {
  db.prepare("INSERT INTO audit_log (id, actor_user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)").run(
    `audit-${hashToken(newSessionToken())}`,
    actorUserId,
    action,
    detail,
    nowIso,
  );
}

export function purgeExpired(db: DatabaseSync, nowIso: string): void {
  const eventCutoff = plusDays(nowIso, -EVENT_RETENTION_DAYS);
  const outcomeCutoff = plusDays(nowIso, -OUTCOME_RETENTION_DAYS);
  const auditCutoff = plusDays(nowIso, -AUDIT_RETENTION_DAYS);
  db.prepare("DELETE FROM events WHERE occurred_at < ?").run(eventCutoff);
  db.prepare("DELETE FROM outcomes WHERE recorded_on < ?").run(outcomeCutoff);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso);
  db.prepare("DELETE FROM analytics_sessions WHERE expires_at <= ?").run(nowIso);
  db.prepare("DELETE FROM ingest_nonces WHERE received_at < ?").run(plusDays(nowIso, -2));
  db.prepare("DELETE FROM audit_log WHERE created_at < ?").run(auditCutoff);
}

export function withdrawConsent(db: DatabaseSync, residentId: string, at: string): void {
  db.prepare("UPDATE residents SET analytics_consent = 'withdrawn', consent_withdrawn_at = ? WHERE id = ?").run(at, residentId);
  db.prepare("DELETE FROM analytics_sessions WHERE resident_id = ?").run(residentId);
}

export function deleteResidentAnalytics(db: DatabaseSync, residentId: string, at: string): void {
  for (const table of ["events", "outcomes", "barriers", "goals", "actions", "applications", "ingest_nonces", "analytics_sessions"]) {
    db.prepare(`DELETE FROM ${table} WHERE resident_id = ?`).run(residentId);
  }
  db.prepare("UPDATE residents SET deleted_at = ?, city = '', analytics_consent = 'withdrawn', consent_withdrawn_at = ? WHERE id = ?").run(
    at,
    at,
    residentId,
  );
}

export function tableColumns(db: DatabaseSync, table: string): string[] {
  return all(db, `SELECT name FROM pragma_table_info('${table}')`).map((row) => text(row.name));
}

function mapResident(row: Row): ResidentFact {
  const consent = text(row.analytics_consent);
  return {
    id: text(row.id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    city: text(row.city),
    consent: consent === "declined" || consent === "withdrawn" ? consent : "granted",
    consentedAt: nullable(row.consent_granted_at),
    withdrawnAt: nullable(row.consent_withdrawn_at),
    deletedAt: nullable(row.deleted_at),
  };
}

function mapEvent(row: Row): EventFact | null {
  const source = mapEventSource(text(row.source));
  if (!source) return null;
  return {
    id: text(row.id),
    dedupeKey: text(row.dedupe_key),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    city: text(row.city),
    type: text(row.event_type) as EventType,
    occurredAt: text(row.occurred_at),
    source,
    resourceId: nullable(row.resource_id),
    programId: nullable(row.program_id),
    category: nullable(row.category) as CategoryId | null,
    needId: nullable(row.need_id),
    serverConfirmed: Number(row.server_confirmed) === 1,
    goalId: nullable(row.goal_id),
    actionId: nullable(row.action_id),
    applicationId: nullable(row.application_id),
    outcomeId: nullable(row.outcome_id),
    sessionId: nullable(row.session_id),
  };
}

function mapEventSource(value: string): EventSource | null {
  if (value === "demo_fixture" || value === "resident_event" || value === "self_reported_outcome" || value === "externally_verified_outcome") {
    return value;
  }
  return null;
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string): void {
  if (!tableColumns(db, table).includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function mapOutcome(row: Row): OutcomeFact {
  const evidence = text(row.evidence) === "verified" ? "verified" : "self_reported";
  const phaseText = nullable(row.phase);
  const indicatorText = nullable(row.indicator);
  return {
    id: text(row.id),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    city: text(row.city),
    outcomeType: text(row.outcome_type) as OutcomeFact["outcomeType"],
    objectiveId: nullable(row.objective_id) as OutcomeFact["objectiveId"],
    phase: phaseText === "baseline" || phaseText === "follow_up" ? phaseText : null,
    indicator: indicatorText === "positive" || indicatorText === "negative" ? indicatorText : null,
    followUpIntervalDays: Number(row.follow_up_interval_days ?? 0),
    consent: "granted",
    evidence,
    source: mapOutcomeSource(text(row.source)),
    verificationMethod: nullable(row.verification_method),
    verificationSource: nullable(row.verification_source),
    recordedOn: text(row.recorded_on),
  };
}

function mapOutcomeSource(value: string): OutcomeSource {
  if (value === "self_reported_outcome" || value === "externally_verified_outcome") return value;
  return "demo_fixture";
}

function mapBarrier(row: Row): BarrierFact {
  return {
    id: text(row.id),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    city: text(row.city),
    barrier: text(row.barrier),
    occurredAt: text(row.occurred_at),
  };
}

function mapGoal(row: Row): GoalFact {
  return {
    id: text(row.id),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    goalType: text(row.goal_type),
    status: text(row.status) === "completed" ? "completed" : "active",
    objectiveId: nullable(row.objective_id) as GoalFact["objectiveId"],
    completedAt: nullable(row.completed_at),
  };
}

function mapAction(row: Row): ActionFact {
  return {
    id: text(row.id),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    actionType: text(row.action_type),
    goalId: nullable(row.goal_id),
    startedAt: text(row.started_at),
    completedAt: nullable(row.completed_at),
  };
}

function mapApplication(row: Row): ApplicationFact {
  const status = text(row.status);
  return {
    id: text(row.id),
    residentId: text(row.resident_id),
    organizationId: text(row.organization_id),
    jurisdictionId: text(row.jurisdiction_id),
    programId: text(row.program_id),
    status: status === "draft_saved" || status === "submitted_confirmed" ? status : "started",
  };
}

export function authenticateUser(db: DatabaseSync, email: string, password: string): Principal | null {
  const user = findUser(db, email);
  if (!user) return null;
  if (!passwordMatches(password, user.passwordSalt, user.passwordHash)) return null;
  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    organizationId: user.organizationId,
    jurisdictionId: user.jurisdictionId,
  };
}

export function scopeLabel(principal: Principal): { scopeLabel: string; organizationLabel: string | null } {
  if (principal.role === "super_admin") return { scopeLabel: "All demonstration jurisdictions", organizationLabel: null };
  if (principal.role === "government_admin") {
    return { scopeLabel: `${jurisdictionName(principal.jurisdictionId ?? "")} aggregated`, organizationLabel: null };
  }
  return {
    scopeLabel: jurisdictionName(principal.jurisdictionId ?? ""),
    organizationLabel: organizationName(principal.organizationId ?? ""),
  };
}
