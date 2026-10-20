import { collectFields, isSourced } from "@/lib/resource-database/facts";
import type {
  ApplicationField,
  ApplicationForm,
  ApplicationVersion,
  BenefitDetail,
  EligibilityRule,
  OfficialSource,
  Program,
  RequiredDocument,
  ResourceCatalog,
  Sourced,
} from "@/lib/resource-database/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertCatalog(input: unknown): ResourceCatalog {
  const catalog = input as ResourceCatalog;
  if (!catalog || catalog.schemaVersion !== 1) throw new Error("schemaVersion must be 1");
  const programs = requireArray<Program>(catalog.programs, "programs");
  const sources = requireArray<OfficialSource>(catalog.sources, "sources");
  const programIds = new Set(programs.map((program) => program.id));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  if (sourceById.size !== sources.length) throw new Error("source ids must be unique");
  if (programIds.size !== programs.length) throw new Error("program ids must be unique");

  for (const source of sources) {
    if (!source.url.startsWith("https://")) throw new Error(`${source.id} url must be https`);
    if (source.fetchOutcome === "not_fetched") {
      if (source.contentRetrieved || source.retrievedOn !== null || source.httpStatus !== null) {
        throw new Error(`${source.id} was not fetched and cannot carry a retrieval`);
      }
      if (source.reviewStatus !== "not_yet_reviewed") throw new Error(`${source.id} discovery source is not yet reviewed`);
    }
    if (source.fetchOutcome === "blocked") {
      if (source.contentRetrieved) throw new Error(`${source.id} was blocked and cannot be marked retrieved`);
      if (source.retrievedOn !== null) throw new Error(`${source.id} blocked fetch has no retrieval date`);
    }
    if (source.fetchOutcome === "fetched") {
      if (!source.contentRetrieved) throw new Error(`${source.id} fetched source must have content`);
      if (!source.retrievedOn || !DATE.test(source.retrievedOn)) throw new Error(`${source.id} needs a retrieval date`);
      if (source.httpStatus === null) throw new Error(`${source.id} fetched source needs an HTTP status`);
    }
    for (const programId of source.programIds) {
      if (!programIds.has(programId)) throw new Error(`${source.id} points at unknown program ${programId}`);
    }
  }

  const checkFields = (record: unknown, recordId: string) => {
    for (const field of collectFields(record, recordId, "unpublished")) {
      checkSourced(field.sourced, `${recordId}.${field.field}`, sourceById);
    }
  };

  const programFields = [
    "name",
    "administeringOrganization",
    "state",
    "county",
    "city",
    "serviceArea",
    "category",
    "subcategory",
    "description",
    "services",
    "applicationInstructions",
    "officialUrls",
    "submissionMethods",
    "openingStatus",
    "closingStatus",
    "waitlistStatus",
    "contactPhone",
    "contactEmail",
    "contactAddress",
    "contactHours",
    "accessibility",
  ] as const;
  for (const program of programs) {
    for (const key of programFields) {
      if (!isSourced(program[key])) throw new Error(`${program.id}.${key} is missing`);
    }
    checkFields(program, program.id);
  }
  for (const rule of requireArray<EligibilityRule>(catalog.eligibilityRules, "eligibilityRules")) {
    if (!programIds.has(rule.programId)) throw new Error(`${rule.id} has an unknown program`);
    checkFields(rule, rule.id);
  }
  for (const benefit of requireArray<BenefitDetail>(catalog.benefitDetails, "benefitDetails")) {
    if (!programIds.has(benefit.programId)) throw new Error(`${benefit.id} has an unknown program`);
    checkFields(benefit, benefit.id);
  }
  for (const document of requireArray<RequiredDocument>(catalog.requiredDocuments, "requiredDocuments")) {
    if (!programIds.has(document.programId)) throw new Error(`${document.id} has an unknown program`);
    checkFields(document, document.id);
  }
  const forms = requireArray<ApplicationForm>(catalog.applicationForms, "applicationForms");
  const formIds = new Set(forms.map((form) => form.id));
  for (const form of forms) {
    if (!programIds.has(form.programId)) throw new Error(`${form.id} has an unknown program`);
    if (form.schemaCompleteness === "not_available") {
      const questions = requireArray<ApplicationField>(catalog.applicationFields, "applicationFields").filter(
        (field) => field.formId === form.id,
      );
      if (questions.length > 0) throw new Error(`${form.id} has questions without a retrieved form`);
    }
    checkFields(form, form.id);
  }
  for (const field of requireArray<ApplicationField>(catalog.applicationFields, "applicationFields")) {
    if (!formIds.has(field.formId)) throw new Error(`${field.id} has an unknown form`);
    if (!programIds.has(field.programId)) throw new Error(`${field.id} has an unknown program`);
    checkFields(field, field.id);
  }
  for (const version of requireArray<ApplicationVersion>(catalog.applicationVersions, "applicationVersions")) {
    if (!formIds.has(version.formId)) throw new Error(`${version.id} has an unknown form`);
    if (!programIds.has(version.programId)) throw new Error(`${version.id} has an unknown program`);
    checkFields(version, version.id);
  }
  return catalog;
}

/** This seed is pending human review. Loading it must not yield published facts. */
export function assertUnpublishedSeed(catalog: ResourceCatalog): ResourceCatalog {
  for (const program of catalog.programs) {
    if (program.publicationStatus !== "unpublished") throw new Error(`${program.id} is not unpublished`);
    if (program.humanReviewStatus === "human_verified") throw new Error(`${program.id} is not human verified`);
  }
  const records = [
    ...catalog.programs,
    ...catalog.eligibilityRules,
    ...catalog.benefitDetails,
    ...catalog.requiredDocuments,
    ...catalog.applicationForms,
    ...catalog.applicationFields,
    ...catalog.applicationVersions,
  ];
  for (const record of records) {
    for (const field of collectFields(record, record.id, "unpublished")) {
      if (field.sourced.reviewStatus === "human_verified") {
        throw new Error(`${record.id}.${field.field} is marked human verified before review`);
      }
    }
  }
  return catalog;
}

function checkSourced(field: Sourced<unknown>, path: string, sources: Map<string, OfficialSource>) {
  if (!isSourced(field)) throw new Error(`${path} is not a sourced field`);
  if (field.support === "supported") {
    if (field.value === null) throw new Error(`${path} is supported but empty`);
    const provenance = field.provenance;
    if (!provenance) throw new Error(`${path} is supported without provenance`);
    if (!DATE.test(provenance.retrievedOn)) throw new Error(`${path} retrieval date is invalid`);
    if (provenance.basis.trim() === "") throw new Error(`${path} needs a basis`);
    const source = sources.get(provenance.sourceId);
    if (!source) throw new Error(`${path} cites unknown source ${provenance.sourceId}`);
    if (!source.contentRetrieved || source.fetchOutcome !== "fetched") {
      throw new Error(`${path} cites a source that was not retrieved`);
    }
    if (source.url !== provenance.sourceUrl) throw new Error(`${path} source URL does not match ${source.id}`);
    if (source.retrievedOn !== provenance.retrievedOn) throw new Error(`${path} retrieval date does not match ${source.id}`);
    return;
  }
  if (field.value !== null) throw new Error(`${path} has a value but is ${field.support}`);
  if (field.provenance !== null) throw new Error(`${path} has provenance but is ${field.support}`);
}

function requireArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value as T[];
}
