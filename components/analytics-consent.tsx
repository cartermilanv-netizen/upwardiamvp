"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import {
  allowAggregateAnalytics,
  declineAggregateAnalytics,
  deleteAggregateAnalytics,
  withdrawAggregateAnalytics,
} from "@/app/impact/consent-actions";
import { Button } from "@/components/ui/button";
import { readAnalyticsChoice, subscribeAnalyticsChoice, writeAnalyticsChoice } from "@/lib/analytics-consent";
import { routes } from "@/lib/site";

export function AnalyticsConsent() {
  const choice = useSyncExternalStore(subscribeAnalyticsChoice, readAnalyticsChoice, () => null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const granted = choice?.state === "granted" && Boolean(choice.residentId);
  const status = granted ? "Aggregate analytics are on." : choice?.state === "declined" ? "You chose no analytics." : choice?.state === "withdrawn" ? "Analytics consent is withdrawn." : "Aggregate analytics are off. That is the default.";

  function allow() {
    setMessage(null);
    startTransition(async () => {
      const result = await allowAggregateAnalytics(choice?.residentId ?? null);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      writeAnalyticsChoice({ state: "granted", residentId: result.residentId });
      setMessage("Analytics are on for this browser. Reports still show groups, not you.");
    });
  }

  function decline() {
    setMessage(null);
    startTransition(async () => {
      const result = await declineAggregateAnalytics(choice?.residentId ?? null);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      writeAnalyticsChoice({ state: "declined", residentId: choice?.residentId ?? null });
      setMessage("Analytics stay off. Explore Resources and the assessment are still available.");
    });
  }

  function withdraw() {
    if (!choice?.residentId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await withdrawAggregateAnalytics(choice.residentId ?? "");
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      writeAnalyticsChoice({ state: "withdrawn", residentId: choice.residentId });
      setMessage("New analytics events will not be stored. Earlier events stay until you delete them.");
    });
  }

  function remove() {
    if (!choice?.residentId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAggregateAnalytics(choice.residentId ?? "");
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      writeAnalyticsChoice(null);
      setMessage("Stored analytics events for this id were deleted.");
    });
  }

  return (
    <section id="analytics-consent" className="rounded-2xl border border-[#e4e0d8] bg-white p-5" aria-labelledby="analytics-consent-title">
      <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Optional</p>
      <h2 id="analytics-consent-title" className="mt-1 text-2xl font-semibold tracking-tight text-[#092451]">
        Aggregate analytics
      </h2>
      <p className="mt-3 text-base leading-relaxed text-stone-700" role="status">
        {status}
      </p>
      <p className="mt-3 text-base leading-relaxed text-stone-700">
        If you turn this on, Upwardia can count finishing an assessment, opening or saving a resource, choosing a need, starting or finishing an action, and how far an application gets. Reports are totals for groups of people. They are not a report about you.
      </p>
      <p className="mt-3 text-base leading-relaxed text-stone-700">
        <Link href={routes.resources} className="font-medium text-[#092451] underline-offset-4 hover:underline">
          Explore Resources
        </Link>{" "}
        and the{" "}
        <Link href={routes.assessment} className="font-medium text-[#092451] underline-offset-4 hover:underline">
          household assessment
        </Link>{" "}
        stay available either way. This choice does not decide whether you can use them.
      </p>
      <p className="mt-3 text-base leading-relaxed text-stone-700">
        This setting does not send household income, health conditions, immigration information, a Social Security number, chat messages, or application answers. The analytics id is a random code, not your name.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" className="h-11 bg-[#092451] px-4 text-white hover:bg-[#092451]/90" disabled={pending || granted} onClick={allow}>
          Allow aggregate analytics
        </Button>
        <Button type="button" variant="outline" className="h-11 px-4" disabled={pending || granted || choice?.state === "declined"} onClick={decline}>
          No thanks
        </Button>
        <Button type="button" variant="outline" className="h-11 px-4" disabled={pending || !granted} onClick={withdraw}>
          Withdraw analytics consent
        </Button>
        <Button type="button" variant="outline" className="h-11 px-4" disabled={pending || !choice?.residentId} onClick={remove}>
          Delete my analytics events
        </Button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Withdraw stops new counts. Delete removes the counts already stored for your analytics id. Nothing is stored until you allow this.
      </p>
      {message ? (
        <p className="mt-3 text-sm text-[#092451]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
