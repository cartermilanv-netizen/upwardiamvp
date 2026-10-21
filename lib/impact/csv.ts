import { HP2030, HP_ORDER } from "@/lib/impact/hp2030";
import type { CountCell, ImpactReport, LabeledCount, RateCell } from "@/lib/impact/types";

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

function line(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

function countText(cell: CountCell): string {
  if (cell.suppressed) return "suppressed";
  if (cell.value === null) return "";
  return String(cell.value);
}

function rateText(cell: RateCell): string {
  if (cell.suppressed) return "suppressed";
  if (cell.unavailable || cell.percent === null) return "";
  return String(cell.percent);
}

function rowsFor(title: string, rows: LabeledCount[]): string[] {
  return [line([title, "value"]), ...rows.map((row) => line([row.label, countText(row.count)]))];
}

export function reportToCsv(report: ImpactReport): string {
  const lines = [
    line(["dataset", report.dataset]),
    line(["notice", report.disclaimer]),
    line(["separation", report.separation.note]),
    line(["demo_participating_residents", countText(report.separation.demo)]),
    line(["live_participating_residents", countText(report.separation.live)]),
    line(["scope", report.scopeLabel]),
    line(["organization", report.organizationLabel ?? ""]),
    line(["from", report.applied.from.slice(0, 10)]),
    line(["to", report.applied.to.slice(0, 10)]),
    line(["city", report.applied.city ?? "All places in scope"]),
    line(["jurisdiction", report.applied.jurisdictionId ?? "All jurisdictions in scope"]),
    line(["program", report.applied.programId ?? "All programs"]),
    line(["category", report.applied.category ?? "All categories"]),
    line(["status", report.populationHidden ? "suppressed" : report.empty ? "empty" : "ok"]),
    line(["participating_residents", countText(report.participating)]),
    line(["active_7_days", countText(report.active7)]),
    line(["active_30_days", countText(report.active30)]),
    line(["assessments_completed", countText(report.assessmentsCompleted)]),
    line(["assessment_completion_percent", rateText(report.assessmentCompletion)]),
    line(["resources_discovered", countText(report.resourcesDiscovered)]),
    line(["resources_saved", countText(report.resourcesSaved)]),
    line(["tasks_started", countText(report.tasksStarted)]),
    line(["tasks_completed", countText(report.tasksCompleted)]),
    line(["action_completion_percent", rateText(report.actionCompletion)]),
    line(["applications_started", countText(report.applicationsStarted)]),
    line(["drafts_saved", countText(report.draftsSaved)]),
    line(["submissions_confirmed", countText(report.submissionsConfirmed)]),
    line(["goals_completed", countText(report.goalsCompleted)]),
    line(["outcome_reports", countText(report.outcomeReports)]),
    line(["outcomes_verified", countText(report.outcomesVerified)]),
    ...rowsFor("weekly_engagement", report.weekly),
    ...rowsFor("monthly_engagement", report.monthly),
    ...rowsFor("category_demand", report.categories),
    ...rowsFor("need_demand", report.needs),
    ...rowsFor("barriers", report.barriers),
    ...rowsFor("places", report.cities),
    line(["funnel_started", countText(report.funnel.started)]),
    line(["funnel_draft", countText(report.funnel.draft)]),
    line(["funnel_submitted", countText(report.funnel.submitted)]),
    line(["funnel_drop_before_draft", countText(report.funnel.dropBeforeDraft)]),
    line(["funnel_drop_before_submit", countText(report.funnel.dropBeforeSubmit)]),
  ];
  for (const objectiveId of HP_ORDER) {
    const block = report.health.find((item) => item.objectiveId === objectiveId);
    const official = HP2030[objectiveId];
    lines.push(line([`${objectiveId}_title`, official.title]));
    lines.push(line([`${objectiveId}_national_target`, official.targetLabel]));
    lines.push(line([`${objectiveId}_national_population`, official.nationalPopulation]));
    lines.push(line([`${objectiveId}_platform_baseline_percent`, block ? rateText(block.baseline) : ""]));
    lines.push(line([`${objectiveId}_platform_follow_up_percent`, block ? rateText(block.followUp) : ""]));
    lines.push(line([`${objectiveId}_engagement`, block ? countText(block.engagement) : ""]));
    lines.push(line([`${objectiveId}_intermediate`, block ? countText(block.intermediate) : ""]));
    lines.push(line([`${objectiveId}_self_reported`, block ? countText(block.selfReported) : ""]));
    lines.push(line([`${objectiveId}_verified`, block ? countText(block.verified) : ""]));
    lines.push(line([`${objectiveId}_separation`, official.separation]));
  }
  return `${lines.join("\n")}\n`;
}
