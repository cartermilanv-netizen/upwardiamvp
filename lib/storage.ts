import type { DraftAssessment, MicroAction } from "@/lib/types";

export const STORAGE_KEY = "upwardia.householdAssessment.v1";
const STORAGE_EVENT = "upwardia-household-storage";

export function subscribePrototype(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

export function readPrototypeRaw(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

function emitStorage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export type StoredPrototype = {
  assessment: DraftAssessment;
  actions: MicroAction[];
};

export function parseStored(raw: string): StoredPrototype | null {
  try {
    const data = JSON.parse(raw) as Partial<StoredPrototype> | null;
    if (!data || typeof data !== "object") return null;
    if (!data.assessment || data.assessment.schemaVersion !== 1) return null;
    if (!Array.isArray(data.actions)) return null;
    return { assessment: data.assessment, actions: data.actions };
  } catch {
    return null;
  }
}

export function loadPrototype(): StoredPrototype | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseStored(raw);
  if (!parsed) {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return parsed;
}

export function savePrototype(data: StoredPrototype): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  emitStorage();
}

export function deletePrototype(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitStorage();
}
