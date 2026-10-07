/**
 * Modest process observations (WORK-08).
 *
 * Telemetry supports narrow factual claims, not sweeping inferences:
 *  - a test-run event before the first saved edit supports "ran tests before
 *    first saved edit" - NOT "understood the architecture"
 *  - file-open duration does not prove reading or root-cause discovery
 *  - a pause does not prove confusion
 *
 * Every entry this module produces is labeled:
 *  - kind "observation": directly supported by recorded events
 *  - kind "inference": a cautious interpretation, always paired with the
 *    evidence AND with what telemetry is missing
 *
 * Reports must render inferences as inferences and list missing telemetry
 * alongside them. Nothing here may claim personality, comprehension depth,
 * or intent.
 */

export type ObservationKind = "observation" | "inference";

export interface ProcessObservation {
  kind: ObservationKind;
  /** Short factual label, e.g. "ran_tests_before_first_edit". */
  label: string;
  /** Candidate-/employer-safe one-line description. */
  detail: string;
  /** Supporting session event ids (empty when derived from state). */
  eventIds: string[];
  /** For inferences: what would be needed to confirm it. */
  missingTelemetry?: string[];
}

export interface ProcessObservationInput {
  events: Array<{
    id?: string;
    event_type: string;
    actor: string;
    created_at: string;
    payload?: Record<string, unknown>;
  }>;
  /** Server timestamp of the first saved file edit, if any. */
  firstSavedEditAt?: string | null;
}

const TEST_RUN_EVENTS = new Set(["test_run", "workspace_action", "evals_run", "pytest_run"]);

function isTestRun(e: { event_type: string; payload?: Record<string, unknown> }): boolean {
  if (TEST_RUN_EVENTS.has(e.event_type)) {
    if (e.event_type === "workspace_action") {
      const action = typeof e.payload?.action === "string" ? e.payload.action : "";
      return /test|pytest|eval/i.test(action);
    }
    return true;
  }
  return false;
}

export function deriveProcessObservations(
  input: ProcessObservationInput
): ProcessObservation[] {
  const out: ProcessObservation[] = [];
  const ordered = [...input.events].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
  );

  const candidateEvents = ordered.filter((e) => e.actor === "candidate");
  const testRuns = candidateEvents.filter(isTestRun);
  const resourceOpens = candidateEvents.filter((e) => e.event_type === "resource_opened");
  const messagesSent = candidateEvents.filter((e) => e.event_type === "message_sent");

  // Observation: test runs happened at all.
  if (testRuns.length > 0) {
    out.push({
      kind: "observation",
      label: "ran_tests",
      detail: `Ran tests ${testRuns.length} time(s) during the session.`,
      eventIds: testRuns.map((e) => e.id).filter((x): x is string => Boolean(x)),
    });
  }

  // Observation: tests ran before the first saved edit (supports exactly
  // that claim - nothing about understanding the architecture).
  if (input.firstSavedEditAt && testRuns.length > 0) {
    const firstEditMs = new Date(input.firstSavedEditAt).getTime();
    const early = testRuns.filter((e) => new Date(e.created_at).getTime() < firstEditMs);
    if (early.length > 0) {
      out.push({
        kind: "observation",
        label: "ran_tests_before_first_saved_edit",
        detail:
          "Ran tests before the first saved edit. This shows a baseline was checked; " +
          "it does not show the architecture was understood.",
        eventIds: early.map((e) => e.id).filter((x): x is string => Boolean(x)),
      });
    }
  }

  // Observation: resource opens (counts only - duration proves nothing).
  if (resourceOpens.length > 0) {
    const distinct = new Set(
      resourceOpens.map((e) => e.payload?.resourceId).filter((x) => typeof x === "string")
    );
    out.push({
      kind: "observation",
      label: "opened_resources",
      detail: `Opened ${distinct.size} distinct resource(s). Open duration is not recorded and does not prove reading.`,
      eventIds: resourceOpens.map((e) => e.id).filter((x): x is string => Boolean(x)),
    });
  }

  // Observation: clarification messages sent.
  if (messagesSent.length > 0) {
    out.push({
      kind: "observation",
      label: "asked_clarifying_questions",
      detail: `Sent ${messagesSent.length} message(s) to simulated teammates.`,
      eventIds: messagesSent.map((e) => e.id).filter((x): x is string => Boolean(x)),
    });
  }

  // Inference (labeled, with missing telemetry): steady early activity may
  // suggest engagement - but pauses prove nothing and focus proves nothing.
  if (candidateEvents.length >= 5) {
    out.push({
      kind: "inference",
      label: "steady_early_engagement",
      detail:
        "Recorded steady early activity (candidate-initiated events in the first part of the session). " +
        "Treat as weak signal only.",
      eventIds: [],
      missingTelemetry: [
        "No visibility into whether opened resources were read.",
        "Idle gaps are not recorded as confusion.",
        "No visibility into external tools or notes.",
      ],
    });
  }

  return out;
}

/**
 * Report guard: reject any observation label or detail that overclaims.
 * Banned constructs imply comprehension, intent, or character from telemetry.
 */
const OVERCLAIM_PATTERNS = [
  /understood the architecture/i,
  /root.?cause discovery/i,
  /deep understanding/i,
  /proves (they|the candidate) read/i,
  /was confused/i,
  /lost (their|his|her) way/i,
  /strong engineer/i,
  /weak engineer/i,
  /careless/i,
  /diligent/i,
];

export function validateObservationModesty(
  observations: Pick<ProcessObservation, "label" | "detail" | "kind">[]
): string[] {
  const errors: string[] = [];
  for (const o of observations) {
    for (const pat of OVERCLAIM_PATTERNS) {
      if (pat.test(o.label) || pat.test(o.detail)) {
        errors.push(`Overclaim in ${o.kind} "${o.label}": matches ${pat}`);
      }
    }
    if (o.kind === "inference" && !o.detail.toLowerCase().includes("weak") && !/treat as|may suggest|weak signal/i.test(o.detail)) {
      errors.push(`Inference "${o.label}" is not hedged as an inference`);
    }
  }
  return errors;
}
