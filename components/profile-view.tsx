"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { getApplicationSnapshot, getServerApplicationSnapshot, subscribeApplications } from "@/lib/applications/store";
import { routes } from "@/lib/site";

const rows = [
  { key: "preferredName" as const, label: "Name" },
  { key: "phone" as const, label: "Phone" },
  { key: "postalCode" as const, label: "ZIP code" },
  { key: "email" as const, label: "Email" },
];

export function ProfileView() {
  const snapshot = useSyncExternalStore(subscribeApplications, getApplicationSnapshot, getServerApplicationSnapshot);
  const profile = snapshot.profile;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Demonstration profile</p>
      <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My profile</h1>
      <AnalyticsConsent />
      <p className="text-base leading-relaxed text-stone-700">
        Avery Example is a made-up person. This profile lives in the application mock for this session. It is not saved in this browser, and it is not used on an application until that application asks for consent.
      </p>
      <dl className="rounded-2xl border border-[#e4e0d8] bg-white">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-1 border-b border-[#e4e0d8] px-4 py-3 last:border-b-0 sm:flex-row sm:justify-between">
            <dt className="text-sm text-stone-600">{row.label}</dt>
            <dd className="text-base font-medium text-stone-950">{profile[row.key]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-relaxed text-stone-700">
        Income and household counts are not on this profile, because demonstration programs define them differently.
      </p>
      <Link href={routes.applications} className="text-sm font-medium text-[#092451] underline-offset-4 hover:underline">
        Go to My applications
      </Link>
    </main>
  );
}
