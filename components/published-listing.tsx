import type { VerifiedCatalogEntry } from "@/lib/types";

function longDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function PublishedListing({ entry, compact = false }: { entry: VerifiedCatalogEntry; compact?: boolean }) {
  const links = entry.officialLinks ?? [{ url: entry.sourceUrl, note: null }];
  const requirements = entry.eligibility.statedRequirements;
  return (
    <article id={`published-${entry.id}`} className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
      {!compact && <h3 className="text-xl font-semibold text-[#092451]">{entry.name}</h3>}
      {!compact && <p className="mt-2 text-sm leading-relaxed text-stone-800">{entry.claimText}</p>}
      {!compact && entry.services && entry.services.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
          {entry.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
      )}
      {requirements.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-[#092451]">Eligibility limits from the official page</h4>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {requirements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {!compact && entry.documents && entry.documents.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-[#092451]">Documents staff may ask for</h4>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {entry.documents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {!compact && entry.incomeChart && <IncomeChartTable chart={entry.incomeChart} staffNote={requirements.find((line) => /determine eligibility/i.test(line)) ?? null} />}
      {!compact && entry.applicationInstructions && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-[#092451]">What the official page says about applying</h4>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{entry.applicationInstructions}</p>
        </div>
      )}
      {!compact && (entry.phone || entry.contactEmail || entry.contactHours) && (
        <dl className="mt-4 grid gap-2 text-sm text-stone-800 sm:grid-cols-2">
          {entry.phone && (
            <div>
              <dt className="font-semibold text-[#092451]">Phone</dt>
              <dd>
                <a className="underline decoration-[#092451]/40 underline-offset-2" href={`tel:${entry.phone.replace(/[^\d+]/g, "")}`}>
                  {entry.phone}
                </a>
              </dd>
            </div>
          )}
          {entry.contactEmail && (
            <div>
              <dt className="font-semibold text-[#092451]">Email</dt>
              <dd>
                <a className="underline decoration-[#092451]/40 underline-offset-2" href={`mailto:${entry.contactEmail}`}>
                  {entry.contactEmail}
                </a>
              </dd>
            </div>
          )}
          {entry.contactHours && (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-[#092451]">Hours</dt>
              <dd>{entry.contactHours}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-[#092451]">Sources</h4>
        <p className="mt-1 text-sm text-stone-600">
          {entry.sourceName}. Last verified {entry.lastVerified}.
        </p>
        <ul className="mt-2 space-y-2">
          {links.map((link) => (
            <li key={link.url} className="text-sm leading-relaxed">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#092451] underline decoration-[#FFC928] decoration-2 underline-offset-4"
              >
                {hostLabel(link.url)}
              </a>
              {link.note && <span className="mt-1 block text-stone-600">{link.note}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-xl bg-[#f4f1ea] p-3">
        <p className="text-sm leading-relaxed text-stone-800">{entry.preparationNote}</p>
        {entry.applicationUrl && (
          <a
            href={entry.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 items-center rounded-lg bg-[#092451] px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Open the official application instructions
          </a>
        )}
      </div>
    </article>
  );
}

function IncomeChartTable({
  chart,
  staffNote,
}: {
  chart: NonNullable<VerifiedCatalogEntry["incomeChart"]>;
  staffNote: string | null;
}) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-[#092451]">Income chart printed for 1 through {chart.rows.length} people</h4>
      <p className="mt-1 text-sm leading-relaxed text-stone-700">
        Maximum allowable income, effective {longDate(chart.effectiveFrom)} through {longDate(chart.effectiveTo)}.{" "}
        <a href={chart.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#092451] underline underline-offset-2">
          Source chart
        </a>
        .
      </p>
      {staffNote && <p className="mt-2 text-sm leading-relaxed text-stone-800">{staffNote}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Maximum allowable income for {chart.rows.length} household sizes, effective {longDate(chart.effectiveFrom)} through {longDate(chart.effectiveTo)}
          </caption>
          <thead>
            <tr className="border-b border-[#e4e0d8] text-[#092451]">
              <th scope="col" className="px-2 py-2 font-semibold">People</th>
              <th scope="col" className="px-2 py-2 font-semibold">Annual</th>
              <th scope="col" className="px-2 py-2 font-semibold">Monthly</th>
              <th scope="col" className="px-2 py-2 font-semibold">Twice-monthly</th>
              <th scope="col" className="px-2 py-2 font-semibold">Bi-weekly</th>
              <th scope="col" className="px-2 py-2 font-semibold">Weekly</th>
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row.people} className="border-b border-[#f4f1ea]">
                <th scope="row" className="px-2 py-2 font-medium text-stone-900">{row.people}</th>
                <td className="px-2 py-2">{row.annual}</td>
                <td className="px-2 py-2">{row.monthly}</td>
                <td className="px-2 py-2">{row.twiceMonthly}</td>
                <td className="px-2 py-2">{row.biweekly}</td>
                <td className="px-2 py-2">{row.weekly}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
