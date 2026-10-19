import type { DigitalAccess, DraftAssessment } from "@/lib/types";

const DEVICES: DigitalAccess[] = ["smartphone", "computer", "tablet", "shared_computer"];

export type DigitalFlags = {
  none: boolean;
  uncomfort: boolean;
  intermittent: boolean;
};

export function digitalFlags(draft: DraftAssessment): DigitalFlags {
  const access = draft.digital.access;
  let none = false;
  let intermittent = false;
  if (access?.status === "answered") {
    if (access.value.includes("none")) {
      none = true;
    } else {
      none = !access.value.some((value) => DEVICES.includes(value));
      intermittent = !access.value.includes("wifi_home") && access.value.some((value) => value !== "wifi_home");
    }
  }
  const comfort = draft.digital.comfort;
  let uncomfort = false;
  if (comfort?.status === "answered") {
    if (comfort.value === "uncomfortable") uncomfort = true;
    if (comfort.value === "with_help" && none) uncomfort = true;
  }
  return { none, uncomfort, intermittent };
}

export function hasDigitalFlag(draft: DraftAssessment): boolean {
  const flags = digitalFlags(draft);
  return flags.none || flags.uncomfort || flags.intermittent;
}

function sensitiveGranted(draft: DraftAssessment): boolean {
  return draft.sensitiveConsent === "granted";
}

export function hasTransportationBarrier(draft: DraftAssessment): boolean {
  const modes = draft.transportation.modes;
  if (modes?.status === "answered" && modes.value.includes("cannot_get_there")) return true;
  const reliability = draft.transportation.reliability;
  if (reliability?.status === "answered" && reliability.value === "rarely") return true;
  const destinations = draft.transportation.hardToReach;
  if (destinations?.status === "answered" && destinations.value.some((value) => value !== "not_hard")) return true;
  if (sensitiveGranted(draft) && draft.health?.consent === "granted") {
    const care = draft.health.careBarriers;
    if (care?.status === "answered" && care.value.includes("transport")) return true;
  }
  const barriers = draft.educationEmployment.employmentBarriers;
  if (barriers?.status === "answered" && barriers.value.includes("transportation")) return true;
  return false;
}
