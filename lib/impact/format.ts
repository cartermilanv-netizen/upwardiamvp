import type { CountCell, RateCell } from "@/lib/impact/types";

export function showCount(cell: CountCell): string {
  if (cell.suppressed) return "Suppressed";
  if (cell.value === null) return "—";
  return new Intl.NumberFormat("en-US").format(cell.value);
}

export function showRate(cell: RateCell): string {
  if (cell.suppressed) return "Suppressed";
  if (cell.unavailable || cell.percent === null) return "—";
  return `${cell.percent}%`;
}

export function rateDetail(cell: RateCell): string {
  if (cell.suppressed) return "Hidden because a count in this rate is below 11.";
  if (cell.unavailable || cell.numerator === null || cell.denominator === null) return "No one is in this denominator.";
  return `${cell.numerator} of ${cell.denominator}`;
}
