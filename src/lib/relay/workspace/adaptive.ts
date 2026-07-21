/**
 * Constrained information-gain event selection for Project Relay curveballs.
 * Server-only — evaluator trigger logic never ships to the candidate client.
 */

export type AdaptiveEventCandidate = {
  key: string;
  candidateVisibleText: string;
  /** Approximate remaining competency uncertainty reduction [0,1] */
  informationGain: number;
  realism: number;
  coverageGain: number;
  disruption: number;
  redundancy: number;
  unfairnessRisk: number;
  prerequisites: string[];
  earliestElapsedRatio: number;
  latestElapsedRatio: number;
  evaluatorOnly: Record<string, unknown>;
};

const λ = 0.25;
const μ = 0.2;
const ν = 0.35;
const ξ = 0.4;
const ψ = 0.9;

export const RELAY_ADAPTIVE_EVENTS: AdaptiveEventCandidate[] = [
  {
    key: "board_meeting_thursday",
    candidateVisibleText:
      "New constraint · The board review moved to tomorrow. Update your recommendation and delivery plan.",
    informationGain: 0.55,
    realism: 0.9,
    coverageGain: 0.5,
    disruption: 0.35,
    redundancy: 0.1,
    unfairnessRisk: 0.05,
    prerequisites: ["opened_data"],
    earliestElapsedRatio: 0.25,
    latestElapsedRatio: 0.7,
    evaluatorOnly: {
      affects: ["handoff", "prioritization"],
      mustNotReveal: "join_defect",
    },
  },
  {
    key: "vp_wants_root_cause",
    candidateVisibleText:
      "Priya Anand (VP Operations) just clarified she needs a defensible root-cause narrative for the board—not only an ops dashboard. Align scope with Dana before you overbuild.",
    informationGain: 0.65,
    realism: 0.95,
    coverageGain: 0.6,
    disruption: 0.3,
    redundancy: 0.15,
    unfairnessRisk: 0.05,
    prerequisites: ["messaged_or_opened_brief"],
    earliestElapsedRatio: 0.2,
    latestElapsedRatio: 0.65,
    evaluatorOnly: {
      affects: ["customer_communication", "prioritization"],
      mustNotReveal: "join_defect",
    },
  },
  {
    key: "carrier_data_unreliable",
    candidateVisibleText:
      "A carrier’s self-reported on-time rate does not match what the shipment extract implies. Verify carrier claims before citing them in the handoff.",
    informationGain: 0.45,
    realism: 0.85,
    coverageGain: 0.4,
    disruption: 0.2,
    redundancy: 0.2,
    unfairnessRisk: 0.05,
    prerequisites: ["opened_data"],
    earliestElapsedRatio: 0.3,
    latestElapsedRatio: 0.8,
    evaluatorOnly: {
      affects: ["data_integrity", "risk_management"],
      mustNotReveal: "join_defect",
    },
  },
];

export function utility(x: AdaptiveEventCandidate): number {
  return (
    x.informationGain +
    λ * x.realism +
    μ * x.coverageGain -
    ν * x.disruption -
    ξ * x.redundancy -
    ψ * x.unfairnessRisk
  );
}

export type AdaptiveContext = {
  elapsedRatio: number;
  alreadyTriggered: string[];
  signals: {
    openedData: boolean;
    messagedOrOpenedBrief: boolean;
    editedCode: boolean;
    ranTests: boolean;
  };
  remainingMinutes: number;
};

function prereqOk(x: AdaptiveEventCandidate, ctx: AdaptiveContext): boolean {
  for (const p of x.prerequisites) {
    if (p === "opened_data" && !ctx.signals.openedData) return false;
    if (p === "messaged_or_opened_brief" && !ctx.signals.messagedOrOpenedBrief) return false;
  }
  return true;
}

/**
 * Select x* = argmax Utility(x) under hard constraints.
 * Returns null if no fair/plausible event remains.
 */
export function selectAdaptiveEvent(ctx: AdaptiveContext): AdaptiveEventCandidate | null {
  if (ctx.remainingMinutes < 8) return null;
  const pool = RELAY_ADAPTIVE_EVENTS.filter((x) => {
    if (ctx.alreadyTriggered.includes(x.key)) return false;
    if (ctx.elapsedRatio < x.earliestElapsedRatio) return false;
    if (ctx.elapsedRatio > x.latestElapsedRatio) return false;
    if (x.unfairnessRisk > 0.5) return false;
    if (!prereqOk(x, ctx)) return false;
    return true;
  });
  if (!pool.length) return null;
  let best = pool[0];
  let bestU = utility(best);
  for (const x of pool.slice(1)) {
    const u = utility(x);
    if (u > bestU) {
      best = x;
      bestU = u;
    }
  }
  return { ...best, informationGain: best.informationGain }; // utility embedded via score
}

export function scoreEvent(x: AdaptiveEventCandidate): number {
  return utility(x);
}
