import { BARRIER_LABELS } from "@/lib/impact/catalog";
import { HP_ORDER } from "@/lib/impact/hp2030";
import { countCell, emptyCount, emptyRate, hiddenReportCells, presentRate, protectPartition } from "@/lib/impact/protect";
import type { HealthBlock, ImpactReport, RawBucket } from "@/lib/impact/types";
import type { RawTally } from "@/lib/impact/metrics";

function funnelCells(started: number, draft: number, submitted: number): ImpactReport["funnel"] {
  const dropBeforeDraft = started - draft;
  const dropBeforeSubmit = draft - submitted;
  const small = (n: number) => n > 0 && n < 11;
  const hide = small(started) || small(draft) || small(submitted) || small(dropBeforeDraft) || small(dropBeforeSubmit);
  if (hide && started + draft + submitted > 0) {
    const hidden = hiddenReportCells();
    return { started: hidden, draft: hidden, submitted: hidden, dropBeforeDraft: hidden, dropBeforeSubmit: hidden };
  }
  return {
    started: countCell(started),
    draft: countCell(draft),
    submitted: countCell(submitted),
    dropBeforeDraft: countCell(dropBeforeDraft),
    dropBeforeSubmit: countCell(dropBeforeSubmit),
  };
}

function relabel(rows: RawBucket[], labels: Record<string, string>) {
  return protectPartition(rows.map((row) => ({ ...row, label: labels[row.id] ?? row.label })));
}

export function healthBlocks(raw: RawTally | null, hidden: boolean): HealthBlock[] {
  return HP_ORDER.map((objectiveId) => {
    const row = raw?.health.find((item) => item.objectiveId === objectiveId);
    if (hidden || !row || !row.inFilter) {
      const blank = hidden ? hiddenReportCells() : emptyCount();
      const rate = hidden ? { ...emptyRate(), suppressed: true, unavailable: false } : emptyRate();
      return {
        objectiveId,
        inFilter: hidden ? false : Boolean(row?.inFilter),
        engagement: blank,
        intermediate: blank,
        selfReported: blank,
        verified: blank,
        baseline: rate,
        followUp: rate,
      };
    }
    return {
      objectiveId,
      inFilter: true,
      engagement: countCell(row.engagement),
      intermediate: countCell(row.intermediate),
      selfReported: countCell(row.selfReported),
      verified: countCell(row.verified),
      baseline: presentRate(row.baselinePositive, row.paired),
      followUp: presentRate(row.followUpPositive, row.paired),
    };
  });
}

export function metricsFromTally(raw: RawTally, hidden: boolean): Pick<
  ImpactReport,
  | "participating"
  | "active7"
  | "active30"
  | "assessmentCompletion"
  | "resourcesDiscovered"
  | "resourcesSaved"
  | "tasksStarted"
  | "tasksCompleted"
  | "actionCompletion"
  | "applicationsStarted"
  | "draftsSaved"
  | "submissionsConfirmed"
  | "goalsCompleted"
  | "outcomeReports"
  | "outcomesVerified"
  | "weekly"
  | "monthly"
  | "categories"
  | "barriers"
  | "cities"
  | "funnel"
  | "health"
> {
  if (hidden) {
    const hiddenCell = hiddenReportCells();
    const hiddenRate = { numerator: null, denominator: null, percent: null, suppressed: true, unavailable: false };
    return {
      participating: hiddenCell,
      active7: hiddenCell,
      active30: hiddenCell,
      assessmentCompletion: hiddenRate,
      resourcesDiscovered: hiddenCell,
      resourcesSaved: hiddenCell,
      tasksStarted: hiddenCell,
      tasksCompleted: hiddenCell,
      actionCompletion: hiddenRate,
      applicationsStarted: hiddenCell,
      draftsSaved: hiddenCell,
      submissionsConfirmed: hiddenCell,
      goalsCompleted: hiddenCell,
      outcomeReports: hiddenCell,
      outcomesVerified: hiddenCell,
      weekly: [],
      monthly: [],
      categories: [],
      barriers: [],
      cities: [],
      funnel: { started: hiddenCell, draft: hiddenCell, submitted: hiddenCell, dropBeforeDraft: hiddenCell, dropBeforeSubmit: hiddenCell },
      health: healthBlocks(null, true),
    };
  }
  return {
    participating: countCell(raw.participating),
    active7: countCell(raw.active7),
    active30: countCell(raw.active30),
    assessmentCompletion: presentRate(raw.assessmentCompleted, raw.assessmentStarted),
    resourcesDiscovered: countCell(raw.resourcesDiscovered),
    resourcesSaved: countCell(raw.resourcesSaved),
    tasksStarted: countCell(raw.tasksStarted),
    tasksCompleted: countCell(raw.tasksCompleted),
    actionCompletion: presentRate(raw.tasksCompleted, raw.tasksStarted),
    applicationsStarted: countCell(raw.applicationsStarted),
    draftsSaved: countCell(raw.draftsSaved),
    submissionsConfirmed: countCell(raw.submissionsConfirmed),
    goalsCompleted: countCell(raw.goalsCompleted),
    outcomeReports: countCell(raw.outcomeReports),
    outcomesVerified: countCell(raw.outcomesVerified),
    weekly: protectPartition(raw.weekly.filter((row) => row.n > 0)),
    monthly: protectPartition(raw.monthly.filter((row) => row.n > 0)),
    categories: protectPartition(raw.categories),
    barriers: relabel(raw.barriers, BARRIER_LABELS),
    cities: protectPartition(raw.cities),
    funnel: funnelCells(raw.funnelStarted, raw.funnelDraft, raw.funnelSubmitted),
    health: healthBlocks(raw, false),
  };
}
