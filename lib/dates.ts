export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

export function isInLocalWeek(completedAt: string, now: Date): boolean {
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return false;
  const start = startOfLocalWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return completed >= start && completed < end;
}

export function verifiedDateLabel(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (match) return match[1];
  return value;
}
