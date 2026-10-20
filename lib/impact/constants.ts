export const DEMO_AS_OF = "2026-10-20T23:59:59.000Z";
export const REPORTING_MINIMUM = 11;
export const SESSION_COOKIE = "upwardia_impact_session";
export const SESSION_HOURS = 12;
export const SEED_VERSION = "2";
export const EVENT_RETENTION_DAYS = 730;
export const OUTCOME_RETENTION_DAYS = 730;
export const AUDIT_RETENTION_DAYS = 365;
export const FOLLOW_UP_DAYS = 90;

export const DISCLAIMER = "Demonstration data. These numbers are not actual Upwardia results.";

export function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
}

export function startOfDay(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T00:00:00.000Z`;
}

export function endOfDay(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T23:59:59.000Z`;
}

export function rangeEnding(asOf: string, days: number): { from: string; to: string } {
  const to = endOfDay(asOf);
  const from = startOfDay(plusDays(to, -days));
  return { from, to };
}

export function weekStart(iso: string): string {
  const date = new Date(iso);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
