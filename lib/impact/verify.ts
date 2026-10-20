import type { EvidenceKind } from "@/lib/impact/types";

export function assertVerification(evidence: EvidenceKind, method: string | null, source: string | null): void {
  if (evidence !== "verified") return;
  if (!method || !source) {
    throw new Error("A verified outcome requires a verification method and a verification source.");
  }
}
