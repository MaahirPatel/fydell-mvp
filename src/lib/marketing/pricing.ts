/** Published employer pricing, in US dollars. Engineers never pay. */
/** Company value the Pro waitlist form submits; the confirmation email keys off it. */
export const PRO_WAITLIST_COMPANY = "Fydell Pro waitlist";

export const PRICING = {
  starterPerSimulation: 49,
  teamMonthly: 399,
  teamIncluded: 10,
  teamOverage: 35,
  enterpriseFrom: 50,
} as const;

export type PlanKey = "starter" | "team" | "enterprise";

export function starterCost(simulations: number): number {
  return simulations * PRICING.starterPerSimulation;
}

export function teamCost(simulations: number): number {
  return PRICING.teamMonthly + Math.max(0, simulations - PRICING.teamIncluded) * PRICING.teamOverage;
}

/** The cheapest published plan for a monthly volume of completed simulations. */
export function recommendedPlan(simulations: number): PlanKey {
  if (simulations >= PRICING.enterpriseFrom) return "enterprise";
  return teamCost(simulations) < starterCost(simulations) ? "team" : "starter";
}

/** Sign up as an employer, then land on the plan picker with this plan highlighted. */
export function planSignupHref(plan: "starter" | "team"): string {
  return `/signup?as=employer&next=${encodeURIComponent(`/app/employer/settings?plan=${plan}#plan`)}`;
}

export function usd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
