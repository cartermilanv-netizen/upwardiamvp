import type { ApplicantProfile, ApplicationDraft, Program } from "@/lib/applications/types";

/** Fictional person. Not a resident record and not written to the browser. */
export const demonstrationProfile: ApplicantProfile = {
  id: "profile-avery-example",
  preferredName: "Avery Example",
  phone: "555-0100",
  postalCode: "99999",
  email: "avery.example@example.com",
};

const pantrySchema = {
  id: "schema-harbor-pantry-demo-1",
  programId: "harbor-pantry-box",
  fields: [
    { id: "preferredName", label: "Name", type: "text" as const, required: true, profileKey: "preferredName" as const },
    { id: "phone", label: "Phone", type: "text" as const, required: true, profileKey: "phone" as const },
    { id: "postalCode", label: "ZIP code", type: "text" as const, required: true, profileKey: "postalCode" as const },
    {
      id: "peopleSharingMeals",
      label: "People who share meals",
      type: "number" as const,
      required: true,
      help: "Count people who usually eat together. This is not the same as adults on a lease.",
    },
    {
      id: "monthlyIncome",
      label: "Monthly income before taxes",
      type: "number" as const,
      required: true,
      help: "A monthly amount. Do not enter a yearly amount here.",
    },
  ],
};

const utilitySchema = {
  id: "schema-northline-pause-demo-1",
  programId: "northline-utility-pause",
  fields: [
    { id: "preferredName", label: "Name", type: "text" as const, required: true, profileKey: "preferredName" as const },
    { id: "phone", label: "Phone", type: "text" as const, required: true, profileKey: "phone" as const },
    { id: "postalCode", label: "ZIP code", type: "text" as const, required: true, profileKey: "postalCode" as const },
    {
      id: "leaseAdults",
      label: "Adults on the lease",
      type: "number" as const,
      required: true,
      help: "Adults named on the lease. Children are a separate question.",
    },
    {
      id: "dependentChildren",
      label: "Dependent children",
      type: "number" as const,
      required: true,
    },
    {
      id: "annualIncome",
      label: "Yearly income before taxes",
      type: "number" as const,
      required: true,
      help: "A yearly amount. A monthly figure from another form is not copied here.",
    },
  ],
};

export const demonstrationPrograms: readonly Program[] = [
  {
    id: "harbor-pantry-box",
    name: "Harbor Pantry Box",
    summary: "A made-up food box used to show how a form can be filled and saved.",
    source: {
      officialWebsite: "https://example.com/harbor-pantry",
      applicationUrl: "https://example.com/harbor-pantry/apply",
      sourceDate: "2026-03-01",
      verificationDate: "2026-03-15",
      formVersion: "demo-1",
    },
    eligibilityCriteria: [
      "Demonstration rule: the household shares meals.",
      "Demonstration rule: monthly income is the figure this form asks for.",
    ],
    requiredDocuments: ["A sample photo ID (not a real document)", "A sample proof of address"],
    submissionMethod: "online_portal",
    incomePeriod: "monthly",
    householdDefinition: "People who usually share meals.",
    schema: pantrySchema,
  },
  {
    id: "northline-utility-pause",
    name: "Northline Utility Pause",
    summary: "A made-up utility pause used to show a second form with different questions.",
    source: {
      officialWebsite: "https://example.com/northline-pause",
      applicationUrl: "https://example.com/northline-pause/apply",
      sourceDate: "2026-02-11",
      verificationDate: "2026-02-20",
      formVersion: "demo-1",
    },
    eligibilityCriteria: [
      "Demonstration rule: adults are the people named on the lease.",
      "Demonstration rule: yearly income is the figure this form asks for.",
    ],
    requiredDocuments: ["A sample lease page", "A sample utility bill"],
    submissionMethod: "mail",
    incomePeriod: "annual",
    householdDefinition: "Adults on the lease, plus dependent children counted separately.",
    schema: utilitySchema,
  },
];

export const demonstrationDrafts: readonly ApplicationDraft[] = [
  {
    id: "draft-harbor",
    programId: "harbor-pantry-box",
    status: "draft",
    consentToPrefill: true,
    reviewed: false,
    values: {
      preferredName: demonstrationProfile.preferredName,
      phone: demonstrationProfile.phone,
      postalCode: demonstrationProfile.postalCode,
      peopleSharingMeals: null,
      monthlyIncome: null,
    },
    updatedAt: "2026-04-02T15:00:00.000Z",
  },
  {
    id: "draft-northline",
    programId: "northline-utility-pause",
    status: "not_started",
    consentToPrefill: false,
    reviewed: false,
    values: {},
    updatedAt: "2026-04-02T15:00:00.000Z",
  },
];
