import { logoutAction } from "@/app/impact/actions";
import { ImpactShell } from "@/components/impact/shell";
import { ReportView } from "@/components/impact/report-view";
import { getDb } from "@/lib/impact/db";
import { buildImpactReport } from "@/lib/impact/report";
import { requirePrincipal } from "@/lib/impact/session";

export async function ImpactScreen({
  searchParams,
  view,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  view: "overview" | "funnel" | "health";
}) {
  const principal = await requirePrincipal();
  const raw = await searchParams;
  const report = buildImpactReport(getDb(), principal, raw);
  const current = view === "funnel" ? "/impact/funnel" : view === "health" ? "/impact/health" : "/impact";
  const shown = view === "funnel" ? "funnel" : view === "health" ? "health" : "overview";
  return (
    <ImpactShell principal={principal} filters={report.applied} current={current} logout={logoutAction}>
      <ReportView report={report} view={shown} />
    </ImpactShell>
  );
}
