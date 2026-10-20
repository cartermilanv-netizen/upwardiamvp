"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { actionNotes, actionTitle, rebuildToday } from "@/lib/actions";
import { residentCatalog } from "@/lib/catalog";
import { formatLocalDate } from "@/lib/dates";
import {
  advance,
  commitPending,
  commitSkip,
  employmentSummary,
  prevScreen,
  readPending,
  resumeScreen,
  reviewGroups,
  showCareTransportHint,
  showInternetBillHint,
  suggestedGoals,
  toggleMulti,
  type Pending,
} from "@/lib/flow";
import { matchCatalog } from "@/lib/matcher";
import { t, type MessageKey } from "@/lib/messages";
import { progressCounts } from "@/lib/progress";
import {
  allowsSkip,
  screenExclusive,
  screenHintKey,
  screenKind,
  screenOptions,
  screenSection,
  screenTitleKey,
  sectionNameKey,
  type ScreenId,
} from "@/lib/screens";
import { deletePrototype, loadPrototype, parseStored, readPrototypeRaw, savePrototype, subscribePrototype } from "@/lib/storage";
import type { DraftAssessment, GoalId, MicroAction, SectionNumber } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AssessmentApp() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftAssessment | null>(null);
  const [actions, setActions] = useState<MicroAction[]>([]);
  const [screen, setScreen] = useState<ScreenId>("intro");
  const [pending, setPending] = useState<Pending>({ kind: "storage", value: null });
  const [returnTo, setReturnTo] = useState<ScreenId | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const savedRaw = useSyncExternalStore(subscribePrototype, readPrototypeRaw, () => null);
  const saved = savedRaw ? parseStored(savedRaw) : null;

  useEffect(() => {
    if (!draft) return;
    if (draft.prototypeStorage === "local_device") {
      savePrototype({ assessment: draft, actions });
      return;
    }
    deletePrototype();
  }, [actions, draft]);

  function move(nextDraft: DraftAssessment, nextScreen: ScreenId, nextReturn: ScreenId | null = null) {
    setDraft(nextDraft);
    setScreen(nextScreen);
    setPending(readPending(nextDraft, nextScreen));
    const arrived = nextScreen === nextReturn || nextScreen === "review" || nextScreen === "results";
    setReturnTo(arrived ? null : nextReturn);
    setError(null);
    setDeleteArmed(false);
    window.scrollTo(0, 0);
  }

  function openResults(nextDraft: DraftAssessment) {
    const today = formatLocalDate(new Date());
    const nextActions = rebuildToday(actions, nextDraft, residentCatalog, today);
    if (nextDraft.prototypeStorage === "local_device") {
      savePrototype({ assessment: nextDraft, actions: nextActions });
      router.push("/plan");
      return;
    }
    setActions(nextActions);
    move(nextDraft, "results");
  }

  function onNext() {
    if (screen === "review" && draft) {
      openResults(draft);
      return;
    }
    if (screen === "workStatusReview" && draft) {
      move(draft, advance(draft, screen, returnTo), returnTo);
      return;
    }
    const result = commitPending(draft, screen, pending);
    if (result.error || !result.draft) {
      setError(result.error);
      return;
    }
    const destination = advance(result.draft, screen, returnTo);
    if (destination === "results") {
      openResults(result.draft);
      return;
    }
    move(result.draft, destination, returnTo);
  }

  function onSkip() {
    if (!draft || !allowsSkip(screen)) return;
    const nextDraft = commitSkip(draft, screen);
    const destination = advance(nextDraft, screen, returnTo);
    if (destination === "results") {
      openResults(nextDraft);
      return;
    }
    move(nextDraft, destination, returnTo);
  }

  function onBack() {
    if (!draft) return;
    const destination = returnTo ?? prevScreen(draft, screen);
    setScreen(destination);
    setPending(readPending(draft, destination));
    setReturnTo(null);
    setError(null);
    window.scrollTo(0, 0);
  }

  function onSave() {
    const result = commitPending(draft, screen, pending);
    const storedDraft = result.error ? draft : result.draft;
    if (!result.error && result.draft) setDraft(result.draft);
    if (result.error) setError(result.error);
    if (storedDraft?.prototypeStorage === "local_device") {
      savePrototype({ assessment: storedDraft, actions });
      setNotice("assessment.notice.saved");
      return;
    }
    setNotice("assessment.notice.memory");
  }

  function onContinue() {
    const stored = loadPrototype();
    if (!stored) return;
    const nextScreen = resumeScreen(stored.assessment);
    setActions(stored.actions);
    move(stored.assessment, nextScreen);
  }

  function onDelete() {
    deletePrototype();
    setDraft(null);
    setActions([]);
    setScreen("intro");
    setPending({ kind: "storage", value: null });
    setDeleteArmed(false);
    setNotice(null);
    setReturnTo(null);
    setError(null);
  }

  function edit(target: ScreenId, backTo: ScreenId) {
    if (!draft) return;
    setReturnTo(backTo);
    setScreen(target);
    setPending(readPending(draft, target));
    setError(null);
    window.scrollTo(0, 0);
  }

  const showSavedIntro = screen === "intro" && saved !== null && !draft;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4 py-5 sm:py-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-[0.16em] text-[#092451] uppercase">{t("assessment.brand")}</p>
        {(draft || saved) && (
          <button type="button" className="text-sm text-stone-600 underline-offset-4 hover:underline" onClick={() => setDeleteArmed(true)}>
            {t("assessment.action.delete")}
          </button>
        )}
      </header>
      <Card className="gap-0 border-[#e4e0d8] bg-white py-0 shadow-sm ring-[#092451]/10">
        <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
          {screen !== "intro" && <ProgressHeader screen={screen} />}
          {showSavedIntro ? (
            <SavedIntro onContinue={onContinue} />
          ) : (
            <ScreenBody
              draft={draft}
              screen={screen}
              pending={pending}
              onPending={(next) => {
                setPending(next);
                setError(null);
              }}
              onEditWork={() => edit("employment", "workStatusReview")}
              onEdit={(target) => edit(target, "review")}
              onOptIn={() => {
                if (!draft) return;
                const result = commitPending(draft, "consent", { kind: "consent", value: "granted" });
                if (!result.draft) return;
                setDraft(result.draft);
                setScreen("employment");
                setPending(readPending(result.draft, "employment"));
                setReturnTo("review");
                setError(null);
                window.scrollTo(0, 0);
              }}
              actions={actions}
              onAction={(id, status) => {
                if (!draft) return;
                const next = actions.map((action) =>
                  action.id === id
                    ? { ...action, status, completedAt: status === "done" ? new Date().toISOString() : null }
                    : action,
                );
                setActions(rebuildToday(next, draft, residentCatalog, formatLocalDate(new Date())));
              }}
            />
          )}
          {error && (
            <p className="text-sm text-rose-800" role="alert">
              {t(error)}
            </p>
          )}
          {notice && (
            <p className="text-sm text-[#092451]" role="status">
              {t(notice)}
            </p>
          )}
          {deleteArmed && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-950">{t("assessment.delete.confirm")}</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="destructive" className="h-11" onClick={onDelete}>
                  {t("assessment.action.deleteNow")}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setDeleteArmed(false)}>
                  {t("assessment.action.cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
        {!showSavedIntro && screen !== "results" && (
          <footer className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-[#e4e0d8] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex gap-2">
              {screen !== "intro" && (
                <Button type="button" variant="outline" className="h-12 flex-1 text-base" onClick={onBack}>
                  {t("assessment.action.back")}
                </Button>
              )}
              {allowsSkip(screen) && (
                <Button type="button" variant="ghost" className="h-12 flex-1 text-base" onClick={onSkip}>
                  {t("assessment.action.skip")}
                </Button>
              )}
            </div>
            <Button type="button" className="h-12 w-full text-base" onClick={onNext}>
              {screen === "intro" ? t("assessment.action.start") : screen === "review" ? t("assessment.action.seeMatches") : t("assessment.action.next")}
            </Button>
            {draft && screen !== "intro" && (
              <button type="button" className="text-sm text-[#092451] underline-offset-4 hover:underline" onClick={onSave}>
                {t("assessment.action.save")}
              </button>
            )}
          </footer>
        )}
        {screen === "results" && (
          <footer className="border-t border-[#e4e0d8] px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={() => setScreen("review")}>
              {t("assessment.action.editAnswers")}
            </Button>
          </footer>
        )}
      </Card>
      <p className="mt-4 text-center text-xs text-stone-500">{t("assessment.privacy.footer")}</p>
    </main>
  );
}

function ProgressHeader({ screen }: { screen: ScreenId }) {
  const section = screenSection(screen);
  const current: SectionNumber | null = screen === "consent" ? 1 : screen === "review" || screen === "results" ? 7 : section;
  const doneThrough = current === null ? 0 : screen === "review" || screen === "results" ? 6 : current - 1;
  return (
    <div className="flex flex-col gap-2">
      <StepBar active={current} doneThrough={doneThrough} />
      {section && (
        <div>
          <p className="text-sm font-medium text-[#092451]">{t("assessment.section.nOf", { n: section })}</p>
          <p className="text-sm text-stone-600">{t(sectionNameKey(section))}</p>
        </div>
      )}
      {screen !== "review" && screen !== "results" && screen !== "workStatusReview" && (
        <p className="text-sm text-stone-500">{t("assessment.skipFine")}</p>
      )}
    </div>
  );
}

function StepBar({ active, doneThrough }: { active: SectionNumber | null; doneThrough: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden={active === null}>
      {([1, 2, 3, 4, 5, 6, 7] as const).map((step) => {
        const current = active === step;
        const done = !current && step <= doneThrough;
        return (
          <div
            key={step}
            className={cn("h-2 flex-1 rounded-full", current && "bg-[#FFC928]", done && "bg-[#092451]", !current && !done && "bg-stone-200")}
          />
        );
      })}
    </div>
  );
}

function SavedIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t("assessment.intro.savedTitle")}</h1>
      <p className="text-base leading-relaxed text-stone-700">{t("assessment.intro.savedBody")}</p>
      <Button type="button" className="h-12 text-base" onClick={onContinue}>
        {t("assessment.action.continueSaved")}
      </Button>
    </div>
  );
}

function ScreenBody({
  draft,
  screen,
  pending,
  onPending,
  onEditWork,
  onEdit,
  onOptIn,
  actions,
  onAction,
}: {
  draft: DraftAssessment | null;
  screen: ScreenId;
  pending: Pending;
  onPending: (pending: Pending) => void;
  onEditWork: () => void;
  onEdit: (screen: ScreenId) => void;
  onOptIn: () => void;
  actions: MicroAction[];
  onAction: (id: string, status: "done" | "skipped") => void;
}) {
  const title = t(screenTitleKey(screen));
  const hint = screenHintKey(screen);
  const kind = screenKind(screen);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{title}</h1>
      {screen === "intro" && <IntroCopy />}
      {screen === "consent" && <p className="text-base leading-relaxed text-stone-700">{t("assessment.consent.body")}</p>}
      {hint && <p className="text-sm leading-relaxed text-stone-600">{t(hint)}</p>}
      {screen === "digitalAccess" && draft && showInternetBillHint(draft) && (
        <p className="rounded-xl bg-[#FFC928] px-3 py-2 text-sm text-[#092451]">{t("assessment.digital.access.internetHint")}</p>
      )}
      {(screen === "transportModes" || screen === "reliability" || screen === "hardToReach") && draft && showCareTransportHint(draft) && (
        <p className="rounded-xl bg-[#FFC928] px-3 py-2 text-sm text-[#092451]">{t("assessment.transport.hintFromCare")}</p>
      )}
      {kind === "intro" && pending.kind === "storage" && <StorageChoices pending={pending} onPending={onPending} />}
      {kind === "consent" && pending.kind === "consent" && <ConsentChoices pending={pending} onPending={onPending} />}
      {kind === "single" && pending.kind === "single" && (
        <SingleChoices screen={screen} draft={draft} pending={pending} onPending={onPending} />
      )}
      {kind === "multi" && pending.kind === "multi" && (
        <MultiChoices screen={screen} draft={draft} pending={pending} onPending={onPending} />
      )}
      {kind === "count" && pending.kind === "count" && <CountChoice pending={pending} onPending={onPending} />}
      {kind === "text" && pending.kind === "text" && <TextChoice screen={screen} pending={pending} onPending={onPending} />}
      {kind === "goals" && pending.kind === "goals" && draft && <GoalsChoice draft={draft} pending={pending} onPending={onPending} />}
      {kind === "work" && draft && <WorkReview draft={draft} onEdit={onEditWork} />}
      {kind === "review" && draft && <ReviewBody draft={draft} onEdit={onEdit} onOptIn={onOptIn} />}
      {kind === "results" && draft && <ResultsBody draft={draft} actions={actions} onAction={onAction} />}
    </div>
  );
}

function IntroCopy() {
  return (
    <div className="flex flex-col gap-3 text-base leading-relaxed text-stone-700">
      <p>{t("assessment.intro.body")}</p>
      <p>{t("assessment.intro.willNotAsk")}</p>
      <p className="font-medium text-stone-900">{t("assessment.intro.storageTitle")}</p>
      <p className="text-sm text-stone-600">{t("assessment.intro.storageHelp")}</p>
    </div>
  );
}

function StorageChoices({
  pending,
  onPending,
}: {
  pending: Extract<Pending, { kind: "storage" }>;
  onPending: (pending: Pending) => void;
}) {
  const options: { value: "local_device" | "memory_only"; title: MessageKey; help: MessageKey }[] = [
    { value: "local_device", title: "assessment.intro.storage.local", help: "assessment.intro.storage.localHelp" },
    { value: "memory_only", title: "assessment.intro.storage.memory", help: "assessment.intro.storage.memoryHelp" },
  ];
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("assessment.intro.storageTitle")}>
      {options.map((option) => (
        <ChoiceButton
          key={option.value}
          selected={pending.value === option.value}
          label={t(option.title)}
          detail={t(option.help)}
          onClick={() => onPending({ kind: "storage", value: option.value })}
          role="radio"
        />
      ))}
    </div>
  );
}

function ConsentChoices({
  pending,
  onPending,
}: {
  pending: Extract<Pending, { kind: "consent" }>;
  onPending: (pending: Pending) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={t("assessment.consent.title")}>
      <ChoiceButton
        selected={pending.value === "granted"}
        label={t("assessment.consent.grant")}
        onClick={() => onPending({ kind: "consent", value: "granted" })}
        role="radio"
      />
      <ChoiceButton
        selected={pending.value === "declined"}
        label={t("assessment.consent.decline")}
        onClick={() => onPending({ kind: "consent", value: "declined" })}
        role="radio"
      />
    </div>
  );
}

function SingleChoices({
  screen,
  draft,
  pending,
  onPending,
}: {
  screen: ScreenId;
  draft: DraftAssessment | null;
  pending: Extract<Pending, { kind: "single" }>;
  onPending: (pending: Pending) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={t(screenTitleKey(screen))}>
        {screenOptions(screen, draft).map((option) => (
          <ChoiceButton
            key={option.value}
            selected={pending.opt === null && pending.value === option.value}
            label={t(option.labelKey)}
            onClick={() => onPending({ kind: "single", value: option.value, opt: null })}
            role="radio"
          />
        ))}
      </div>
      <OptOuts selected={pending.opt} onSelect={(opt) => onPending({ kind: "single", value: null, opt })} />
    </div>
  );
}

function MultiChoices({
  screen,
  draft,
  pending,
  onPending,
}: {
  screen: ScreenId;
  draft: DraftAssessment | null;
  pending: Extract<Pending, { kind: "multi" }>;
  onPending: (pending: Pending) => void;
}) {
  const exclusive = screenExclusive(screen);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2" role="group" aria-label={t(screenTitleKey(screen))}>
        {screenOptions(screen, draft).map((option) => (
          <ChoiceButton
            key={option.value}
            selected={pending.opt === null && pending.values.includes(option.value)}
            label={t(option.labelKey)}
            onClick={() =>
              onPending({
                kind: "multi",
                values: toggleMulti(pending.values, option.value, exclusive),
                opt: null,
              })
            }
            role="checkbox"
          />
        ))}
      </div>
      <OptOuts selected={pending.opt} onSelect={(opt) => onPending({ kind: "multi", values: [], opt })} />
    </div>
  );
}

function CountChoice({
  pending,
  onPending,
}: {
  pending: Extract<Pending, { kind: "count" }>;
  onPending: (pending: Pending) => void;
}) {
  function setValue(next: number) {
    onPending({ kind: "count", value: Math.min(20, Math.max(0, next)), opt: null });
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12 text-xl"
          aria-label={t("assessment.count.minus")}
          onClick={() => setValue(pending.value === null ? 0 : pending.value - 1)}
        >
          −
        </Button>
        <p className="min-w-16 text-center text-3xl font-semibold text-[#092451]" aria-live="polite">
          {pending.opt || pending.value === null ? t("assessment.count.empty") : pending.value}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12 text-xl"
          aria-label={t("assessment.count.plus")}
          onClick={() => setValue(pending.value === null ? 1 : pending.value + 1)}
        >
          +
        </Button>
      </div>
      <OptOuts selected={pending.opt} onSelect={(opt) => onPending({ kind: "count", value: null, opt })} />
    </div>
  );
}

function TextChoice({
  screen,
  pending,
  onPending,
}: {
  screen: ScreenId;
  pending: Extract<Pending, { kind: "text" }>;
  onPending: (pending: Pending) => void;
}) {
  const maxLength = screen === "careerGoal" ? 200 : 5;
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={pending.opt ? "" : pending.value}
        inputMode={screen === "zip" ? "numeric" : "text"}
        maxLength={maxLength}
        placeholder={t(screen === "zip" ? "assessment.household.zip.placeholder" : "assessment.education.career.placeholder")}
        className="h-12 text-base"
        aria-label={t(screenTitleKey(screen))}
        onChange={(event) => {
          const raw = event.target.value;
          const value = screen === "zip" ? raw.replace(/\D/g, "").slice(0, 5) : raw;
          onPending({ kind: "text", value, opt: null });
        }}
      />
      <OptOuts selected={pending.opt} onSelect={(opt) => onPending({ kind: "text", value: "", opt })} />
    </div>
  );
}

function GoalsChoice({
  draft,
  pending,
  onPending,
}: {
  draft: DraftAssessment;
  pending: Extract<Pending, { kind: "goals" }>;
  onPending: (pending: Pending) => void;
}) {
  const suggested = new Set(suggestedGoals(draft));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-600">{t("assessment.priorities.goals.count", { n: pending.opt ? 0 : pending.values.length })}</p>
      <div className="flex flex-col gap-2" role="group" aria-label={t("assessment.priorities.goals.title")}>
        {screenOptions("goals", draft).map((option) => {
          const value = option.value as GoalId;
          const selected = pending.opt === null && pending.values.includes(value);
          return (
            <ChoiceButton
              key={option.value}
              selected={selected}
              label={t(option.labelKey)}
              badge={suggested.has(value) && !selected ? t("assessment.priorities.goals.suggested") : undefined}
              onClick={() => {
                const values = toggleMulti(pending.values, value, [], 3);
                onPending({ kind: "goals", values, otherText: values.includes("other") ? pending.otherText : "", opt: null });
              }}
              role="checkbox"
            />
          );
        })}
      </div>
      {pending.opt === null && pending.values.includes("other") && (
        <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
          {t("assessment.priorities.goals.otherLabel")}
          <Input
            value={pending.otherText}
            maxLength={120}
            placeholder={t("assessment.priorities.goals.otherPlaceholder")}
            className="h-12 text-base"
            onChange={(event) => onPending({ ...pending, otherText: event.target.value })}
          />
        </label>
      )}
      <OptOuts selected={pending.opt} onSelect={(opt) => onPending({ kind: "goals", values: [], otherText: "", opt })} />
    </div>
  );
}

function OptOuts({ selected, onSelect }: { selected: "not_sure" | "prefer_not_to_answer" | null; onSelect: (opt: "not_sure" | "prefer_not_to_answer") => void }) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="text-xs tracking-wide text-stone-500 uppercase">{t("assessment.or")}</p>
      <ChoiceButton selected={selected === "not_sure"} label={t("assessment.opt.notSure")} onClick={() => onSelect("not_sure")} role="radio" quiet />
      <ChoiceButton
        selected={selected === "prefer_not_to_answer"}
        label={t("assessment.opt.preferNot")}
        onClick={() => onSelect("prefer_not_to_answer")}
        role="radio"
        quiet
      />
    </div>
  );
}

function ChoiceButton({
  selected,
  label,
  detail,
  badge,
  onClick,
  role,
  quiet = false,
}: {
  selected: boolean;
  label: string;
  detail?: string;
  badge?: string;
  onClick: () => void;
  role: "radio" | "checkbox";
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors",
        selected ? "border-[#092451] bg-[#092451]/5 ring-2 ring-[#092451]" : "border-stone-200 bg-white hover:border-stone-300",
        quiet && !selected && "text-stone-600",
      )}
    >
      <span>
        <span className="block font-medium text-stone-950">{label}</span>
        {detail && <span className="mt-1 block text-sm font-normal text-stone-600">{detail}</span>}
      </span>
      {badge && <span className="shrink-0 rounded-full bg-[#FFC928] px-2 py-1 text-xs font-medium text-[#092451]">{badge}</span>}
    </button>
  );
}

function WorkReview({ draft, onEdit }: { draft: DraftAssessment; onEdit: () => void }) {
  const summary = employmentSummary(draft);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base leading-relaxed text-stone-700">{t("assessment.education.workReview.body")}</p>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3">
        <p className="text-base font-medium text-stone-950">{summary}</p>
        <Button type="button" variant="outline" className="h-10" onClick={onEdit}>
          {t("assessment.action.change")}
        </Button>
      </div>
    </div>
  );
}

function ReviewBody({ draft, onEdit, onOptIn }: { draft: DraftAssessment; onEdit: (screen: ScreenId) => void; onOptIn: () => void }) {
  const groups = reviewGroups(draft);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-base leading-relaxed text-stone-700">{t("assessment.review.intro")}</p>
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-[#092451]">{t(group.titleKey)}</h2>
          {group.optIn && (
            <>
              <p className="text-sm leading-relaxed text-stone-700">{t("assessment.review.skippedBody")}</p>
              <Button type="button" variant="outline" className="h-11" onClick={onOptIn}>
                {t("assessment.action.optIn")}
              </Button>
            </>
          )}
          {group.items.map((item) => (
            <div key={`${group.id}-${item.labelKey}`} className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <p className="text-sm text-stone-500">{t(item.labelKey)}</p>
                <p className="text-base text-stone-950">{item.value}</p>
              </div>
              <Button type="button" variant="ghost" className="h-9 shrink-0" onClick={() => onEdit(item.screen)}>
                {t("assessment.action.change")}
              </Button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function ResultsBody({
  draft,
  actions,
  onAction,
}: {
  draft: DraftAssessment;
  actions: MicroAction[];
  onAction: (id: string, status: "done" | "skipped") => void;
}) {
  const today = formatLocalDate(new Date());
  const counts = progressCounts(draft, residentCatalog, actions, new Date());
  const rows = matchCatalog(draft, residentCatalog).filter((row) => row.decision.kind !== "not_applicable");
  const possible = rows.filter((row) => row.decision.kind === "possible_help");
  const needs = rows.filter((row) => row.decision.kind === "needs_information");
  const open = actions.filter((action) => action.localDate === today && action.status === "open");
  const done = actions.filter((action) => action.status === "done");
  const numbers: { label: MessageKey; value: number; hint?: MessageKey }[] = [
    { label: "assessment.progress.sections", value: counts.sectionsVisited, hint: "assessment.progress.sectionsOf" },
    { label: "assessment.progress.missing", value: counts.missingFacts },
    { label: "assessment.progress.done", value: counts.actionsDone },
    { label: "assessment.progress.doneWeek", value: counts.actionsDoneThisWeek },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-lg font-semibold text-[#092451]">{t("assessment.progress.title")}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {numbers.map((item) => (
            <div key={item.label} className="rounded-xl bg-[#f4f1ea] px-3 py-3">
              <dt className="text-sm text-stone-600">{t(item.label)}</dt>
              <dd className="mt-1 text-3xl font-semibold text-[#092451]">
                {item.value}
                {item.hint && <span className="ml-1 text-sm font-medium text-stone-500">{t(item.hint)}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[#092451]">{t("assessment.results.actionsTitle")}</h2>
        {open.length === 0 && <p className="text-sm text-stone-600">{t("assessment.results.actionsEmpty")}</p>}
        {open.map((action) => (
          <article key={action.id} className="rounded-xl border border-stone-200 p-4">
            <h3 className="text-base font-semibold text-stone-950">{actionTitle(action, draft, residentCatalog)}</h3>
            {actionNotes(action, draft, residentCatalog).map((note) => (
              <p key={note} className="mt-2 text-sm leading-relaxed text-stone-700">
                {note}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              <Button type="button" className="h-11 flex-1" onClick={() => onAction(action.id, "done")}>
                {t("assessment.action.didThis")}
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => onAction(action.id, "skipped")}>
                {t("assessment.action.notNow")}
              </Button>
            </div>
          </article>
        ))}
        {done.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-stone-600">{t("assessment.results.doneTitle")}</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-800">
              {done.map((action) => (
                <li key={action.id}>{actionTitle(action, draft, residentCatalog)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section className="flex flex-col gap-3">
        {residentCatalog.length === 0 && <p className="text-base leading-relaxed text-stone-800">{t("assessment.results.empty")}</p>}
        {residentCatalog.length > 0 && rows.length === 0 && <p className="text-base leading-relaxed text-stone-800">{t("assessment.results.noneFit")}</p>}
        <MatchGroup title="assessment.results.possible" rows={possible} />
        <MatchGroup title="assessment.results.needsInfo" rows={needs} />
      </section>
    </div>
  );
}

function MatchGroup({
  title,
  rows,
}: {
  title: MessageKey;
  rows: ReturnType<typeof matchCatalog>;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[#092451]">{t(title)}</h2>
      {rows.map((row) => (
        <article key={row.entry.id} className="rounded-xl border border-stone-200 p-4">
          <h3 className="text-base font-semibold text-stone-950">{row.entry.name}</h3>
          <h4 className="mt-3 text-sm font-semibold text-[#092451]">{row.why.heading}</h4>
          {row.why.lines.map((line) => (
            <p key={line} className="mt-2 text-sm leading-relaxed text-stone-700">
              {line}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}
