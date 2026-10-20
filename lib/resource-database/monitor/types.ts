/** One-page source check. Not the resident catalog, and not a published fact. */

export type ComparisonKind = "unchanged" | "cosmetic" | "substantive" | "no_prior_text" | "fetch_failed";

export type FailureKind =
  | "robots_unavailable"
  | "robots_disallow"
  | "http_error"
  | "interstitial"
  | "network_error"
  | "empty_body";

export type RobotsDecisionKind = "allow" | "disallow" | "unavailable";

export type FieldClass = "eligibility" | "income" | "deadline" | "application_rule" | "other";

export type SourceSnapshot = {
  id: string;
  sourceId: string;
  url: string;
  retrievedOn: string | null;
  httpStatus: number | null;
  contentRetrieved: boolean;
  bodyRetained: boolean;
  cleanedText: string | null;
  byteLength: number | null;
  sha256: string | null;
  notes: string;
};

export type Observation = {
  id: string;
  sourceId: string;
  url: string;
  userAgent: string;
  attemptedOn: string;
  observedAt: string;
  outcome: "fetched" | "failed";
  failureKind: FailureKind | null;
  httpStatus: number | null;
  contentRetrieved: boolean;
  finalUrl: string | null;
  cleanedText: string | null;
  byteLength: number | null;
  sha256: string | null;
  lastModified: string | null;
  contentType: string | null;
  robotsUrl: string;
  robotsStatus: number | null;
  robotsBody: string | null;
  robotsDecision: RobotsDecisionKind;
  robotsReason: string;
  failureNote: string | null;
};

export type TextEvidence = {
  observationId: string;
  excerpt: string;
  priorExcerpt: string | null;
};

export type Proposal = {
  id: string;
  status: "pending_human_approval" | "not_proposed";
  evidence: TextEvidence | null;
};

export type FieldWrite = {
  recordId: string;
  field: string;
  previous: unknown;
  next: unknown;
};

export type AuditEntry = {
  id: string;
  at: string;
  sourceId: string;
  url: string;
  comparisonKind: ComparisonKind;
  catalogWritten: false;
  catalogSha256: string;
  writes: FieldWrite[];
  programClosed: false;
  note: string;
};

/** Before-and-after record for one source check. */
export type CheckRecord = {
  schemaVersion: 1;
  sourceId: string;
  url: string;
  before: {
    snapshotId: string;
    retrievedOn: string | null;
    httpStatus: number | null;
    bodyRetained: boolean;
    cleanedText: string | null;
  };
  after: {
    observationId: string;
    attemptedOn: string;
    outcome: "fetched" | "failed";
    failureKind: FailureKind | null;
    httpStatus: number | null;
    contentRetrieved: boolean;
    cleanedText: string | null;
  };
  comparisonKind: ComparisonKind;
  proposal: Proposal;
  programClosed: false;
  audit: AuditEntry;
};

export type FieldSnapshot = {
  recordId: string;
  field: string;
  value: unknown;
};
