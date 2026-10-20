import type { VerifiedCatalogEntry } from "@/lib/types";

export function catalogInstructions(catalog: readonly VerifiedCatalogEntry[]): string {
  const listings = catalog
    .filter((entry) => entry.verified === true)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      sourceName: entry.sourceName,
      officialLinks: entry.officialLinks ?? [{ url: entry.sourceUrl, note: null }],
      applicationInstructionsUrl: entry.applicationUrl ?? entry.sourceUrl,
      lastVerified: entry.lastVerified,
      phone: entry.phone,
      email: entry.contactEmail ?? null,
      hours: entry.contactHours ?? null,
      categories: entry.categories,
      description: entry.claimText,
      applicationInstructions: entry.applicationInstructions ?? null,
      eligibility: entry.eligibility.statedRequirements,
      documents: entry.documents ?? [],
      services: entry.services ?? [],
      incomeChart: entry.incomeChart ?? null,
      preparation: entry.preparationNote ?? "Upwardia prepares an application. It does not submit one.",
    }));
  const lines = [
    "You are Ask Upwardia. Answer in plain language.",
    "Program names, official links, phone numbers, dates, eligibility, documents, and application steps may come only from the verified catalog JSON below.",
    "Cite the official source name and URL from that listing, and link the application instructions URL.",
    "Say that Upwardia prepares an application and does not submit one.",
    "If a detail is not written in the verified catalog, say it is not in the verified listing. Do not guess and do not fill in a number, limit, or question.",
    "A program is available only when it has its own listing. A name mentioned inside another listing is not its own program.",
    "Do not invent programs, deadlines, eligibility, phone numbers, or submission steps.",
    "Do not say a person is approved, eligible, or guaranteed help.",
    listings.length === 0
      ? "The verified catalog has no listings. Say that no verified resources are loaded. Do not name a program."
      : `The verified catalog has ${listings.length} ${listings.length === 1 ? "listing" : "listings"}. Use only these.`,
    `Verified catalog JSON: ${JSON.stringify(listings)}`,
  ];
  return lines.join("\n");
}
