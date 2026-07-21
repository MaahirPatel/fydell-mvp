/**
 * Five plain-language stages for Project Relay.
 * Stages guide progress; candidates may move freely between workspace tools.
 * Index is computed from activity signals (never self-report scoring).
 */

export type RelayStage = "understand" | "investigate" | "build" | "verify" | "handoff";

export const STAGE_ORDER: { id: RelayStage; label: string; guide: string }[] = [
  {
    id: "understand",
    label: "Understand",
    guide: "Read the brief and client chat. Confirm what Dana needs and what “done” looks like.",
  },
  {
    id: "investigate",
    label: "Investigate",
    guide: "Open the data files, compare sources, and find why the delay report understates late shipments.",
  },
  {
    id: "build",
    label: "Build",
    guide: "Edit the pipeline (normalize IDs, fix joins) so delayed shipments are not silently dropped.",
  },
  {
    id: "verify",
    label: "Verify",
    guide: "Run tests and preview. Confirm late rate and unmatched rows before you hand off.",
  },
  {
    id: "handoff",
    label: "Handoff",
    guide: "Draft what changed, evidence it works, remaining limits, and a clear message to Dana.",
  },
];

export type StageSignals = {
  started: boolean;
  openedBriefOrChat: boolean;
  inspectedData: boolean;
  editCount: number;
  verifyRunCount: number;
  handoffFilled: boolean;
};

export function computeStageIndex(signals: StageSignals): number {
  const conditions: boolean[] = [
    signals.started,
    signals.openedBriefOrChat || signals.inspectedData,
    signals.editCount > 0,
    signals.verifyRunCount > 0,
    signals.handoffFilled,
  ];
  let furthest = 0;
  for (let i = 0; i < conditions.length; i++) {
    if (conditions[i]) furthest = i;
  }
  return furthest;
}

export function computeStage(signals: StageSignals): RelayStage {
  return STAGE_ORDER[computeStageIndex(signals)].id;
}

/** @deprecated Use STAGE_ORDER / computeStageIndex */
export const PHASE_ORDER = STAGE_ORDER.map((s) => ({ id: s.id, label: s.label }));
export type RelayPhase = RelayStage;
export type PhaseSignals = StageSignals & {
  chatMessageCount?: number;
  planFilled?: boolean;
  evalsRunCount?: number;
  curveballRevealed?: boolean;
};
export function computePhaseIndex(signals: PhaseSignals): number {
  return computeStageIndex({
    started: signals.started,
    openedBriefOrChat: (signals.chatMessageCount ?? 0) > 0 || Boolean(signals.planFilled),
    inspectedData: Boolean(signals.planFilled),
    editCount: signals.editCount,
    verifyRunCount: signals.evalsRunCount ?? signals.verifyRunCount ?? 0,
    handoffFilled: signals.handoffFilled,
  });
}
export function computePhase(signals: PhaseSignals): RelayPhase {
  return STAGE_ORDER[computePhaseIndex(signals)].id;
}
