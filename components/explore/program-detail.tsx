"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IncomeChartTable } from "@/components/published-listing";
import { ExploreBack, ExploreCrumbs, ExploreMain } from "@/components/explore/frame";
import { PreparationJump, SaveProgramButton } from "@/components/explore/save-program";
import { residentCatalog } from "@/lib/catalog";
import {
  askAboutProgramHref,
  hasApplicationPreparation,
  needsForProgram,
  officialApplication,
  programBackHref,
  resourceCategory,
  resourceCategoryHref,
  resourceNeedHref,
} from "@/lib/resources";
import { routes } from "@/lib/site";

function verifiedDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ProgramDetail({ programId }: { programId: string }) {
  const needId = useSearchParams().get("need");
  const entry = residentCatalog.find((item) => item.id === programId && item.verified === true);
  if (!entry) return null;
  const needs = needsForProgram(entry.id);
  const fromNeed = needs.find((need) => need.id === needId) ?? needs[0] ?? null;
  const category = fromNeed ? resourceCategory(fromNeed.categoryId) : null;
  const application = officialApplication(entry);
  const links = entry.officialLinks ?? [{ url: entry.sourceUrl, note: null }];
  const requirements = entry.eligibility.statedRequirements;
  const documents = entry.documents ?? [];
  const services = entry.services ?? [];
  const prepare = hasApplicationPreparation(entry);
  const staffNote = requirements.find((line) => /determine eligibility/i.test(line)) ?? null;

  return (
    <ExploreMain>
      <ExploreBack href={programBackHref(entry.id, needId)} label="Back" />
      <ExploreCrumbs
        items={[
          { href: routes.resources, label: "Explore resources" },
          ...(fromNeed && category ? [{ href: resourceCategoryHref(fromNeed.categoryId), label: category.title }] : []),
          ...(fromNeed ? [{ href: resourceNeedHref(fromNeed.categoryId, fromNeed.id), label: fromNeed.label }] : []),
          { label: entry.name },
        ]}
      />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Possible match</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451] sm:text-4xl">{entry.name}</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-800">This listing is a possible match, not confirmed eligibility.</p>
        <p className="mt-2 text-sm text-stone-600">Last verified {verifiedDate(entry.lastVerified)}.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SaveProgramButton programId={entry.id} />
        <Link
          href={askAboutProgramHref(entry.id)}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#092451] px-4 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ask Upwardia about this resource
        </Link>
        {prepare && <PreparationJump />}
      </div>
      {needs.length > 0 && (
        <p className="text-sm text-stone-700">
          Listed under{" "}
          {needs.map((need, index) => (
            <span key={need.id}>
              {index > 0 ? ", " : ""}
              <Link href={resourceNeedHref(need.categoryId, need.id)} className="font-semibold text-[#092451] underline-offset-4 hover:underline">
                {need.label}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">What this program does</h2>
        <p className="mt-3 text-base leading-relaxed text-stone-800">{entry.claimText}</p>
        {services.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed text-stone-700">
            {services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">Who it may help</h2>
        <p className="mt-3 text-base leading-relaxed text-stone-800">
          The official page describes who may be helped. This is a possible match for that description. It is not a decision about your household.
        </p>
        <p className="mt-3 text-base leading-relaxed text-stone-700">
          {entry.sourceName} publishes this listing. Read the eligibility section for the limits written on the official page.
        </p>
      </section>
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">Eligibility</h2>
        <p className="mt-3 text-base leading-relaxed text-stone-800">Eligibility depends on household circumstances. A listing here does not mean you are approved.</p>
        {requirements.length > 0 && (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-stone-700">
            {requirements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {entry.incomeChart && <IncomeChartTable chart={entry.incomeChart} staffNote={staffNote} />}
      </section>
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">What you may need to apply</h2>
        {documents.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-stone-700">
            {documents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-base leading-relaxed text-stone-700">This verified listing does not name documents to bring.</p>
        )}
      </section>
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">How to apply</h2>
        {entry.applicationInstructions ? (
          <p className="mt-3 text-base leading-relaxed text-stone-800">{entry.applicationInstructions}</p>
        ) : (
          <p className="mt-3 text-base leading-relaxed text-stone-700">This verified listing does not include application steps.</p>
        )}
        {(entry.phone || entry.contactEmail || entry.contactHours) && (
          <dl className="mt-4 grid gap-3 text-base text-stone-800 sm:grid-cols-2">
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
      </section>
      {application && (
        <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[#092451]">Official application</h2>
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 items-center rounded-xl bg-[#092451] px-4 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Official application
          </a>
          {application.note && <p className="mt-2 text-sm leading-relaxed text-stone-600">{application.note}</p>}
        </section>
      )}
      <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-[#092451]">Sources</h2>
        <p className="mt-2 text-base text-stone-700">
          {entry.sourceName}. Last verified {verifiedDate(entry.lastVerified)}.
        </p>
        <ul className="mt-3 space-y-2">
          {links.map((link) => (
            <li key={link.url} className="text-base leading-relaxed">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#092451] underline decoration-[#FFC928] decoration-2 underline-offset-4"
              >
                {hostLabel(link.url)}
              </a>
              {link.note && <span className="mt-1 block text-sm text-stone-600">{link.note}</span>}
            </li>
          ))}
        </ul>
        {entry.preparationNote && <p className="mt-4 rounded-xl bg-[#f4f1ea] p-3 text-base leading-relaxed text-stone-800">{entry.preparationNote}</p>}
      </section>
      {prepare && (
        <section id="application-preparation" className="scroll-mt-4 rounded-3xl border border-[#092451] bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-[#092451]">Start Application Preparation</h2>
          <p className="mt-3 text-base leading-relaxed text-stone-800">{entry.preparationNote}</p>
          <p className="mt-2 text-base leading-relaxed text-stone-700">
            This preparation does not submit an application. Your household answers are not uploaded.
          </p>
          {entry.applicationInstructions && <p className="mt-3 text-base leading-relaxed text-stone-800">{entry.applicationInstructions}</p>}
          {documents.length > 0 && (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-stone-700">
              {documents.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {application && (
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-[#092451] px-4 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Official application
            </a>
          )}
        </section>
      )}
    </ExploreMain>
  );
}
