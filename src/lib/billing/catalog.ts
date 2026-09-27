import { PRICING } from "../marketing/pricing";

/** Stripe meter event recorded once per completed simulation. */
export const METER_EVENT_NAME = "fydell_completed_simulation";

/** Stable lookup keys so the Stripe catalog can be recreated or found without hardcoded IDs. */
export const PRICE_LOOKUP_KEYS = {
  starterUsage: "fydell_starter_per_simulation",
  teamBase: "fydell_team_monthly",
  teamUsage: "fydell_team_overage",
} as const;

export const PRICE_CENTS = {
  starterPerSimulation: PRICING.starterPerSimulation * 100,
  teamMonthly: PRICING.teamMonthly * 100,
  teamOverage: PRICING.teamOverage * 100,
  teamIncluded: PRICING.teamIncluded,
} as const;
