import { reportToCsv } from "@/lib/impact/csv";
import { getDb, writeAudit } from "@/lib/impact/db";
import { buildImpactReport } from "@/lib/impact/report";
import { readPrincipal } from "@/lib/impact/session";

export async function GET(request: Request) {
  const principal = await readPrincipal();
  if (!principal) {
    return new Response("Authentication required.", { status: 401, headers: { "cache-control": "no-store" } });
  }
  const db = getDb();
  const report = buildImpactReport(db, principal, queryOf(request));
  writeAudit(db, principal.userId, "export_report", report.populationHidden ? "suppressed" : "ok", new Date().toISOString());
  return new Response(reportToCsv(report), {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=upwardia-impact-demonstration.csv",
    },
  });
}

function queryOf(request: Request): Record<string, string> {
  const raw: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}
