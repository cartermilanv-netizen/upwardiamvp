import type { ReactNode } from "react";
import Link from "next/link";
import { FilterForm } from "@/components/impact/filter-form";
import { rateDetail, showCount, showRate } from "@/lib/impact/format";
import { HP2030 } from "@/lib/impact/hp2030";
import { hrefFor } from "@/lib/impact/query";
import type { CountCell, ImpactReport, LabeledCount } from "@/lib/impact/types";

export function ReportView({ report, view }: { report: ImpactReport; view: "overview" | "funnel" | "health" }) {
  const title = view === "funnel" ? "Application funnel" : view === "health" ? "Community health impact" : "Engagement overview";
  return (
    <div id="impact-report" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#092451]">{report.disclaimer}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451]">{title}</h1>
          <p className="mt-1 text-sm text-[#3d4a5c]">
            {report.scopeLabel}
            {report.organizationLabel ? ` · ${report.organizationLabel}` : ""} · Reporting date {report.asOf.slice(0, 10)}
          </p>
        </div>
        <a
          href={`/api/impact/export${hrefFor("", report.applied)}`}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#FFC928] px-4 text-sm font-semibold text-[#092451]"
        >
          Export aggregate report
        </a>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#092451]/10" aria-label="Filters">
        <FilterForm
          filters={report.applied}
          cities={report.options.cities}
          programs={report.options.programs}
          categories={report.options.categories}
          jurisdictions={report.options.jurisdictions}
          lockJurisdiction={report.options.lockJurisdiction}
          jurisdictionLabel={report.scopeLabel}
        />
      </section>

      {report.populationHidden ? (
        <p className="rounded-2xl border border-[#092451]/15 bg-white p-5 text-[#092451]" role="status">
          {report.hideReason}
        </p>
      ) : null}
      {report.empty ? (
        <p className="rounded-2xl border border-[#092451]/15 bg-white p-5 text-[#092451]" role="status">
          No demonstration participants match these filters.
        </p>
      ) : null}

      {view === "overview" ? <Overview report={report} /> : null}
      {view === "funnel" ? <Funnel report={report} /> : null}
      {view === "health" ? <Health report={report} /> : null}
    </div>
  );
}

function Overview({ report }: { report: ImpactReport }) {
  return (
    <>
      <CardGrid>
        <Metric label="Participating residents" value={showCount(report.participating)} detail="Consented people with a qualifying event in the selected dates." />
        <Metric label="Active in 7 days" value={showCount(report.active7)} detail="A qualifying event in the last 7 days of this range." />
        <Metric label="Active in 30 days" value={showCount(report.active30)} detail="A qualifying event in the last 30 days of this range." />
        <Metric label="Assessment completion" value={showRate(report.assessmentCompletion)} detail={rateDetail(report.assessmentCompletion)} />
        <Metric label="Resources discovered" value={showCount(report.resourcesDiscovered)} detail="Distinct resident and resource. A view is not an application." />
        <Metric label="Resources saved" value={showCount(report.resourcesSaved)} detail="Distinct resident and resource. Repeat saves count once." />
        <Metric label="Tasks started" value={showCount(report.tasksStarted)} detail="Distinct actions that were started." />
        <Metric label="Tasks completed" value={showCount(report.tasksCompleted)} detail="Distinct actions that were completed." />
        <Metric label="Action completion" value={showRate(report.actionCompletion)} detail={rateDetail(report.actionCompletion)} />
        <Metric label="Applications started" value={showCount(report.applicationsStarted)} detail="Distinct applications. Resource views are not included." />
        <Metric label="Drafts saved" value={showCount(report.draftsSaved)} detail="Distinct applications with a saved draft. Repeat saves count once." />
        <Metric label="Verified submissions" value={showCount(report.submissionsConfirmed)} detail="Distinct applications with a confirmed submission." />
        <Metric label="Goals completed" value={showCount(report.goalsCompleted)} detail="Distinct goals marked completed." />
        <Metric label="Outcome reports" value={showCount(report.outcomeReports)} detail="Self-reported outcome records. A report is not a verified outcome." />
        <Metric label="Verified outcomes" value={showCount(report.outcomesVerified)} detail="Counted only when a verification method and source are stored." />
      </CardGrid>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Weekly engagement" caption="Distinct participating residents with a qualifying event in each week.">
          <Bars rows={report.weekly} />
        </Panel>
        <Panel title="Monthly engagement" caption="Distinct participating residents with a qualifying event in each month.">
          <Bars rows={report.monthly} />
        </Panel>
      </div>
      <Panel title="Categories with the greatest demand" caption="Distinct residents who viewed a resource in the category. Choosing a bar filters the report.">
        <Bars
          rows={report.categories}
          hrefFor={(id) => hrefFor("/impact", report.applied, { category: id as ImpactReport["applied"]["category"], range: report.applied.range })}
        />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Places in the authorized jurisdiction" caption="One place per participant. A place under 11 people is hidden, and another place may be hidden so the small one cannot be calculated.">
          <Bars rows={report.cities} />
        </Panel>
        <Panel title="Common barriers" caption="Coarse barrier categories only. No household health or financial amounts are stored.">
          <CountTable rows={report.barriers} />
        </Panel>
      </div>
      <Definitions />
    </>
  );
}

function Funnel({ report }: { report: ImpactReport }) {
  const steps = [
    { label: "Started", cell: report.funnel.started },
    { label: "Draft saved", cell: report.funnel.draft },
    { label: "Submission confirmed", cell: report.funnel.submitted },
  ];
  const visibleMax = Math.max(...steps.map((step) => step.cell.value ?? 0), 1);
  return (
    <>
      <CardGrid>
        <Metric label="Applications started" value={showCount(report.applicationsStarted)} detail="Resource views stay out of this count." />
        <Metric label="Drafts saved" value={showCount(report.draftsSaved)} detail="One count per application." />
        <Metric label="Verified submissions" value={showCount(report.submissionsConfirmed)} detail="Confirmed submissions only." />
        <Metric label="Tasks started" value={showCount(report.tasksStarted)} detail="Distinct actions." />
        <Metric label="Tasks completed" value={showCount(report.tasksCompleted)} detail="Distinct completed actions." />
        <Metric label="Action completion" value={showRate(report.actionCompletion)} detail={rateDetail(report.actionCompletion)} />
        <Metric label="Goals completed" value={showCount(report.goalsCompleted)} detail="Distinct completed goals." />
      </CardGrid>
      <Panel title="Funnel and drop-off" caption="Each step counts an application once. Drop-off is hidden when showing it would reveal a group under 11.">
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.label} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-medium text-[#092451]">{step.label}</span>
              <div className="h-8 overflow-hidden rounded-lg bg-[#e7edf5]">
                {step.cell.suppressed || step.cell.value === null ? (
                  <div className="flex h-full items-center px-3 text-sm text-[#092451]">Suppressed</div>
                ) : (
                  <div className="h-full rounded-lg bg-[#092451]" style={{ width: `${Math.max(8, (step.cell.value / visibleMax) * 100)}%` }} />
                )}
              </div>
              <span className="text-sm font-semibold text-[#092451]">{showCount(step.cell)}</span>
            </li>
          ))}
        </ol>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Drop label="Started, no draft saved" cell={report.funnel.dropBeforeDraft} />
          <Drop label="Draft saved, no confirmed submission" cell={report.funnel.dropBeforeSubmit} />
        </dl>
      </Panel>
    </>
  );
}

function Health({ report }: { report: ImpactReport }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-2xl bg-white p-4 text-sm leading-6 text-[#3d4a5c] shadow-sm ring-1 ring-[#092451]/10">
        National figures below are copied from the official Healthy People 2030 pages. Platform baseline and follow-up use only this demonstration&apos;s consented participants. The two populations are different. Upwardia Impact does not treat platform figures as a cause of change in a national target.
      </p>
      {report.health.map((block) => {
        const official = HP2030[block.objectiveId];
        return (
          <article key={block.objectiveId} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#092451]/10">
            <p className="text-xs font-semibold tracking-wide text-[#092451]">{official.id}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#092451]">{official.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#3d4a5c]">{official.definition}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Fact term="National target" detail={official.targetLabel} />
              <Fact term="Target-setting method" detail={official.targetSettingMethod} />
              <Fact term="National baseline" detail={official.baseline} />
              <Fact term="Most recent national data" detail={`${official.mostRecent}. Status: ${official.nationalStatus}.`} />
              <Fact term="National data source" detail={official.dataSource} />
              <Fact term="Desired direction" detail={official.desiredDirection} />
            </dl>
            <p className="mt-3 text-sm leading-6 text-[#3d4a5c]">{official.nationalPopulation}</p>
            <p className="mt-2 text-sm">
              <a href={official.url} className="font-semibold text-[#092451] underline">
                Official objective page
              </a>
            </p>
            <h3 className="mt-5 text-sm font-semibold text-[#092451]">Mapped Upwardia goals and actions</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-[#3d4a5c]">
              {official.mappedGoals.map((goal) => (
                <li key={goal}>Goal: {goal}</li>
              ))}
              {official.mappedActions.map((action) => (
                <li key={action}>Action: {action}</li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold text-[#092451]">Platform measure</h3>
            <p className="mt-2 text-sm leading-6 text-[#3d4a5c]">{official.platformMeasure}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Fact term="Numerator" detail={official.numerator} />
              <Fact term="Denominator" detail={official.denominator} />
              <Fact term="Population" detail={official.population} />
              <Fact term="Follow-up time" detail={official.followUpTime} />
            </dl>
            {report.populationHidden ? (
              <p className="mt-4 text-sm text-[#092451]">Platform counts for this objective are hidden with the rest of this view.</p>
            ) : !block.inFilter ? (
              <p className="mt-4 text-sm text-[#092451]">This filter is not mapped to {official.id}, so platform rates are not shown as zero.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Platform baseline" value={showRate(block.baseline)} detail={rateDetail(block.baseline)} />
                  <Metric label="Platform follow-up" value={showRate(block.followUp)} detail={rateDetail(block.followUp)} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Engagement indicator" value={showCount(block.engagement)} detail="Residents with a mapped event in the selected dates." />
                  <Metric label="Intermediate outcome" value={showCount(block.intermediate)} detail="Completed actions or confirmed submissions in the mapped category." />
                  <Metric label="Self-reported outcome" value={showCount(block.selfReported)} detail="Follow-up observations without external verification." />
                  <Metric label="Verified outcome" value={showCount(block.verified)} detail="Follow-up observations with a verification method and source." />
                </div>
              </>
            )}
            <p className="mt-4 text-sm leading-6 text-[#3d4a5c]">{official.separation}</p>
          </article>
        );
      })}
    </div>
  );
}

function Definitions() {
  return (
    <section className="rounded-2xl bg-white p-5 text-sm leading-6 text-[#3d4a5c] shadow-sm ring-1 ring-[#092451]/10">
      <h2 className="text-base font-semibold text-[#092451]">How these counts work</h2>
      <p className="mt-2">
        A participating resident is a consented, pseudonymous person in your organization and jurisdiction with at least one qualifying event in the selected dates. Active residents are the subset with a qualifying event in the last 7 or 30 days of that range.
      </p>
      <p className="mt-2">
        Qualifying events are assessment start or completion, resource view or save, chat session start, action start or completion, application start, draft save, or confirmed submission, goal completion, and an outcome report. An external verification is not treated as resident engagement. Duplicate events share an idempotency key and count once. A resource view is never an application. A self-reported outcome is never a verified outcome.
      </p>
      <p className="mt-2">
        Groups under 11 are suppressed. If hiding one place or barrier would let someone subtract it from the total, another cell in that breakdown is hidden as well. A filter that removes fewer than 11 people from the larger group returns no counts.
      </p>
    </section>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border-t-4 border-[#FFC928] bg-white p-4 shadow-sm ring-1 ring-[#092451]/10">
      <h2 className="text-sm font-medium text-[#3d4a5c]">{label}</h2>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#092451]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#3d4a5c]">{detail}</p>
    </article>
  );
}

function Panel({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#092451]/10">
      <h2 className="text-base font-semibold text-[#092451]">{title}</h2>
      <p className="mt-1 text-sm text-[#3d4a5c]">{caption}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bars({ rows, hrefFor: linkFor }: { rows: LabeledCount[]; hrefFor?: (id: string) => string }) {
  const max = Math.max(...rows.map((row) => row.count.value ?? 0), 1);
  if (rows.length === 0) return <p className="text-sm text-[#3d4a5c]">No breakdown is available for this view.</p>;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const width = row.count.suppressed || row.count.value === null ? 0 : Math.max(4, (row.count.value / max) * 100);
        const bar = (
          <div className="h-7 overflow-hidden rounded-md bg-[#e7edf5]">
            {row.count.suppressed ? (
              <div className="flex h-full items-center bg-[repeating-linear-gradient(135deg,#e7edf5,#e7edf5_6px,#d5dbe6_6px,#d5dbe6_12px)] px-2 text-xs font-semibold text-[#092451]">
                Suppressed
              </div>
            ) : (
              <div className="h-full rounded-md bg-[#092451]" style={{ width: `${width}%` }} />
            )}
          </div>
        );
        return (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                {linkFor && !row.count.suppressed ? (
                  <Link href={linkFor(row.id)} className="font-medium text-[#092451] underline-offset-2 hover:underline">
                    {row.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#092451]">{row.label}</span>
                )}
              </div>
              {bar}
            </div>
            <span className="w-16 text-right text-sm font-semibold text-[#092451]">{showCount(row.count)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CountTable({ rows }: { rows: LabeledCount[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Barrier counts</caption>
      <thead>
        <tr className="border-b border-[#e7edf5] text-[#3d4a5c]">
          <th scope="col" className="py-2 font-medium">Barrier</th>
          <th scope="col" className="py-2 text-right font-medium">Residents</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[#e7edf5]">
            <th scope="row" className="py-2 font-medium text-[#092451]">{row.label}</th>
            <td className="py-2 text-right">{showCount(row.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Drop({ label, cell }: { label: string; cell: CountCell }) {
  return (
    <div className="rounded-xl bg-[#f4f7fb] p-3">
      <dt className="text-sm text-[#3d4a5c]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-[#092451]">{showCount(cell)}</dd>
    </div>
  );
}

function Fact({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-[#092451] uppercase">{term}</dt>
      <dd className="mt-1 text-sm leading-6 text-[#3d4a5c]">{detail}</dd>
    </div>
  );
}
