import { BARRIER_LABELS } from "@/lib/impact/catalog";
import { DISCLAIMER, DEMO_AS_OF } from "@/lib/impact/constants";
import { directoryFor, loadFacts, scopeLabel, writeAudit, type ScopedFacts } from "@/lib/impact/db";
import { tally, type TallyInput } from "@/lib/impact/metrics";
import { metricsFromTally } from "@/lib/impact/present";
import { shouldSuppressCohort } from "@/lib/impact/protect";
import { parseFilters, type RawQuery } from "@/lib/impact/query";
import type { DatabaseSync } from "node:sqlite";
import { CATEGORY_IDS, type ImpactReport, type Principal } from "@/lib/impact/types";

const HIDDEN_REASON =
  "Counts are hidden. This view has too few people, or it removes too small a group from a larger one, to show numbers without identifying someone.";

function tallyInput(facts: ScopedFacts, filters: Omit<TallyInput, "residents" | "events" | "outcomes" | "barriers" | "categories" | "barrierIds">): TallyInput {
  return {
    residents: facts.residents,
    events: facts.events,
    outcomes: facts.outcomes,
    barriers: facts.barriers,
    categories: CATEGORY_IDS,
    barrierIds: Object.keys(BARRIER_LABELS),
    ...filters,
  };
}

function citiesFor(facts: ScopedFacts, jurisdictionId: string | null): string[] {
  return [...new Set(facts.residents.filter((resident) => !jurisdictionId || resident.jurisdictionId === jurisdictionId).map((resident) => resident.city))].sort();
}

export function buildImpactReport(db: DatabaseSync, principal: Principal, raw: RawQuery, nowIso = new Date().toISOString()): ImpactReport {
  const directory = directoryFor(db, principal);
  const applied = parseFilters(raw, principal, directory, DEMO_AS_OF);
  const facts = loadFacts(db, principal);
  const dated = { from: applied.from, to: applied.to };
  const base = tally(
    tallyInput(facts, { ...dated, city: null, jurisdictionId: null, programId: null, category: null, cities: citiesFor(facts, null) }),
  );
  const afterJurisdiction = tally(
    tallyInput(facts, {
      ...dated,
      city: null,
      jurisdictionId: applied.jurisdictionId,
      programId: null,
      category: null,
      cities: citiesFor(facts, applied.jurisdictionId),
    }),
  );
  const filtered = tally(
    tallyInput(facts, {
      ...dated,
      city: applied.city,
      jurisdictionId: applied.jurisdictionId,
      programId: applied.programId,
      category: applied.category,
      cities: citiesFor(facts, applied.jurisdictionId),
    }),
  );

  const jurisdictionLeak = Boolean(applied.jurisdictionId) && shouldSuppressCohort(afterJurisdiction.participating, base.participating);
  const filterLeak = shouldSuppressCohort(filtered.participating, afterJurisdiction.participating);
  const populationHidden = jurisdictionLeak || filterLeak;
  const empty = !populationHidden && filtered.participating === 0;
  const labels = scopeLabel(principal);
  const report: ImpactReport = {
    demonstration: true,
    disclaimer: DISCLAIMER,
    asOf: DEMO_AS_OF,
    role: principal.role,
    scopeLabel: labels.scopeLabel,
    organizationLabel: labels.organizationLabel,
    applied,
    populationHidden,
    empty,
    hideReason: populationHidden ? HIDDEN_REASON : null,
    ...metricsFromTally(filtered, populationHidden),
    options: {
      cities: citiesFor(facts, applied.jurisdictionId).map((city) => ({ id: city, label: city })),
      programs: [...directory.programs],
      categories: [...directory.categories],
      jurisdictions: principal.role === "super_admin" ? [...directory.jurisdictions] : [],
      lockJurisdiction: principal.role !== "super_admin",
    },
  };
  writeAudit(
    db,
    principal.userId,
    "view_report",
    JSON.stringify({
      status: populationHidden ? "suppressed" : empty ? "empty" : "ok",
      range: applied.range,
      city: applied.city,
      jurisdictionId: applied.jurisdictionId,
      programId: applied.programId,
      category: applied.category,
    }),
    nowIso,
  );
  return report;
}

export function reportWithoutPrincipal(): { status: 401; body: { error: string } } {
  return { status: 401, body: { error: "Authentication required." } };
}
