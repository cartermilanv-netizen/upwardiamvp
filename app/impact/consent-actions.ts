"use server";

import { randomBytes } from "node:crypto";
import { declineAnalyticsConsent, deleteAnalyticsForResident, grantHoldingConsent, withdrawAnalyticsConsent } from "@/lib/impact/consent";
import { PUBLIC_RESIDENT_ID } from "@/lib/impact/constants";
import { getDb } from "@/lib/impact/db";

export async function allowAggregateAnalytics(existingId: string | null): Promise<{ ok: true; residentId: string } | { ok: false; message: string }> {
  const id = existingId && PUBLIC_RESIDENT_ID.test(existingId) ? existingId : `res_${randomBytes(16).toString("hex")}`;
  const result = grantHoldingConsent(getDb(), id, new Date().toISOString());
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, residentId: id };
}

export async function declineAggregateAnalytics(existingId: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!existingId || !PUBLIC_RESIDENT_ID.test(existingId)) return { ok: true };
  const result = declineAnalyticsConsent(getDb(), existingId, new Date().toISOString());
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true };
}

export async function withdrawAggregateAnalytics(residentId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = withdrawAnalyticsConsent(getDb(), residentId, new Date().toISOString());
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true };
}

export async function deleteAggregateAnalytics(residentId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = deleteAnalyticsForResident(getDb(), residentId, new Date().toISOString());
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true };
}
