import type { Fact, Provenance, PublicationStatus, Sourced, Support } from "@/lib/resource-database/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isSourced(value: unknown): value is Sourced<unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (record.support === "supported" ||
      record.support === "requires_verification" ||
      record.support === "not_found") &&
    "value" in record &&
    "reviewStatus" in record &&
    "provenance" in record
  );
}

/**
 * A field is a fact only after a human has verified it and the program is published.
 * Extraction, including a sourced value, is not enough.
 */
export function isFact<T>(field: Sourced<T>, publicationStatus: PublicationStatus): field is Sourced<T> & {
  value: T;
  support: "supported";
  reviewStatus: "human_verified";
  provenance: Provenance;
} {
  if (publicationStatus !== "published") return false;
  if (field.support !== "supported") return false;
  if (field.reviewStatus !== "human_verified") return false;
  if (field.value === null || field.value === undefined) return false;
  const provenance = field.provenance;
  if (!provenance) return false;
  if (provenance.sourceUrl.trim() === "" || provenance.basis.trim() === "") return false;
  if (!DATE.test(provenance.retrievedOn)) return false;
  return true;
}

export function publishableValue<T>(field: Sourced<T>, publicationStatus: PublicationStatus): T | null {
  if (!isFact(field, publicationStatus)) return null;
  return field.value;
}

export type FieldRef = {
  recordId: string;
  field: string;
  publicationStatus: PublicationStatus;
  sourced: Sourced<unknown>;
};

export function collectFields(root: unknown, recordId: string, publicationStatus: PublicationStatus): FieldRef[] {
  const found: FieldRef[] = [];
  walk(root, recordId, publicationStatus, "", found);
  return found;
}

function walk(node: unknown, recordId: string, publicationStatus: PublicationStatus, path: string, found: FieldRef[]) {
  if (isSourced(node)) {
    found.push({ recordId, field: path || "value", publicationStatus, sourced: node });
    return;
  }
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, recordId, publicationStatus, `${path}[${index}]`, found));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "id" || key === "programId" || key === "formId" || key === "programIds") continue;
    walk(value, recordId, publicationStatus, path ? `${path}.${key}` : key, found);
  }
}

export function publishedFacts(records: readonly { id: string; publicationStatus?: PublicationStatus }[], extras: readonly unknown[] = []): Fact<unknown>[] {
  const facts: Fact<unknown>[] = [];
  const visit = (record: unknown, fallbackPublication: PublicationStatus) => {
    if (!record || typeof record !== "object") return;
    const id = "id" in record && typeof record.id === "string" ? record.id : "record";
    const publication =
      "publicationStatus" in record && (record.publicationStatus === "published" || record.publicationStatus === "unpublished")
        ? record.publicationStatus
        : fallbackPublication;
    for (const field of collectFields(record, id, publication)) {
      if (!isFact(field.sourced, field.publicationStatus)) continue;
      facts.push({
        recordId: field.recordId,
        field: field.field,
        value: field.sourced.value,
        provenance: field.sourced.provenance,
      });
    }
  };
  for (const record of records) visit(record, record.publicationStatus ?? "unpublished");
  for (const extra of extras) visit(extra, "unpublished");
  return facts;
}

export function missingSupport(support: Support): boolean {
  return support === "requires_verification" || support === "not_found";
}
