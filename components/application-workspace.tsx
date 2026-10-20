"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldById, isBlank, missingFieldIds, submissionLabel, validateDraft } from "@/lib/applications/logic";
import {
  getApplicationSnapshot,
  getServerApplicationSnapshot,
  grantPrefillConsent,
  markDraftReviewed,
  subscribeApplications,
  updateDraftValues,
} from "@/lib/applications/store";
import type { FieldValue } from "@/lib/applications/types";
import { routes } from "@/lib/site";

export function ApplicationWorkspace({ draftId }: { draftId: string }) {
  const snapshot = useSyncExternalStore(subscribeApplications, getApplicationSnapshot, getServerApplicationSnapshot);
  const draft = snapshot.drafts.find((item) => item.id === draftId);
  const program = draft ? snapshot.programs.find((item) => item.id === draft.programId) : undefined;
  const [showReview, setShowReview] = useState(false);

  if (!draft || !program) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold text-[#092451]">Application not found</h1>
        <p className="mt-3 text-stone-700">This demonstration application is not in the mock list.</p>
        <Link href={routes.applications} className="mt-4 inline-block font-medium text-[#092451] underline-offset-4 hover:underline">
          Back to My applications
        </Link>
      </main>
    );
  }

  const values = draft.values;
  const missing = missingFieldIds(program.schema, values);
  const errors = validateDraft(program.schema, values);
  const showErrors = draft.status === "needs_review";
  const errorFor = (id: string) => {
    const message = errors.find((error) => error.id === id)?.message;
    if (!message) return undefined;
    if (showErrors) return message;
    if (!isBlank(values[id])) return message;
    return undefined;
  };

  function setField(id: string, value: FieldValue) {
    updateDraftValues(draftId, { ...values, [id]: value });
    setShowReview(false);
  }

  function onReview() {
    const next = markDraftReviewed(draftId);
    setShowReview(Boolean(next?.reviewed));
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Demonstration program</p>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">{program.name}</h1>
        <p className="mt-2 text-base leading-relaxed text-stone-700">
          {program.summary} This is not a government form. Answers stay in this session and are not saved in this browser.
        </p>
      </div>
      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5" aria-label="Program source">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-stone-600">Website</dt>
            <dd>
              <a className="text-[#092451] underline-offset-4 hover:underline" href={program.source.officialWebsite}>
                {program.source.officialWebsite}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Application link</dt>
            <dd>
              <a className="text-[#092451] underline-offset-4 hover:underline" href={program.source.applicationUrl}>
                {program.source.applicationUrl}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Source date</dt>
            <dd className="text-stone-900">{program.source.sourceDate}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Verification date</dt>
            <dd className="text-stone-900">{program.source.verificationDate}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Form version</dt>
            <dd className="text-stone-900">{program.source.formVersion}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-600">Submission method</dt>
            <dd className="text-stone-900">{submissionLabel(program.submissionMethod)}</dd>
          </div>
        </dl>
        <h2 className="mt-4 text-base font-semibold text-[#092451]">Eligibility notes</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          {program.eligibilityCriteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h2 className="mt-4 text-base font-semibold text-[#092451]">Documents this demo asks about</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          {program.requiredDocuments.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl bg-[#FFC928] px-4 py-3 text-sm leading-relaxed text-[#092451]" aria-label="Program differences">
        This form uses {program.incomePeriod === "monthly" ? "monthly" : "yearly"} income and counts household members as: {program.householdDefinition} A different demonstration form uses another income period and another household count. Those answers are not copied across forms.
      </section>
      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[#092451]">Shared profile answers</h2>
        {draft.consentToPrefill ? (
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            You agreed to fill shared answers for this application only. Name, phone, and ZIP came from the demonstration profile. Income and household counts did not.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              Shared answers stay blank until you agree for this application. Agreeing copies only name, phone, and ZIP.
            </p>
            <button
              type="button"
              className="mt-3 h-11 rounded-lg bg-[#092451] px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => grantPrefillConsent(draftId)}
            >
              Use my demonstration profile for this application
            </button>
          </>
        )}
      </section>
      {missing.length > 0 && (
        <section aria-live="polite" className="rounded-2xl border border-[#e4e0d8] bg-white p-4">
          <h2 className="text-lg font-semibold text-[#092451]">Still missing</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-800">
            {missing.map((id) => (
              <li key={id}>{fieldById(program.schema, id)?.label ?? id}</li>
            ))}
          </ul>
        </section>
      )}
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onReview();
        }}
      >
        {program.schema.fields.map((field) => {
          const value = draft.values[field.id];
          const message = errorFor(field.id);
          return (
            <div key={field.id} className="flex flex-col gap-1">
              <Label htmlFor={`${draftId}-${field.id}`} className="text-base text-stone-900">
                {field.label}
                {field.required ? <span className="text-stone-500"> (required)</span> : null}
              </Label>
              {field.help && <p className="text-sm text-stone-600">{field.help}</p>}
              <Input
                id={`${draftId}-${field.id}`}
                className="h-12 text-base"
                inputMode={field.type === "number" ? "decimal" : field.id === "phone" ? "tel" : "text"}
                aria-invalid={Boolean(message)}
                aria-describedby={message ? `${draftId}-${field.id}-error` : undefined}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(event) => setField(field.id, event.target.value)}
              />
              {message && (
                <p id={`${draftId}-${field.id}-error`} className="text-sm text-rose-800" role="alert">
                  {message}
                </p>
              )}
            </div>
          );
        })}
        <p className="text-sm text-stone-600">Saved in this session at {draft.updatedAt}. Not stored in this browser.</p>
        <button
          type="submit"
          className="h-12 rounded-lg bg-[#092451] text-base font-medium text-white focus-visible:ring-2 focus-visible:ring-[#092451] focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Check and review
        </button>
      </form>
      {showReview && draft.reviewed && (
        <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4" aria-label="Review">
          <h2 className="text-lg font-semibold text-[#092451]">Review</h2>
          <p className="mt-2 text-sm text-stone-700">These answers are ready to read back. This page does not send them.</p>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {program.schema.fields.map((field) => (
              <div key={field.id} className="flex justify-between gap-4 border-b border-[#e4e0d8] py-2">
                <dt className="text-stone-600">{field.label}</dt>
                <dd className="text-right font-medium text-stone-950">{String(draft.values[field.id] ?? "")}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {draft.status === "needs_review" && !showReview && (
        <p className="text-sm text-rose-800" role="alert">
          Some answers still need attention before a review can be shown.
        </p>
      )}
      <Link href={routes.applications} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline">
        Back to My applications
      </Link>
    </main>
  );
}
