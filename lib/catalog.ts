import { loadResourceCatalog } from "@/lib/resource-database/load";
import { toResidentCatalog } from "@/lib/resource-database/resident";
import type { VerifiedCatalogEntry } from "@/lib/types";

/** Resident matches render only from published, human-verified fields. */
export const residentCatalog: readonly VerifiedCatalogEntry[] = toResidentCatalog(loadResourceCatalog());
