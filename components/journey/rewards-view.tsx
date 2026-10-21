"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { MoneyNote } from "@/components/journey/money-note";
import { ACCESSIBLE_ALTERNATIVE, DEMO_DAY, PILOT_LIMIT } from "@/lib/journey/constants";
import { monthKey, monthRewardTotal, monthlyRewardProgress } from "@/lib/journey/logic";
import { getJourneySnapshot, getServerJourneySnapshot, simulateRewardStatus, subscribeJourney } from "@/lib/journey/store";
import type { RewardStatus } from "@/lib/journey/types";

const STATUS_LABEL: Record<RewardStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  issued: "Issued",
};

export function RewardsView() {
  const state = useSyncExternalStore(subscribeJourney, getJourneySnapshot, getServerJourneySnapshot);
  const month = monthKey(DEMO_DAY);
  const progress = monthlyRewardProgress(state, month);
  const pct = progress.cap === 0 ? 0 : Math.min(100, Math.round((progress.used / progress.cap) * 100));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10">
      <MoneyNote />
      <header>
        <p className="text-sm font-semibold tracking-wide text-[#092451] uppercase">Demonstration pilot</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#092451]">My Rewards</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">{PILOT_LIMIT}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">{ACCESSIBLE_ALTERNATIVE}</p>
      </header>

      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5" aria-labelledby="reward-progress">
        <h2 id="reward-progress" className="text-xl font-semibold text-[#092451]">
          This month
        </h2>
        <p className="mt-2 text-2xl font-semibold text-[#092451]">
          ${progress.used} of ${progress.cap}
        </p>
        <p className="text-sm text-stone-700">Demonstration total for {month}. Not real money.</p>
        <div
          className="mt-3 h-3 rounded-full bg-[#e4e0d8]"
          role="progressbar"
          aria-valuenow={progress.used}
          aria-valuemin={0}
          aria-valuemax={progress.cap}
          aria-label={`Demonstration reward progress, ${progress.used} dollars of ${progress.cap} dollars. Not real money.`}
        >
          <div className="h-3 rounded-full bg-[#FFC928]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          The resident cap is ${state.residentMonthlyCapDollars} per month. A partner campaign can set a lower cap. Example milestones are $5. The same step cannot be rewarded twice. Goal completion by itself does not create a reward.
        </p>
      </section>

      <section aria-labelledby="reward-campaigns" className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 id="reward-campaigns" className="text-xl font-semibold text-[#092451]">
          Sponsor campaigns
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">These sponsors are fictional. Amounts can differ by partner. Nothing is payable.</p>
        <ul className="mt-3 flex flex-col gap-3">
          {state.campaigns.map((campaign) => {
            const used = monthRewardTotal(state.rewards, state.residentId, month, campaign.id);
            return (
              <li key={campaign.id} className="border-t border-[#f4f1ea] pt-3">
                <h3 className="font-semibold text-[#092451]">{campaign.partnerName}</h3>
                <p className="text-sm text-stone-700">
                  ${used} of ${campaign.monthlyCapDollars} campaign cap · ${campaign.milestoneDollars} milestone · {campaign.periodStart} to {campaign.periodEnd}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="reward-list">
        <h2 id="reward-list" className="text-xl font-semibold text-[#092451]">
          Reward records
        </h2>
        {state.rewards.length === 0 ? (
          <p className="mt-2 text-sm text-stone-700">No demonstration rewards yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {state.rewards.map((reward) => {
              const action = state.actions.find((item) => item.id === reward.actionId);
              const campaign = state.campaigns.find((item) => item.id === reward.campaignId);
              return (
                <li key={reward.id} className="rounded-2xl border border-[#e4e0d8] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-stone-950">{action?.description ?? "Milestone"}</h3>
                    <span className="rounded-full bg-[#FFC928] px-2 py-0.5 text-xs font-semibold text-[#092451]">{STATUS_LABEL[reward.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-700">
                    ${reward.amountDollars} · {campaign?.partnerName ?? "Campaign"} · {reward.month} · demonstration only
                  </p>
                  <p className="mt-1 text-sm text-stone-600">Not earned, not payable, and not issued as money.</p>
                  {reward.status === "pending" && (
                    <Button type="button" variant="outline" className="mt-3 h-11 px-3" onClick={() => simulateRewardStatus(reward.id, "approved")}>
                      Mark approved in this demonstration
                    </Button>
                  )}
                  {reward.status === "approved" && (
                    <Button type="button" variant="outline" className="mt-3 h-11 px-3" onClick={() => simulateRewardStatus(reward.id, "issued")}>
                      Mark issued in this demonstration
                    </Button>
                  )}
                  {reward.status !== "issued" && <p className="mt-2 text-sm text-stone-600">This does not send a payment.</p>}
                  {reward.status === "issued" && <p className="mt-2 text-sm text-stone-600">Marked issued in this demonstration. No money was sent.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
