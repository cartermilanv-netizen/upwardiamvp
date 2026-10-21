const SAVED_RESOURCES_KEY = "upwardia.savedResources.v1";
const SAVED_RESOURCES_EVENT = "upwardia-saved-resources";

export function subscribeSavedResources(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener("storage", onChange);
  window.addEventListener(SAVED_RESOURCES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAVED_RESOURCES_EVENT, onChange);
  };
}

export function readSavedResourcesRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SAVED_RESOURCES_KEY);
}

export function parseSavedProgramIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as { programIds?: unknown } | null;
    if (!data || !Array.isArray(data.programIds)) return [];
    return data.programIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 160);
  } catch {
    return [];
  }
}

function writeSavedProgramIds(ids: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify({ programIds: ids }));
  window.dispatchEvent(new Event(SAVED_RESOURCES_EVENT));
}

export function savedProgramIds(): string[] {
  return parseSavedProgramIds(readSavedResourcesRaw());
}

export function isProgramSaved(programId: string): boolean {
  return savedProgramIds().includes(programId);
}

export function setProgramSaved(programId: string, saved: boolean): void {
  const current = savedProgramIds();
  const next = saved ? (current.includes(programId) ? current : [...current, programId]) : current.filter((id) => id !== programId);
  writeSavedProgramIds(next);
}
