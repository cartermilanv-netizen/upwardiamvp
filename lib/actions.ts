import { digitalFlags, hasTransportationBarrier } from "@/lib/barriers";
import { goalIndexForCategory, matchCatalog } from "@/lib/matcher";
import { t } from "@/lib/messages";
import type { DraftAssessment, GoalId, MicroAction, MissingFact, VerifiedCatalogEntry } from "@/lib/types";

const FILLABLE: MissingFact[] = ["zip", "children", "income_range", "insurance"];

type Ranked = MicroAction & { sortGoal: number; sortFact: number; sortCatalog: string };

function selectedGoals(draft: DraftAssessment): GoalId[] {
  const answer = draft.priorities.topGoals;
  return answer?.status === "answered" ? answer.value : [];
}

export function rankDailyActions(
  draft: DraftAssessment,
  catalog: readonly Partial<VerifiedCatalogEntry>[],
  localDate: string,
): MicroAction[] {
  const selected = selectedGoals(draft);
  const visible = matchCatalog(draft, catalog).filter((row) => row.decision.kind !== "not_applicable");
  const missingMeta = new Map<MissingFact, { sortGoal: number; ruleId: string; sortCatalog: string }>();

  for (const row of visible) {
    if (row.decision.kind !== "needs_information") continue;
    const sortGoal = goalIndexForCategory(selected, row.category);
    for (const fact of row.decision.missingEligibility) {
      if (!FILLABLE.includes(fact)) continue;
      const current = missingMeta.get(fact);
      const candidate = { sortGoal, ruleId: row.decision.ruleId, sortCatalog: row.entry.id };
      if (!current || better(candidate, current)) missingMeta.set(fact, candidate);
    }
  }

  const missing: Ranked[] = [...missingMeta.entries()].map(([fact, meta]) => ({
    id: `${localDate}:missing:${fact}`,
    localDate,
    ruleId: meta.ruleId,
    catalogId: null,
    missingFact: fact,
    channel: "on_device",
    barrierNote: null,
    status: "open",
    completedAt: null,
    sortGoal: meta.sortGoal,
    sortFact: FILLABLE.indexOf(fact),
    sortCatalog: meta.sortCatalog,
  }));

  const help: Ranked[] = [];
  for (const row of visible) {
    if (row.decision.kind !== "possible_help" || !row.channel) continue;
    help.push({
      id: `${localDate}:${row.decision.ruleId}:${row.entry.id}`,
      localDate,
      ruleId: row.decision.ruleId,
      catalogId: row.entry.id,
      missingFact: null,
      channel: row.channel.channel,
      barrierNote: row.channel.barrierNote,
      status: "open",
      completedAt: null,
      sortGoal: goalIndexForCategory(selected, row.category),
      sortFact: 0,
      sortCatalog: row.entry.id,
    });
  }

  const ranked = [...missing, ...help].sort((a, b) => {
    const aMissing = a.missingFact ? 0 : 1;
    const bMissing = b.missingFact ? 0 : 1;
    if (aMissing !== bMissing) return aMissing - bMissing;
    if (a.sortGoal !== b.sortGoal) return a.sortGoal - b.sortGoal;
    if (a.sortFact !== b.sortFact) return a.sortFact - b.sortFact;
    if (a.ruleId !== b.ruleId) return a.ruleId.localeCompare(b.ruleId);
    return a.sortCatalog.localeCompare(b.sortCatalog);
  });

  return ranked.map(stripRank);
}

function better(
  candidate: { sortGoal: number; ruleId: string; sortCatalog: string },
  current: { sortGoal: number; ruleId: string; sortCatalog: string },
): boolean {
  if (candidate.sortGoal !== current.sortGoal) return candidate.sortGoal < current.sortGoal;
  if (candidate.ruleId !== current.ruleId) return candidate.ruleId < current.ruleId;
  return candidate.sortCatalog < current.sortCatalog;
}

function stripRank(action: Ranked): MicroAction {
  return {
    id: action.id,
    localDate: action.localDate,
    ruleId: action.ruleId,
    catalogId: action.catalogId,
    missingFact: action.missingFact,
    channel: action.channel,
    barrierNote: action.barrierNote,
    status: action.status,
    completedAt: action.completedAt,
  };
}

export function generateDailyActions(
  draft: DraftAssessment,
  catalog: readonly Partial<VerifiedCatalogEntry>[],
  localDate: string,
): MicroAction[] {
  return rankDailyActions(draft, catalog, localDate).slice(0, 3);
}

export function rebuildToday(
  history: readonly MicroAction[],
  draft: DraftAssessment,
  catalog: readonly Partial<VerifiedCatalogEntry>[],
  localDate: string,
): MicroAction[] {
  const locked = history.filter((action) => action.status === "done" || action.status === "skipped");
  const lockedIds = new Set(locked.map((action) => action.id));
  const open = rankDailyActions(draft, catalog, localDate)
    .filter((action) => !lockedIds.has(action.id))
    .slice(0, 3);
  return [...locked, ...open];
}

export function actionTitle(
  action: MicroAction,
  draft: DraftAssessment,
  catalog: readonly Partial<VerifiedCatalogEntry>[],
): string {
  if (action.missingFact) return t(`assessment.action.missing.${action.missingFact}`);
  const entry = catalog.find((item) => item.id === action.catalogId);
  const name = typeof entry?.name === "string" ? entry.name : "";
  const digital = digitalFlags(draft);
  const strongDigital = digital.none || digital.uncomfort;
  const channels = entry?.channels ?? [];
  if (action.channel === "online" && strongDigital && channels.length > 0 && channels.every((channel) => channel === "online")) {
    return t("assessment.action.online.trusted");
  }
  if (
    action.channel === "in_person" &&
    hasTransportationBarrier(draft) &&
    !channels.includes("phone") &&
    !channels.includes("mail")
  ) {
    return t("assessment.action.in_person.ask", { name });
  }
  if (action.channel === "phone") return t("assessment.action.phone", { name });
  if (action.channel === "mail") return t("assessment.action.mail", { name });
  if (action.channel === "online") return t("assessment.action.online", { name });
  if (action.channel === "in_person") return t("assessment.action.in_person", { name });
  return t("assessment.action.missing.body");
}

export function actionNotes(action: MicroAction, draft: DraftAssessment, catalog: readonly Partial<VerifiedCatalogEntry>[]): string[] {
  const notes: string[] = [];
  const entry = catalog.find((item) => item.id === action.catalogId);
  const channels = entry?.channels ?? [];
  const digital = digitalFlags(draft);
  if (action.missingFact) {
    notes.push(t("assessment.action.missing.body"));
    return notes;
  }
  if (typeof entry?.claimText === "string" && entry.claimText.trim()) {
    notes.push(t("assessment.action.body", { claimText: entry.claimText }));
  }
  if ((action.barrierNote === "transportation" || action.barrierNote === "both") && (action.channel === "phone" || action.channel === "mail") && channels.includes("in_person")) {
    notes.push(t("assessment.action.note.transportOptional"));
  }
  if (action.channel === "in_person" && hasTransportationBarrier(draft) && !channels.includes("phone") && !channels.includes("mail")) {
    notes.push(t("assessment.action.note.transportAsk"));
  }
  if ((digital.none || digital.uncomfort) && action.channel !== "online") {
    notes.push(t("assessment.action.note.digital"));
  }
  if (digital.intermittent && !digital.none && !digital.uncomfort && action.channel === "online") {
    notes.push(t("assessment.action.note.wifi"));
  }
  if (action.channel === "phone" && typeof entry?.phone === "string" && entry.phone.trim()) {
    notes.push(t("assessment.results.phoneNumber", { phone: entry.phone }));
  }
  if (typeof entry?.preparationNote === "string" && entry.preparationNote.trim()) notes.push(entry.preparationNote);
  return notes;
}
