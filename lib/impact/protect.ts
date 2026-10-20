import { REPORTING_MINIMUM } from "@/lib/impact/constants";
import type { CountCell, RateCell, RawBucket } from "@/lib/impact/types";

export function countCell(n: number): CountCell {
  if (n > 0 && n < REPORTING_MINIMUM) return { value: null, suppressed: true };
  return { value: n, suppressed: false };
}

export function shouldSuppressCohort(filtered: number, base?: number): boolean {
  if (filtered > 0 && filtered < REPORTING_MINIMUM) return true;
  if (base === undefined) return false;
  const removed = base - filtered;
  return removed > 0 && removed < REPORTING_MINIMUM;
}

/**
 * Hides partition cells under the reporting minimum.
 * If one hidden cell could be recovered by subtracting the visible cells from the total,
 * more cells are hidden until the concealed remainder is itself at least the minimum
 * and is not a single cell.
 */
export function protectPartition(rows: readonly RawBucket[]): { id: string; label: string; count: CountCell }[] {
  const hidden = new Set<string>();
  const positive = rows.filter((row) => row.n > 0);
  for (const row of positive) {
    if (row.n < REPORTING_MINIMUM) hidden.add(row.id);
  }
  const hiddenSum = () => positive.filter((row) => hidden.has(row.id)).reduce((sum, row) => sum + row.n, 0);
  let guard = 0;
  while (guard < positive.length) {
    guard += 1;
    const concealed = hiddenSum();
    const visible = positive.filter((row) => !hidden.has(row.id));
    const remainderTooSmall = concealed > 0 && concealed < REPORTING_MINIMUM;
    const singleHidden = hidden.size === 1 && visible.length > 0;
    if (!remainderTooSmall && !singleHidden) break;
    if (visible.length === 0) break;
    const next = [...visible].sort((a, b) => a.n - b.n || a.id.localeCompare(b.id))[0];
    if (!next) break;
    hidden.add(next.id);
  }
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    count: row.n === 0 ? { value: 0, suppressed: false } : hidden.has(row.id) ? { value: null, suppressed: true } : { value: row.n, suppressed: false },
  }));
}

export function presentRate(positive: number, denominator: number): RateCell {
  if (denominator === 0) {
    return { numerator: null, denominator: null, percent: null, suppressed: false, unavailable: true };
  }
  const negative = denominator - positive;
  const small = (n: number) => n > 0 && n < REPORTING_MINIMUM;
  if (small(denominator) || small(positive) || small(negative)) {
    return { numerator: null, denominator: null, percent: null, suppressed: true, unavailable: false };
  }
  return {
    numerator: positive,
    denominator,
    percent: Math.round((positive / denominator) * 1000) / 10,
    suppressed: false,
    unavailable: false,
  };
}

export function hiddenReportCells(): CountCell {
  return { value: null, suppressed: true };
}

export function emptyCount(): CountCell {
  return { value: 0, suppressed: false };
}

export function emptyRate(): RateCell {
  return { numerator: null, denominator: null, percent: null, suppressed: false, unavailable: true };
}
