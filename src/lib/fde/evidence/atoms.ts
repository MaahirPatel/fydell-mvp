/**
 * Evidence mathematics — events → atoms.
 *
 * Pure function: same events in, same atoms out (no randomness, no clocks).
 * This is what makes reprocessing a session deterministic — see golden case
 * "reprocessing identical events → identical findings" in
 * scripts/test-evidence-math.ts.
 *
 * Activity-volume event types (keystroke/typing telemetry, raw focus pings,
 * file-save counts) never produce atoms here — they are context only, never
 * evidence. See UNSCORED_CONTEXT_KEYS in evaluation-contract.ts for the same
 * rule applied to payload fields.
 */
import { PRIMARY_DIMENSION_IDS } from "../evaluation-contract";
import type { EvidenceAtomInput, EvidenceDirection, RelayEventLike } from "./types";
import { capReliabilityForSource } from "./reliability";

const [
  DISCOVERY_DIMENSION,
  SCOPING_DIMENSION,
  ENGINEERING_DIMENSION,
  EVAL_JUDGMENT_DIMENSION,
  ADAPTATION_DIMENSION,
] = PRIMARY_DIMENSION_IDS;

/** Event types that only ever describe activity volume — never scoring evidence. */
const ACTIVITY_ONLY_EVENT_TYPES = new Set([
  "keystroke_batch",
  "activity_ping",
  "typing_metrics",
  "focus_change",
  "file_saved",
]);

export type EventsToAtomsOptions = {
  sessionId: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function makeAtom(input: {
  sessionId: string;
  eventId?: string | null;
  artifactId?: string | null;
  dimensionId: string;
  direction: EvidenceDirection;
  magnitude: number;
  relevance: number;
  sourceKind: string;
  independenceGroup: string;
  summary: string;
  eventRefs: string[];
  artifactRefs?: string[];
}): EvidenceAtomInput {
  return {
    sessionId: input.sessionId,
    eventId: input.eventId ?? null,
    artifactId: input.artifactId ?? null,
    dimensionId: input.dimensionId,
    direction: input.direction,
    magnitude: clamp01(input.magnitude),
    relevance: clamp01(input.relevance),
    reliability: capReliabilityForSource(1, input.sourceKind),
    independenceGroup: input.independenceGroup,
    sourceKind: input.sourceKind,
    summary: input.summary,
    eventRefs: input.eventRefs,
    artifactRefs: input.artifactRefs ?? [],
  };
}

/**
 * Maps a session's recorded event timeline to evidence atoms. Only events
 * with a known, behaviorally-meaningful mapping produce atoms; everything
 * else (including unknown event types) is silently skipped rather than
 * guessed at.
 */
export function eventsToAtoms(
  events: RelayEventLike[],
  opts: EventsToAtomsOptions
): EvidenceAtomInput[] {
  const atoms: EvidenceAtomInput[] = [];
  const sorted = [...events].sort((a, b) => a.sequence_number - b.sequence_number);
  const curveballEvent = sorted.find((e) => e.event_type === "curveball_revealed") || null;

  for (const event of sorted) {
    if (ACTIVITY_ONLY_EVENT_TYPES.has(event.event_type)) continue;

    switch (event.event_type) {
      case "customer_chat_message": {
        if (event.actor !== "candidate") break;
        const text = String((event.payload as { text?: string })?.text || "").trim();
        if (text.length === 0) break;

        if (/\?/.test(text)) {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: DISCOVERY_DIMENSION,
              direction: "supporting",
              magnitude: 0.55,
              relevance: 0.6,
              sourceKind: "behavioral_heuristic",
              independenceGroup: `${DISCOVERY_DIMENSION}:chat_clarify`,
              summary: "Asked a clarifying question in the customer chat channel.",
              eventRefs: [event.id],
            })
          );
        }

        atoms.push(
          makeAtom({
            sessionId: opts.sessionId,
            eventId: event.id,
            dimensionId: ADAPTATION_DIMENSION,
            direction: "supporting",
            magnitude: 0.5,
            relevance: 0.55,
            sourceKind: "behavioral_heuristic",
            independenceGroup: `${ADAPTATION_DIMENSION}:customer_update`,
            summary: "Sent an update in the customer chat channel.",
            eventRefs: [event.id],
          })
        );

        if (curveballEvent && event.sequence_number > curveballEvent.sequence_number) {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: ADAPTATION_DIMENSION,
              direction: "supporting",
              magnitude: 0.6,
              relevance: 0.65,
              sourceKind: "behavioral_heuristic",
              independenceGroup: `${ADAPTATION_DIMENSION}:curveball_response`,
              summary: "Communicated with the customer after the mid-session change.",
              eventRefs: [curveballEvent.id, event.id],
            })
          );
        }
        break;
      }

      case "command_run": {
        const payload = event.payload as { command?: string; ok?: boolean };
        const command = String(payload?.command || "");

        if (command === "test" || command === "pytest") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: ENGINEERING_DIMENSION,
              direction: payload.ok ? "supporting" : "counter",
              magnitude: payload.ok ? 0.6 : 0.5,
              relevance: 0.7,
              sourceKind: "behavioral_direct",
              independenceGroup: `${ENGINEERING_DIMENSION}:edit_and_test`,
              summary: payload.ok
                ? "Ran the test command and it passed before submission."
                : "Ran the test command and it did not pass.",
              eventRefs: [event.id],
            })
          );
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: SCOPING_DIMENSION,
              direction: payload.ok ? "supporting" : "mixed",
              magnitude: 0.45,
              relevance: 0.5,
              sourceKind: "behavioral_heuristic",
              independenceGroup: `${SCOPING_DIMENSION}:triage_failing_eval`,
              summary: "Used allowlisted tests to prioritize what to fix.",
              eventRefs: [event.id],
            })
          );
        }

        if (command === "evals") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: EVAL_JUDGMENT_DIMENSION,
              direction: payload.ok ? "supporting" : "mixed",
              magnitude: payload.ok ? 0.55 : 0.4,
              relevance: 0.65,
              sourceKind: "behavioral_direct",
              independenceGroup: `${EVAL_JUDGMENT_DIMENSION}:interpret_metrics`,
              summary: payload.ok
                ? "Ran the evaluation suite and reached a passing result."
                : "Ran the evaluation suite; result needed further interpretation.",
              eventRefs: [event.id],
            })
          );
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: ENGINEERING_DIMENSION,
              direction: payload.ok ? "supporting" : "counter",
              magnitude: payload.ok ? 0.55 : 0.45,
              relevance: 0.6,
              sourceKind: "behavioral_direct",
              independenceGroup: `${ENGINEERING_DIMENSION}:run_evals`,
              summary: "Verified the solution against the golden evaluation set.",
              eventRefs: [event.id],
            })
          );
        }

        if (command === "preview") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: EVAL_JUDGMENT_DIMENSION,
              direction: "supporting",
              magnitude: 0.45,
              relevance: 0.5,
              sourceKind: "behavioral_direct",
              independenceGroup: `${EVAL_JUDGMENT_DIMENSION}:preview_check`,
              summary: "Ran a deterministic preview to inspect request/response behavior.",
              eventRefs: [event.id],
            })
          );
        }

        if (curveballEvent && event.sequence_number > curveballEvent.sequence_number) {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              dimensionId: SCOPING_DIMENSION,
              direction: "supporting",
              magnitude: 0.5,
              relevance: 0.55,
              sourceKind: "behavioral_heuristic",
              independenceGroup: `${SCOPING_DIMENSION}:curveball_reprioritize`,
              summary: "Continued technical work after the mid-session change.",
              eventRefs: [curveballEvent.id, event.id],
            })
          );
        }
        break;
      }

      case "ai_patch_applied": {
        atoms.push(
          makeAtom({
            sessionId: opts.sessionId,
            eventId: event.id,
            dimensionId: ENGINEERING_DIMENSION,
            direction: "supporting",
            magnitude: 0.5,
            relevance: 0.55,
            sourceKind: "behavioral_heuristic",
            independenceGroup: `${ENGINEERING_DIMENSION}:ai_verified_apply`,
            summary: "Reviewed and applied an AI-suggested patch (diff-before-apply).",
            eventRefs: [event.id],
          })
        );
        break;
      }

      case "session_submitted": {
        atoms.push(
          makeAtom({
            sessionId: opts.sessionId,
            eventId: event.id,
            dimensionId: EVAL_JUDGMENT_DIMENSION,
            direction: "supporting",
            magnitude: 0.4,
            relevance: 0.45,
            sourceKind: "behavioral_direct",
            independenceGroup: `${EVAL_JUDGMENT_DIMENSION}:submit_freeze`,
            summary: "Submitted an immutable workspace snapshot for review.",
            eventRefs: [event.id],
          })
        );
        break;
      }

      default:
        break;
    }
  }

  return atoms;
}
