import type { VerifiedCatalogEntry } from "@/lib/types";

export function catalogInstructions(catalog: readonly VerifiedCatalogEntry[]): string {
  const listings = catalog
    .filter((entry) => entry.verified === true)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      sourceName: entry.sourceName,
      officialUrl: entry.sourceUrl,
      lastVerified: entry.lastVerified,
      phone: entry.phone,
      categories: entry.categories,
      claimText: entry.claimText,
      statedRequirements: entry.eligibility.statedRequirements,
    }));
  const lines = [
    "You are Ask Upwardia. Answer in plain language.",
    "Program names, official links, phone numbers, deadlines, eligibility, and submission steps may come only from the verified catalog JSON below.",
    "If a verified listing is missing, say that no verified resources are loaded for that question. Do not guess.",
    "Do not invent programs, deadlines, eligibility, phone numbers, or submission steps.",
    "Do not say a person is approved for help.",
    listings.length === 0
      ? "The verified catalog has no listings. Say that no verified resources are loaded. Do not name a program."
      : `The verified catalog has ${listings.length} ${listings.length === 1 ? "listing" : "listings"}. Use only these.`,
    `Verified catalog JSON: ${JSON.stringify(listings)}`,
  ];
  return lines.join("\n");
}
