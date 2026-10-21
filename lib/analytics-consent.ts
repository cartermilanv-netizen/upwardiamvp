export const ANALYTICS_CONSENT_KEY = "upwardia.analyticsConsent.v1";
const CHANGE = "upwardia-analytics-consent";

export type AnalyticsChoice = {
  state: "granted" | "declined" | "withdrawn";
  residentId: string | null;
};

export function subscribeAnalyticsChoice(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onChange = () => listener();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export function readAnalyticsChoice(): AnalyticsChoice | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<AnalyticsChoice> | null;
    if (!data || (data.state !== "granted" && data.state !== "declined" && data.state !== "withdrawn")) return null;
    return { state: data.state, residentId: typeof data.residentId === "string" ? data.residentId : null };
  } catch {
    return null;
  }
}

export function writeAnalyticsChoice(choice: AnalyticsChoice | null): void {
  if (typeof window === "undefined") return;
  if (!choice) window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  else window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(choice));
  window.dispatchEvent(new Event(CHANGE));
}
