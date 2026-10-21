import { demonstrationProfile } from "@/lib/applications/catalog";

/** Same fictional person as the application center. Not a new account. */
export const JOURNEY_RESIDENT_ID = demonstrationProfile.id;

/** Stable demonstration day so server and browser render the same "today". */
export const DEMO_DAY = "2026-10-21";

export const DEFAULT_MONTHLY_CAP = 25;
export const EXAMPLE_MILESTONE_DOLLARS = 5;

export const MONEY_NOTE =
  "These amounts are not real money. Nothing has been earned, is payable, or has been issued.";

export const ACCESSIBLE_ALTERNATIVE =
  "You can complete this step with no demonstration reward. The step still counts toward your goal. The reward is optional.";

export const PILOT_LIMIT =
  "This is a fictional pilot. Funding, legal, tax, and public-benefit rules are not validated. Nothing here moves money.";

export const REWARD_EXCLUSIONS = [
  "clicks",
  "extra_data_disclosure",
  "extra_applications",
  "benefit_decisions",
] as const;

export type RewardExclusion = (typeof REWARD_EXCLUSIONS)[number];
