import raw from "@/lib/resource-database/seed/catalog.json";
import { publishedFacts } from "@/lib/resource-database/facts";
import type { ResourceCatalog } from "@/lib/resource-database/types";
import { assertCatalog, assertUnpublishedSeed } from "@/lib/resource-database/validate";

export function loadResourceCatalog(): ResourceCatalog {
  return assertUnpublishedSeed(assertCatalog(raw));
}

/** Facts cleared for the resident catalog, matcher, and chatbot. This seed has none. */
export function loadPublishedFacts() {
  const catalog = loadResourceCatalog();
  const publication = new Map(catalog.programs.map((program) => [program.id, program.publicationStatus]));
  const inherit = <T extends { id: string; programId: string }>(rows: readonly T[]) =>
    rows.map((row) => ({ ...row, publicationStatus: publication.get(row.programId) ?? ("unpublished" as const) }));
  return publishedFacts(catalog.programs, [
    ...inherit(catalog.eligibilityRules),
    ...inherit(catalog.benefitDetails),
    ...inherit(catalog.requiredDocuments),
    ...inherit(catalog.applicationForms),
    ...inherit(catalog.applicationFields),
    ...inherit(catalog.applicationVersions),
  ]);
}
