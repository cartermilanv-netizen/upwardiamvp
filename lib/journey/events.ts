/**
 * Consent-based names for a future aggregate pipeline.
 * They are defined here and not emitted. Resident pages do not send them.
 * Demo journey data stays on this screen and is not mixed into Live totals.
 */
export const JOURNEY_CONSENT_EVENTS = [
  "goal_created",
  "goal_progressed",
  "action_started",
  "action_completed",
  "action_verified",
  "reminder_created",
  "application_progressed",
  "reward_pending",
  "reward_approved",
  "reward_issued",
  "outcome_reported",
] as const;

export type JourneyConsentEvent = (typeof JOURNEY_CONSENT_EVENTS)[number];

export const JOURNEY_EVENTS_EMITTED = false;

export const JOURNEY_DATASET = "demonstration" as const;

export function describeJourneyEvents(): {
  names: readonly JourneyConsentEvent[];
  emitted: false;
  dataset: "demonstration";
  liveSeparated: true;
} {
  return {
    names: JOURNEY_CONSENT_EVENTS,
    emitted: JOURNEY_EVENTS_EMITTED,
    dataset: JOURNEY_DATASET,
    liveSeparated: true,
  };
}
