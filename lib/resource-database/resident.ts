import { publishableValue } from "@/lib/resource-database/facts";
import type { EligibilityRule, Program, RequiredDocument, ResourceCatalog, Sourced } from "@/lib/resource-database/types";
import type {
  CatalogCategory,
  Channel,
  IncomeChart,
  IncomeChartRow,
  OfficialLink,
  VerifiedCatalogEntry,
} from "@/lib/types";

const CATEGORIES = new Set<CatalogCategory>([
  "food",
  "housing",
  "utilities",
  "health_coverage",
  "care_access",
  "employment",
  "training",
  "transportation",
  "digital",
  "family_care",
]);

const CHANNELS: Record<string, Channel> = {
  phone: "phone",
  in_person: "in_person",
  online_portal: "online",
  mail: "mail",
};

export const PREPARATION_NOTE = "Upwardia prepares an application. It does not submit one.";

const UNREAD_SITE_NOTE = "This address is printed on the official page. That site itself was not read.";

function fact<T>(field: Sourced<T>, publication: Program["publicationStatus"]): T | null {
  return publishableValue(field, publication);
}

function strings(value: string[] | null): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

/** A 1-through-9 income chart. A longer chart is refused so extra rows are not added. */
export function parseIncomeChart(value: string): IncomeChartRow[] | null {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 1 || lines.length > 9) return null;
  const rows: IncomeChartRow[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length !== 6) return null;
    const people = Number(parts[0]);
    if (!Number.isInteger(people)) return null;
    const [annual, monthly, twiceMonthly, biweekly, weekly] = parts.slice(1);
    const money = [annual, monthly, twiceMonthly, biweekly, weekly];
    if (money.some((amount) => !amount || !/^\$[\d,]+$/.test(amount))) return null;
    rows.push({ people, annual: annual!, monthly: monthly!, twiceMonthly: twiceMonthly!, biweekly: biweekly!, weekly: weekly! });
  }
  if (rows.some((row, index) => row.people !== index + 1)) return null;
  return rows;
}

function linkNote(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "benefitscal.com") return UNREAD_SITE_NOTE;
  } catch {
    return null;
  }
  return null;
}

function applicationUrl(urls: readonly string[]): string | null {
  const howToApply = urls.find((url) => /howcaniget/i.test(url));
  if (howToApply) return howToApply;
  return urls.find((url) => !/benefitscal\.com/i.test(url)) ?? urls[0] ?? null;
}

function documentLine(document: RequiredDocument, publication: Program["publicationStatus"]): string | null {
  const name = fact(document.name, publication);
  if (!name) return null;
  const strength = fact(document.requirementStrength, publication);
  const alternatives = strings(fact(document.alternatives, publication));
  const parts = [name.endsWith(".") ? name : `${name}.`];
  if (strength) parts.push(strength.endsWith(".") ? strength : `${strength}.`);
  if (alternatives.length > 0) parts.push(`Examples named on the page: ${alternatives.join(", ")}.`);
  return parts.join(" ");
}

function chartFor(rules: readonly EligibilityRule[], publication: Program["publicationStatus"]): IncomeChart | null {
  for (const rule of rules) {
    const threshold = fact(rule.threshold, publication);
    const from = fact(rule.effectiveFrom, publication);
    const to = fact(rule.effectiveTo, publication);
    if (!threshold || !from || !to || !rule.threshold.provenance) continue;
    const rows = parseIncomeChart(threshold);
    if (!rows) continue;
    return { effectiveFrom: from, effectiveTo: to, sourceUrl: rule.threshold.provenance.sourceUrl, rows };
  }
  return null;
}

function limitations(rules: readonly EligibilityRule[], area: string | null, publication: Program["publicationStatus"]): string[] {
  const lines: string[] = [];
  const staff: string[] = [];
  for (const rule of rules) {
    const statement = fact(rule.statement, publication);
    const exceptions = strings(fact(rule.exceptions, publication));
    for (const line of [statement, ...exceptions]) {
      if (!line) continue;
      if (/determine eligibility/i.test(line)) staff.push(line);
      else lines.push(line);
    }
  }
  if (area) lines.push(area);
  return [...new Set([...staff, ...lines])];
}

export function toResidentCatalog(catalog: ResourceCatalog): VerifiedCatalogEntry[] {
  const entries: VerifiedCatalogEntry[] = [];
  for (const program of catalog.programs) {
    if (program.publicationStatus !== "published") continue;
    const publication = program.publicationStatus;
    const name = fact(program.name, publication);
    const description = fact(program.description, publication);
    const sourceName = fact(program.administeringOrganization, publication);
    const category = fact(program.category, publication);
    const urls = strings(fact(program.officialUrls, publication));
    const retrievedOn = program.description.provenance?.retrievedOn;
    if (!name || !description || !sourceName || !category || !CATEGORIES.has(category as CatalogCategory) || urls.length === 0 || !retrievedOn) {
      continue;
    }
    const rules = catalog.eligibilityRules.filter((rule) => rule.programId === program.id);
    const documents = catalog.requiredDocuments
      .filter((document) => document.programId === program.id)
      .map((document) => documentLine(document, publication))
      .filter((line): line is string => Boolean(line));
    const methods = strings(fact(program.submissionMethods, publication));
    const channels = [...new Set(methods.map((method) => CHANNELS[method]).filter((channel): channel is Channel => Boolean(channel)))];
    const officialLinks: OfficialLink[] = urls.map((url) => ({ url, note: linkNote(url) }));
    const primary = applicationUrl(urls);
    const formNotes = catalog.applicationForms
      .filter((form) => form.programId === program.id)
      .flatMap((form) => {
        const formName = fact(form.name, publication);
        const instructions = fact(form.instructions, publication);
        if (!formName || !instructions) return [];
        return [`${formName}. ${instructions}`];
      });
    const applicationText = [fact(program.applicationInstructions, publication), ...formNotes].filter(Boolean).join(" ");
    entries.push({
      id: program.id,
      name,
      verified: true,
      sourceName,
      sourceUrl: primary ?? urls[0],
      lastVerified: retrievedOn,
      serviceAreaZips: "unknown",
      categories: [category as CatalogCategory],
      channels,
      phone: fact(program.contactPhone, publication),
      eligibility: {
        incomeCeiling: null,
        requiresZipInServiceArea: false,
        requiresChildren: null,
        statedRequirements: limitations(rules, fact(program.serviceArea, publication), publication),
      },
      claimText: description,
      officialLinks,
      applicationUrl: primary,
      applicationInstructions: applicationText || null,
      contactEmail: fact(program.contactEmail, publication),
      contactHours: fact(program.contactHours, publication),
      documents,
      services: strings(fact(program.services, publication)),
      incomeChart: chartFor(rules, publication),
      preparationNote: PREPARATION_NOTE,
    });
  }
  return entries;
}
