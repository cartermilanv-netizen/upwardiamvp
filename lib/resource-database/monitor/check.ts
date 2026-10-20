import type { OfficialSource } from "../types";
import { compareCleaned, textEvidence } from "./compare";
import type { CheckRecord, Observation, SourceSnapshot } from "./types";

export function priorFromCatalogSource(source: OfficialSource, snapshotId: string): SourceSnapshot {
  return {
    id: snapshotId,
    sourceId: source.id,
    url: source.url,
    retrievedOn: source.retrievedOn,
    httpStatus: source.httpStatus,
    contentRetrieved: source.contentRetrieved,
    bodyRetained: false,
    cleanedText: null,
    byteLength: null,
    sha256: null,
    notes: `${source.notes} The catalog row does not retain the page body.`,
  };
}

export function checkSource(input: {
  prior: SourceSnapshot;
  observation: Observation;
  at: string;
  auditId: string;
  proposalId: string;
  catalogSha256: string;
}): CheckRecord {
  if (input.prior.url !== input.observation.url) {
    throw new Error("The prior snapshot and the observation are different URLs.");
  }
  const fetched = input.observation.outcome === "fetched" && input.observation.cleanedText !== null;
  const comparisonKind = fetched
    ? compareCleaned(input.prior.cleanedText, input.observation.cleanedText)
    : "fetch_failed";
  const evidence =
    comparisonKind === "substantive" && input.prior.cleanedText !== null && input.observation.cleanedText !== null
      ? textEvidence(input.prior.cleanedText, input.observation.cleanedText, input.observation.id)
      : null;
  if (evidence && !input.observation.cleanedText?.includes(evidence.excerpt)) {
    throw new Error("Proposal evidence is not in the fetched text.");
  }
  const proposal = {
    id: input.proposalId,
    status: evidence ? ("pending_human_approval" as const) : ("not_proposed" as const),
    evidence,
  };
  return {
    schemaVersion: 1,
    sourceId: input.prior.sourceId,
    url: input.prior.url,
    before: {
      snapshotId: input.prior.id,
      retrievedOn: input.prior.retrievedOn,
      httpStatus: input.prior.httpStatus,
      bodyRetained: input.prior.bodyRetained,
      cleanedText: input.prior.cleanedText,
    },
    after: {
      observationId: input.observation.id,
      attemptedOn: input.observation.attemptedOn,
      outcome: fetched ? "fetched" : "failed",
      failureKind: fetched ? null : input.observation.failureKind,
      httpStatus: input.observation.httpStatus,
      contentRetrieved: fetched,
      cleanedText: fetched ? input.observation.cleanedText : null,
    },
    comparisonKind,
    proposal,
    programClosed: false,
    audit: {
      id: input.auditId,
      at: input.at,
      sourceId: input.prior.sourceId,
      url: input.prior.url,
      comparisonKind,
      catalogWritten: false,
      catalogSha256: input.catalogSha256,
      writes: [],
      programClosed: false,
      note: auditNote(comparisonKind),
    },
  };
}

function auditNote(kind: CheckRecord["comparisonKind"]): string {
  if (kind === "unchanged") return "Cleaned text matches the prior snapshot. No catalog field was written.";
  if (kind === "cosmetic") return "The difference is spacing, case, or punctuation. No catalog field was written.";
  if (kind === "substantive") {
    return "Cleaned text changed. The proposal quotes the fetch and stays pending human approval. No catalog field was written.";
  }
  if (kind === "no_prior_text") {
    return "The prior snapshot has no cleaned text, so this observation is the first retained body. No change is proposed and no catalog field was written.";
  }
  return "The fetch failed. That is not a program closure. No catalog field was written.";
}
