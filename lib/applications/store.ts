import { demonstrationDrafts, demonstrationProfile, demonstrationPrograms } from "@/lib/applications/catalog";
import { mergePrefill, missingFieldIds, prefillFromProfile, validateDraft } from "@/lib/applications/logic";
import type { ApplicationDraft, ApplicationSnapshot, ApplicationStatus, FieldValue, Program } from "@/lib/applications/types";

function createSeed(): ApplicationSnapshot {
  return {
    profile: { ...demonstrationProfile },
    programs: demonstrationPrograms,
    drafts: demonstrationDrafts.map((draft) => ({ ...draft, values: { ...draft.values } })),
  };
}

const serverSeed = createSeed();
let state: ApplicationSnapshot = serverSeed;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function statusFor(program: Program, draft: Pick<ApplicationDraft, "consentToPrefill" | "reviewed" | "values">): ApplicationStatus {
  const missing = missingFieldIds(program.schema, draft.values);
  const errors = validateDraft(program.schema, draft.values);
  if (draft.reviewed && missing.length === 0 && errors.length === 0) return "ready";
  const started = draft.consentToPrefill || Object.values(draft.values).some((value) => value !== null && value !== undefined && String(value).trim() !== "");
  return started ? "draft" : "not_started";
}

function replaceDraft(id: string, recipe: (draft: ApplicationDraft, program: Program) => ApplicationDraft): void {
  state = {
    ...state,
    drafts: state.drafts.map((draft) => {
      if (draft.id !== id) return draft;
      const program = state.programs.find((item) => item.id === draft.programId);
      if (!program) return draft;
      return recipe(draft, program);
    }),
  };
  emit();
}

export function subscribeApplications(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApplicationSnapshot(): ApplicationSnapshot {
  return state;
}

export function getServerApplicationSnapshot(): ApplicationSnapshot {
  return serverSeed;
}

export function resetApplicationStore(): void {
  state = createSeed();
  emit();
}

export function getDraft(id: string): ApplicationDraft | undefined {
  return state.drafts.find((draft) => draft.id === id);
}

export function updateDraftValues(id: string, values: Record<string, FieldValue>): ApplicationDraft | undefined {
  replaceDraft(id, (draft, program) => {
    const next = { ...draft, values: { ...values }, reviewed: false, updatedAt: new Date().toISOString() };
    return { ...next, status: statusFor(program, next) };
  });
  return getDraft(id);
}

export function grantPrefillConsent(id: string): ApplicationDraft | undefined {
  replaceDraft(id, (draft, program) => {
    const incoming = prefillFromProfile(program.schema, state.profile, true);
    const values = mergePrefill(draft.values, incoming);
    const next = { ...draft, consentToPrefill: true, values, reviewed: false, updatedAt: new Date().toISOString() };
    return { ...next, status: statusFor(program, next) };
  });
  return getDraft(id);
}

export function markDraftReviewed(id: string): ApplicationDraft | undefined {
  replaceDraft(id, (draft, program) => {
    const errors = validateDraft(program.schema, draft.values);
    const missing = missingFieldIds(program.schema, draft.values);
    const reviewed = errors.length === 0 && missing.length === 0;
    const next = { ...draft, reviewed, updatedAt: new Date().toISOString() };
    return { ...next, status: reviewed ? "ready" : "needs_review" };
  });
  return getDraft(id);
}
