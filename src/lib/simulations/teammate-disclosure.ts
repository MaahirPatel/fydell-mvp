/**
 * Simulated-teammate disclosure (SIM-03).
 *
 * Candidates must always be able to tell they are messaging scripted
 * teammates, never real coworkers. Disclosure is structural (a `simulated`
 * flag on every candidate-visible stakeholder) plus human-readable copy.
 * It is applied in the candidate view projections, so no code path can
 * render a stakeholder without it.
 */

export const SIMULATED_TEAMMATE_DISCLOSURE: string =
  "Simulated teammate. This is a scripted character in the assessment, not a real coworker. " +
  "Nothing they say reflects real company events, and no real person reads these messages during the assessment.";

export const SIMULATED_TEAMMATE_BADGE = "Simulated";

export interface DisclosedStakeholder {
  id: string;
  name: string;
  role: string;
  blurb: string;
  /** Always true on candidate-visible stakeholders. */
  simulated: true;
  /** Short badge label for the UI. */
  badge: typeof SIMULATED_TEAMMATE_BADGE;
  /** Full disclosure copy. */
  disclosure: typeof SIMULATED_TEAMMATE_DISCLOSURE;
}

export function withTeammateDisclosure<T extends { id: string; name: string; role: string; blurb: string }>(
  stakeholders: T[]
): Array<Omit<T, "simulated" | "badge" | "disclosure"> & DisclosedStakeholder> {
  return stakeholders.map((s) => ({
    ...s,
    simulated: true as const,
    badge: SIMULATED_TEAMMATE_BADGE,
    disclosure: SIMULATED_TEAMMATE_DISCLOSURE,
  }));
}

/** What the simulation records about teammate interactions (disclosed). */
export const TEAMMATE_DATA_CAPTURE_DISCLOSURE: string =
  "Your messages to simulated teammates are saved as part of your attempt and " +
  "may be shown to the hiring team as evidence of work communication. Teammate " +
  "replies are scripted assessment content.";
