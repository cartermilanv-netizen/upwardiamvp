import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OfficialSource, ResourceCatalog } from "../types";
import { checkSource, priorFromCatalogSource } from "./check";
import { sha256 } from "./hash";
import { judgeBody } from "./retrieve";
import { robotsAllows } from "./robots";
import type { FailureKind, Observation } from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const proofDir = path.join(here, "proof");

type Target = { sourceId: string; userAgent: string };
type Fetched = {
  status: number;
  body: string;
  raw: Buffer;
  bytes: number;
  contentType: string | null;
  lastModified: string | null;
  finalUrl: string;
};

/**
 * Re-read robots.txt, then fetch the one target page if the path is allowed.
 * Writes the prior snapshot, the observation, and the before-and-after record.
 * Does not follow links and does not edit the catalog.
 */
export async function observeOnce(now = new Date()): Promise<void> {
  const target = JSON.parse(readFileSync(path.join(proofDir, "target.json"), "utf8")) as Target;
  const catalogPath = path.join(root, "lib/resource-database/seed/catalog.json");
  const catalogBytes = readFileSync(catalogPath);
  const catalog = JSON.parse(catalogBytes.toString("utf8")) as ResourceCatalog;
  const source = catalog.sources.find((item) => item.id === target.sourceId);
  if (!source) throw new Error("Target source is not in the catalog.");
  const pageUrl = new URL(source.url);
  const robotsUrl = new URL("/robots.txt", pageUrl.origin).toString();
  const prior = priorFromCatalogSource(source, "prior-1");
  const attemptedOn = now.toISOString().slice(0, 10);
  const observedAt = now.toISOString();
  const requested: string[] = [];

  let observation: Observation;
  try {
    const robots = await get(robotsUrl, target.userAgent, requested);
    const policy = robotsAllows(robots.body, pageUrl.pathname, target.userAgent);
    if (robots.status < 200 || robots.status >= 300 || policy.decision === "unavailable") {
      observation = failedObservation({
        source,
        target,
        attemptedOn,
        observedAt,
        failureKind: "robots_unavailable",
        httpStatus: null,
        robotsUrl,
        robotsStatus: robots.status,
        robotsBody: robots.body,
        robotsDecision: "unavailable",
        robotsReason: policy.decision === "unavailable" ? policy.reason : `robots.txt returned HTTP ${robots.status}.`,
        failureNote: "robots.txt could not be used, so the page was not fetched.",
      });
    } else if (policy.decision === "disallow") {
      observation = failedObservation({
        source,
        target,
        attemptedOn,
        observedAt,
        failureKind: "robots_disallow",
        httpStatus: null,
        robotsUrl,
        robotsStatus: robots.status,
        robotsBody: robots.body,
        robotsDecision: "disallow",
        robotsReason: policy.reason,
        failureNote: "robots.txt disallows the page, so it was not fetched.",
      });
    } else {
      const page = await get(source.url, target.userAgent, requested);
      const finalPath = new URL(page.finalUrl).pathname;
      const finalPolicy = finalPath === pageUrl.pathname ? policy : robotsAllows(robots.body, finalPath, target.userAgent);
      if (finalPolicy.decision !== "allow") {
        observation = failedObservation({
          source,
          target,
          attemptedOn,
          observedAt,
          failureKind: "robots_disallow",
          httpStatus: page.status,
          finalUrl: page.finalUrl,
          robotsUrl,
          robotsStatus: robots.status,
          robotsBody: robots.body,
          robotsDecision: "disallow",
          robotsReason: finalPolicy.reason,
          failureNote: "The response URL is not allowed by robots.txt. The body was not kept.",
        });
      } else {
        const judgment = judgeBody({ httpStatus: page.status, body: page.body, byteLength: page.bytes });
        observation = {
          id: "observation-1",
          sourceId: source.id,
          url: source.url,
          userAgent: target.userAgent,
          attemptedOn,
          observedAt,
          outcome: judgment.contentRetrieved ? "fetched" : "failed",
          failureKind: judgment.contentRetrieved ? null : judgment.failureKind,
          httpStatus: page.status,
          contentRetrieved: judgment.contentRetrieved,
          finalUrl: page.finalUrl,
          cleanedText: judgment.contentRetrieved ? judgment.cleanedText : null,
          byteLength: page.bytes,
          sha256: sha256(page.raw),
          lastModified: page.lastModified,
          contentType: page.contentType,
          robotsUrl,
          robotsStatus: robots.status,
          robotsBody: robots.body,
          robotsDecision: "allow",
          robotsReason: policy.reason,
          failureNote: judgment.contentRetrieved ? null : "The response was not a retrieved page body.",
        };
      }
    }
  } catch (error) {
    observation = failedObservation({
      source,
      target,
      attemptedOn,
      observedAt,
      failureKind: "network_error",
      httpStatus: null,
      robotsUrl,
      robotsStatus: null,
      robotsBody: null,
      robotsDecision: "unavailable",
      robotsReason: "The request did not complete.",
      failureNote: error instanceof Error ? error.message : "The request did not complete.",
    });
  }

  if (requested.length > 2) throw new Error("The check requested more than robots.txt and one page.");
  const record = checkSource({
    prior,
    observation,
    at: observedAt,
    auditId: "audit-1",
    proposalId: "proposal-1",
    catalogSha256: sha256(catalogBytes),
  });
  writeFileSync(path.join(proofDir, "prior.json"), json(prior));
  writeFileSync(path.join(proofDir, "observation.json"), json(observation));
  writeFileSync(path.join(proofDir, "record.json"), json(record));
  if (!readFileSync(catalogPath).equals(catalogBytes)) throw new Error("The catalog changed during the check.");
}

async function get(url: string, userAgent: string, requested: string[]): Promise<Fetched> {
  requested.push(url);
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      accept: "text/html, text/plain;q=0.9, */*;q=0.1",
      "user-agent": userAgent,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const raw = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    body: raw.toString("utf8"),
    raw,
    bytes: raw.byteLength,
    contentType: response.headers.get("content-type"),
    lastModified: response.headers.get("last-modified"),
    finalUrl: response.url,
  };
}

function failedObservation(input: {
  source: OfficialSource;
  target: Target;
  attemptedOn: string;
  observedAt: string;
  failureKind: FailureKind;
  httpStatus: number | null;
  finalUrl?: string | null;
  robotsUrl: string;
  robotsStatus: number | null;
  robotsBody: string | null;
  robotsDecision: Observation["robotsDecision"];
  robotsReason: string;
  failureNote: string;
}): Observation {
  return {
    id: "observation-1",
    sourceId: input.source.id,
    url: input.source.url,
    userAgent: input.target.userAgent,
    attemptedOn: input.attemptedOn,
    observedAt: input.observedAt,
    outcome: "failed",
    failureKind: input.failureKind,
    httpStatus: input.httpStatus,
    contentRetrieved: false,
    finalUrl: input.finalUrl ?? null,
    cleanedText: null,
    byteLength: null,
    sha256: null,
    lastModified: null,
    contentType: null,
    robotsUrl: input.robotsUrl,
    robotsStatus: input.robotsStatus,
    robotsBody: input.robotsBody,
    robotsDecision: input.robotsDecision,
    robotsReason: input.robotsReason,
    failureNote: input.failureNote,
  };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  observeOnce().catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? `${error.message}\n` : "Source check failed.\n");
    process.exitCode = 1;
  });
}
