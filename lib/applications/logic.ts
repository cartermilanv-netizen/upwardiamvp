import type {
  ApplicantProfile,
  ApplicationSchema,
  FieldValue,
  Program,
  SchemaField,
} from "@/lib/applications/types";

export type FieldError = { id: string; message: string };

export function isBlank(value: FieldValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function missingFieldIds(schema: ApplicationSchema, values: Record<string, FieldValue>): string[] {
  return schema.fields.filter((field) => field.required && isBlank(values[field.id])).map((field) => field.id);
}

export function prefillFromProfile(
  schema: ApplicationSchema,
  profile: ApplicantProfile,
  consent: boolean,
): Record<string, FieldValue> {
  if (!consent) return {};
  const filled: Record<string, FieldValue> = {};
  for (const field of schema.fields) {
    if (!field.profileKey) continue;
    const value = profile[field.profileKey];
    if (!isBlank(value)) filled[field.id] = value;
  }
  return filled;
}

export function mergePrefill(
  current: Record<string, FieldValue>,
  incoming: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const next = { ...current };
  for (const [id, value] of Object.entries(incoming)) {
    if (isBlank(next[id])) next[id] = value;
  }
  return next;
}

function isNumeric(value: FieldValue): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim());
}

export function validateDraft(schema: ApplicationSchema, values: Record<string, FieldValue>): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of schema.fields) {
    const value = values[field.id];
    if (field.required && isBlank(value)) {
      errors.push({ id: field.id, message: "Add this answer." });
      continue;
    }
    if (isBlank(value)) continue;
    if (field.type === "number" && !isNumeric(value)) {
      errors.push({ id: field.id, message: "Use a number." });
    }
    if (field.id === "postalCode" && !/^\d{5}$/.test(String(value).trim())) {
      errors.push({ id: field.id, message: "Use a 5-digit ZIP code." });
    }
  }
  return errors;
}

export function fieldById(schema: ApplicationSchema, id: string): SchemaField | undefined {
  return schema.fields.find((field) => field.id === id);
}

export function requiredProgress(schema: ApplicationSchema, values: Record<string, FieldValue>): { filled: number; required: number } {
  const required = schema.fields.filter((field) => field.required);
  const filled = required.filter((field) => !isBlank(values[field.id])).length;
  return { filled, required: required.length };
}

export function programById(programs: readonly Program[], id: string): Program | undefined {
  return programs.find((program) => program.id === id);
}

export function submissionLabel(method: Program["submissionMethod"]): string {
  if (method === "online_portal") return "Online portal (demonstration)";
  if (method === "phone") return "Phone (demonstration)";
  if (method === "mail") return "Mail (demonstration)";
  return "In person (demonstration)";
}
