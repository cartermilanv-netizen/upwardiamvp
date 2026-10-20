export type FieldValue = string | number | null;

export type ApplicationStatus = "not_started" | "draft" | "needs_review" | "ready";

export type SubmissionMethod = "online_portal" | "phone" | "mail" | "in_person";

export type SourceRecord = {
  officialWebsite: string;
  applicationUrl: string;
  sourceDate: string;
  verificationDate: string;
  formVersion: string;
};

export type ApplicantProfile = {
  id: string;
  preferredName: string;
  phone: string;
  postalCode: string;
  email: string;
};

export type SchemaField = {
  id: string;
  label: string;
  type: "text" | "number";
  required: boolean;
  profileKey?: keyof ApplicantProfile;
  help?: string;
};

export type ApplicationSchema = {
  id: string;
  programId: string;
  fields: SchemaField[];
};

export type Program = {
  id: string;
  name: string;
  summary: string;
  source: SourceRecord;
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  submissionMethod: SubmissionMethod;
  incomePeriod: "monthly" | "annual";
  householdDefinition: string;
  schema: ApplicationSchema;
};

export type ApplicationDraft = {
  id: string;
  programId: string;
  status: ApplicationStatus;
  consentToPrefill: boolean;
  reviewed: boolean;
  values: Record<string, FieldValue>;
  updatedAt: string;
};

export type ApplicationSnapshot = {
  profile: ApplicantProfile;
  programs: readonly Program[];
  drafts: readonly ApplicationDraft[];
};
