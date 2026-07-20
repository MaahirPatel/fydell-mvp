/**
 * Process-quality rollup from observable Relay events.
 * Prototype estimates — linked to events, not personality inference.
 *
 * Process = 0.24 Diagnosis + 0.22 Verification + 0.18 Reasoning
 *         + 0.14 EvidenceUse + 0.12 AssumptionManagement + 0.10 Prioritization
 */
import type { RelayEventLike } from "./types";

export const PROCESS_QUALITY_VERSION = "process-quality-v1";

export type ProcessComponent = {
  key: string;
  label: string;
  score01: number;
  eventIds: string[];
  explanation: string;
};

export type ProcessQuality = {
  version: string;
  overall01: number;
  overall100: number;
  components: ProcessComponent[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function eventIdsOf(events: RelayEventLike[], types: string[]): string[] {
  return events.filter((e) => types.includes(e.event_type)).map((e) => e.id);
}

function hasType(events: RelayEventLike[], type: string): boolean {
  return events.some((e) => e.event_type === type);
}

function textBlob(events: RelayEventLike[]): string {
  return events
    .map((e) => {
      const p = e.payload || {};
      return [p.text, p.message, p.content, p.command, p.stdout, JSON.stringify(p)].join(" ");
    })
    .join("\n")
    .toLowerCase();
}

export function computeProcessQuality(events: RelayEventLike[]): ProcessQuality {
  const blob = textBlob(events);
  const inspectIds = eventIdsOf(events, ["file_opened", "file_viewed", "inspect_artifact", "command_run"]);
  const testIds = eventIdsOf(events, ["command_run", "evals_run", "tests_run"]);
  const chatIds = eventIdsOf(events, ["customer_message", "candidate_message", "chat_message"]);
  const aiIds = eventIdsOf(events, ["ai_patch_applied", "ai_assist", "ai_message"]);
  const curveIds = eventIdsOf(events, ["curveball_revealed"]);
  const noteIds = eventIdsOf(events, ["notes_saved", "workspace_saved"]);

  const ranReconcile = events.some(
    (e) =>
      e.event_type === "command_run" &&
      String((e.payload || {}).command || "").toLowerCase().includes("reconcile")
  );
  const ranTests = events.some(
    (e) =>
      e.event_type === "command_run" &&
      /test|pytest|evals/.test(String((e.payload || {}).command || "").toLowerCase())
  );
  const verifiedAi =
    aiIds.length > 0 &&
    (ranTests || blob.includes("verified") || blob.includes("checked against"));

  const diagnosis = clamp01(
    (inspectIds.length > 0 ? 0.35 : 0) +
      (ranReconcile ? 0.4 : 0) +
      (blob.includes("mismatch") || blob.includes("join") || blob.includes("schema") ? 0.25 : 0)
  );

  const verification = clamp01(
    (ranTests ? 0.45 : 0) +
      (ranReconcile ? 0.25 : 0) +
      (blob.includes("how i know") || blob.includes("verified") ? 0.3 : 0)
  );

  const reasoning = clamp01(
    (noteIds.length > 0 ? 0.35 : 0) +
      (blob.includes("hypothesis") || blob.includes("because") ? 0.35 : 0) +
      (chatIds.length > 0 ? 0.3 : 0)
  );

  const evidenceUse = clamp01(
    Math.min(1, inspectIds.length / 4) * 0.5 + (ranReconcile || ranTests ? 0.5 : 0)
  );

  const assumptions = clamp01(
    (blob.includes("not sure") || blob.includes("assumption") || blob.includes("uncertain")
      ? 0.55
      : 0.2) + (noteIds.length > 0 ? 0.25 : 0) + (chatIds.length > 0 ? 0.2 : 0)
  );

  const prioritization = clamp01(
    (curveIds.length > 0 ? 0.4 : 0.15) +
      (blob.includes("scope") || blob.includes("cut") || blob.includes("thursday") || blob.includes("deadline")
        ? 0.4
        : 0.15) +
      (chatIds.length > 0 ? 0.2 : 0)
  );

  // Mild AI verification bonus folded into verification when AI was used well.
  const verificationAdj = clamp01(verification + (verifiedAi ? 0.1 : aiIds.length > 0 ? -0.05 : 0));

  const components: ProcessComponent[] = [
    {
      key: "diagnosis",
      label: "Diagnosis",
      score01: diagnosis,
      eventIds: inspectIds.slice(0, 4),
      explanation: ranReconcile
        ? "Investigated and ran reconcile against the data defect."
        : "Limited diagnostic commands against the integrity trap.",
    },
    {
      key: "verification",
      label: "Verification",
      score01: verificationAdj,
      eventIds: testIds.slice(0, 4),
      explanation: ranTests
        ? "Ran tests/evals before shipping."
        : "Few or no verification commands observed.",
    },
    {
      key: "reasoning",
      label: "Reasoning",
      score01: reasoning,
      eventIds: [...noteIds, ...chatIds].slice(0, 4),
      explanation: "Based on notes and explicit explanations in the work trail.",
    },
    {
      key: "evidence_use",
      label: "Evidence use",
      score01: evidenceUse,
      eventIds: inspectIds.slice(0, 3),
      explanation: "Artifact inspection and command use against available sources.",
    },
    {
      key: "assumption_management",
      label: "Assumption management",
      score01: assumptions,
      eventIds: noteIds.slice(0, 3),
      explanation: "Whether uncertainty and assumptions were named explicitly.",
    },
    {
      key: "prioritization",
      label: "Prioritization",
      score01: prioritization,
      eventIds: curveIds.slice(0, 2),
      explanation: "Response to time/scope pressure when a curveball was present.",
    },
  ];

  const overall01 = clamp01(
    0.24 * diagnosis +
      0.22 * verificationAdj +
      0.18 * reasoning +
      0.14 * evidenceUse +
      0.12 * assumptions +
      0.1 * prioritization
  );

  return {
    version: PROCESS_QUALITY_VERSION,
    overall01,
    overall100: Math.round(overall01 * 100),
    components,
  };
}
