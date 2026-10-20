import { normalizeText } from "./clean";
import type { ComparisonKind, TextEvidence } from "./types";

export function compareCleaned(prior: string | null, next: string | null): ComparisonKind {
  if (next === null) return "fetch_failed";
  if (prior === null) return "no_prior_text";
  const priorText = normalizeText(prior);
  const nextText = normalizeText(next);
  if (priorText === nextText) return "unchanged";
  if (cosmeticKey(priorText) === cosmeticKey(nextText)) return "cosmetic";
  return "substantive";
}

/** Letters and numbers only, so spacing, case, and punctuation are cosmetic. */
export function cosmeticKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textEvidence(prior: string, next: string, observationId: string): TextEvidence {
  const priorLines = normalizeText(prior).split("\n");
  const nextLines = normalizeText(next).split("\n");
  const limit = Math.max(priorLines.length, nextLines.length);
  for (let index = 0; index < limit; index += 1) {
    if (priorLines[index] === nextLines[index]) continue;
    const excerpt = nextLines[index] ?? nextLines[nextLines.length - 1] ?? normalizeText(next);
    return {
      observationId,
      excerpt,
      priorExcerpt: priorLines[index] ?? null,
    };
  }
  return { observationId, excerpt: normalizeText(next), priorExcerpt: normalizeText(prior) };
}
