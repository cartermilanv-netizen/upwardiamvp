import { getDb } from "@/lib/impact/db";
import { buildImpactReport } from "@/lib/impact/report";
import { readPrincipal } from "@/lib/impact/session";

export async function GET(request: Request) {
  const principal = await readPrincipal();
  if (!principal) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const report = buildImpactReport(getDb(), principal, queryOf(request));
  return Response.json(report, { headers: { "cache-control": "no-store" } });
}

function queryOf(request: Request): Record<string, string> {
  const raw: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}
