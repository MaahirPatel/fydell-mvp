/**
 * Heuristic phase-rail computation for the Project Relay workspace.
 * Advances from recorded activity signals only — never a self-report toggle.
 * Monotonic-ish: we take the furthest phase whose condition currently holds,
 * so phases don't regress just because e.g. chat goes quiet for a while.
 */

export type RelayPhase = "orient" | "discover" | "scope" | "build" | "evaluate" | "curveball" | "handoff";

export const PHASE_ORDER: { id: RelayPhase; label: string }[] = [
  { id: "orient", label: "Orient" },
  { id: "discover", label: "Discover" },
  { id: "scope", label: "Scope" },
  { id: "build", label: "Build" },
  { id: "evaluate", label: "Evaluate" },
  { id: "curveball", label: "Curveball" },
  { id: "handoff", label: "Handoff" },
];

export type PhaseSignals = {
  started: boolean;
  chatMessageCount: number;
  planFilled: boolean;
  editCount: number;
  evalsRunCount: number;
  curveballRevealed: boolean;
  handoffFilled: boolean;
};

export function computePhaseIndex(signals: PhaseSignals): number {
  const conditions: boolean[] = [
    signals.started,
    signals.chatMessageCount > 0,
    signals.planFilled,
    signals.editCount > 0,
    signals.evalsRunCount > 0,
    signals.curveballRevealed,
    signals.handoffFilled,
  ];
  let furthest = 0;
  for (let i = 0; i < conditions.length; i++) {
    if (conditions[i]) furthest = i;
  }
  return furthest;
}

export function computePhase(signals: PhaseSignals): RelayPhase {
  return PHASE_ORDER[computePhaseIndex(signals)].id;
}
