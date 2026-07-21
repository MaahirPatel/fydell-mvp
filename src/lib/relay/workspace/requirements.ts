import type { RequirementState, TestState, WorkspaceEngineState } from "./types";

export const DEFAULT_REQUIREMENTS: RequirementState[] = [
  {
    id: "inspect_sources",
    description: "Open and inspect both shipment and delay data sources",
    blocking: false,
    status: "NOT_STARTED",
    evidenceTestIds: [],
    lastVerifiedAtWorkspaceVersion: null,
  },
  {
    id: "stakeholder_priority",
    description: "Clarify stakeholder priority with Dana or Priya",
    blocking: false,
    status: "NOT_STARTED",
    evidenceTestIds: [],
    lastVerifiedAtWorkspaceVersion: null,
  },
  {
    id: "normalization",
    description: "Shipment ID normalization preserves valid IDs and recovers unmatched delays",
    blocking: true,
    status: "NOT_STARTED",
    evidenceTestIds: ["visible_suite"],
    lastVerifiedAtWorkspaceVersion: null,
  },
  {
    id: "verified_output",
    description: "Preview / report regenerated against the current workspace version",
    blocking: true,
    status: "NOT_STARTED",
    evidenceTestIds: ["preview"],
    lastVerifiedAtWorkspaceVersion: null,
  },
  {
    id: "handoff",
    description: "Handoff drafted with change, evidence, limitations, and client message",
    blocking: true,
    status: "NOT_STARTED",
    evidenceTestIds: [],
    lastVerifiedAtWorkspaceVersion: null,
  },
];

export const DEFAULT_TESTS: TestState[] = [
  {
    id: "visible_suite",
    label: "Visible reconciliation suite (pytest)",
    status: "NOT_RUN",
    workspaceVersion: null,
    detail: null,
  },
  {
    id: "preview",
    label: "Operational delay preview",
    status: "NOT_RUN",
    workspaceVersion: null,
    detail: null,
  },
];

/** Recompute requirement statuses from evidence predicates — never from checkboxes. */
export function recomputeRequirements(state: WorkspaceEngineState): RequirementState[] {
  const openedData =
    Boolean(state.artifacts["data/shipments.csv"] && state.openTabs.includes("data/shipments.csv")) ||
    Object.values(state.artifacts).some(
      (a) => a.path.startsWith("data/") && a.path.endsWith(".csv") && a.version > 1
    );

  const messaged = state.messages.some((m) => m.actor === "candidate" && m.status === "sent");

  const suite = state.tests.find((t) => t.id === "visible_suite");
  const preview = state.tests.find((t) => t.id === "preview");
  const head = state.headVersion;

  const suitePass =
    suite?.status === "PASS" && suite.workspaceVersion === head;
  const previewPass =
    preview?.status === "PASS" &&
    preview.workspaceVersion === head &&
    state.preview.status === "current";

  const handoffReady = [
    state.handoff.whatChanged,
    state.handoff.evidence,
    state.handoff.limitations,
    state.handoff.clientMessage,
  ].every((s) => s.trim().length >= 40);

  return state.requirements.map((r) => {
    let next = r.status;
    if (r.id === "inspect_sources") {
      next = openedData || state.openTabs.some((p) => p.includes(".csv")) ? "SATISFIED" : "NOT_STARTED";
    } else if (r.id === "stakeholder_priority") {
      next = messaged ? "SATISFIED" : "NOT_STARTED";
    } else if (r.id === "normalization") {
      if (suitePass) next = "SATISFIED";
      else if (suite?.status === "STALE" && r.status === "SATISFIED") next = "REGRESSED";
      else if (suite?.status === "FAIL") next = "IN_PROGRESS";
      else if (suite?.status === "PASS" && suite.workspaceVersion !== head) next = "REGRESSED";
      else next = r.status === "SATISFIED" ? "REGRESSED" : r.status === "NOT_STARTED" ? "NOT_STARTED" : "IN_PROGRESS";
    } else if (r.id === "verified_output") {
      if (previewPass) next = "SATISFIED";
      else if (state.preview.status === "stale" && r.status === "SATISFIED") next = "REGRESSED";
      else next = preview?.status === "PASS" && preview.workspaceVersion !== head ? "REGRESSED" : next;
    } else if (r.id === "handoff") {
      next = handoffReady ? "SATISFIED" : state.handoff.version > 0 ? "IN_PROGRESS" : "NOT_STARTED";
    }
    return {
      ...r,
      status: next,
      lastVerifiedAtWorkspaceVersion:
        next === "SATISFIED" ? head : r.lastVerifiedAtWorkspaceVersion,
    };
  });
}

export function missionProgress(requirements: RequirementState[]): number {
  if (!requirements.length) return 0;
  const done = requirements.filter((r) => r.status === "SATISFIED").length;
  return done / requirements.length;
}
