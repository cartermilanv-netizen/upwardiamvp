/** Unpublished official-source records. Not the resident catalog and not a demonstration form. */

export type Support = "supported" | "requires_verification" | "not_found";

export type ReviewStatus =
  | "not_yet_reviewed"
  | "extracted_pending_review"
  | "human_verified"
  | "rejected";

export type PublicationStatus = "unpublished" | "published";

export type Provenance = {
  sourceId: string;
  sourceUrl: string;
  /** Calendar day the source body was retrieved, YYYY-MM-DD. */
  retrievedOn: string;
  /** Short note of what that page supports. Not a copy of the page. */
  basis: string;
};

/** A substantive value. `supported` is still not a fact until review and publication. */
export type Sourced<T> = {
  value: T | null;
  support: Support;
  reviewStatus: ReviewStatus;
  provenance: Provenance | null;
};

export type FetchOutcome = "fetched" | "blocked" | "not_fetched";

export type SourceRole =
  | "program_page"
  | "forms_directory"
  | "eligibility_page"
  | "application_portal"
  | "account_signup"
  | "terms"
  | "discovery_seed";

export type OfficialSource = {
  id: string;
  programIds: string[];
  url: string;
  role: SourceRole;
  fetchOutcome: FetchOutcome;
  /** HTTP status of the retrieval attempt. Null when the URL was not requested. */
  httpStatus: number | null;
  /** True only when a program or terms body was returned, not an access interstitial. */
  contentRetrieved: boolean;
  retrievedOn: string | null;
  robots: string;
  termsNote: string;
  apiOrFeed: string;
  reviewStatus: ReviewStatus;
  notes: string;
};

export type Program = {
  id: string;
  publicationStatus: PublicationStatus;
  humanReviewStatus: ReviewStatus;
  name: Sourced<string>;
  administeringOrganization: Sourced<string>;
  state: Sourced<string>;
  county: Sourced<string>;
  city: Sourced<string>;
  serviceArea: Sourced<string>;
  category: Sourced<string>;
  subcategory: Sourced<string>;
  description: Sourced<string>;
  services: Sourced<string[]>;
  applicationInstructions: Sourced<string>;
  officialUrls: Sourced<string[]>;
  submissionMethods: Sourced<string[]>;
  openingStatus: Sourced<string>;
  closingStatus: Sourced<string>;
  waitlistStatus: Sourced<string>;
  contactPhone: Sourced<string>;
  contactEmail: Sourced<string>;
  contactAddress: Sourced<string>;
  contactHours: Sourced<string>;
  accessibility: Sourced<string>;
};

export type EligibilityRule = {
  id: string;
  programId: string;
  statement: Sourced<string>;
  exceptions: Sourced<string[]>;
  effectiveFrom: Sourced<string>;
  effectiveTo: Sourced<string>;
  householdDefinition: Sourced<string>;
  threshold: Sourced<string>;
  householdFactor: Sourced<string>;
};

export type BenefitDetail = {
  id: string;
  programId: string;
  statement: Sourced<string>;
  effectiveFrom: Sourced<string>;
  effectiveTo: Sourced<string>;
};

export type RequiredDocument = {
  id: string;
  programId: string;
  name: Sourced<string>;
  alternatives: Sourced<string[]>;
  requirementStrength: Sourced<string>;
};

export type SchemaCompleteness = "directory_only" | "partial_page" | "not_available";

export type ApplicationForm = {
  id: string;
  programId: string;
  name: Sourced<string>;
  url: Sourced<string>;
  instructions: Sourced<string>;
  /** Whether the fetched page is the form itself. A directory does not supply questions. */
  schemaCompleteness: SchemaCompleteness;
};

export type ApplicationField = {
  id: string;
  formId: string;
  programId: string;
  label: Sourced<string>;
  required: Sourced<boolean>;
  conditionalLogic: Sourced<string>;
};

export type ApplicationVersion = {
  id: string;
  formId: string;
  programId: string;
  versionLabel: Sourced<string>;
  effectiveFrom: Sourced<string>;
  effectiveTo: Sourced<string>;
};

export type ResourceCatalog = {
  schemaVersion: 1;
  /** Program ids cleared for the resident catalog. Every other program stays unpublished. */
  publishedProgramIds: string[];
  programs: Program[];
  sources: OfficialSource[];
  eligibilityRules: EligibilityRule[];
  benefitDetails: BenefitDetail[];
  requiredDocuments: RequiredDocument[];
  applicationForms: ApplicationForm[];
  applicationFields: ApplicationField[];
  applicationVersions: ApplicationVersion[];
};

export type Fact<T> = {
  recordId: string;
  field: string;
  value: T;
  provenance: Provenance;
};
