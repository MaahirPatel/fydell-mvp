/**
 * Evidence mathematics — events → atoms, mapped onto the 10 FDE traits.
 *
 * Pure function: same events in, same atoms out (no randomness, no clocks).
 * This is what makes reprocessing a session deterministic — see the
 * "reprocessing identical events -> identical atoms" case in
 * scripts/test-fde-traits.ts.
 *
 * Activity-volume event types (keystroke/typing telemetry, raw focus pings,
 * file-save counts) never produce atoms here — they are context only, never
 * evidence. See UNSCORED_CONTEXT_KEYS in evaluation-contract.ts for the same
 * rule applied to payload fields.
 *
 * Text-based evidence that lives in workspace notes (plan / handoff / known-
 * unknown fields) rather than the event stream is minted separately in
 * analysis.ts's enrichment step — this file only ever looks at `events`.
 */
import type { EvidenceAtomInput, EvidenceDirection, RelayEventLike } from "./types";
import { capReliabilityForSource } from "./reliability";
import type { TraitId } from "./traits";
import {
  CONTRADICTION_SURFACING_RE,
  CONTRADICTION_TRAP_RE,
  SCOPE_RENEGOTIATION_RE,
  commandOf,
  commandOk,
  payloadHasIntegritySignal,
  textOf,
} from "./signals";

/** Event types that only ever describe activity volume — never scoring evidence. */
const ACTIVITY_ONLY_EVENT_TYPES = new Set([
  "keystroke_batch",
  "activity_ping",
  "typing_metrics",
  "focus_change",
  "file_saved",
]);

const VERIFICATION_COMMANDS = new Set(["test", "pytest", "evals"]);

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
  traitId: TraitId;
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
    dimensionId: input.traitId,
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
 * Maps a session's recorded event timeline to evidence atoms, one trait at a
 * time. Only events with a known, behaviorally-meaningful mapping produce
 * atoms; everything else (including unknown event types) is silently
 * skipped rather than guessed at.
 */
export function eventsToAtoms(
  events: RelayEventLike[],
  opts: EventsToAtomsOptions
): EvidenceAtomInput[] {
  const atoms: EvidenceAtomInput[] = [];
  const sorted = [...events].sort((a, b) => a.sequence_number - b.sequence_number);
  const curveballEvent = sorted.find((e) => e.event_type === "curveball_revealed") || null;
  const firstCommandRun = sorted.find((e) => e.event_type === "command_run") || null;

  for (const event of sorted) {
    if (ACTIVITY_ONLY_EVENT_TYPES.has(event.event_type)) continue;

    switch (event.event_type) {
      case "customer_chat_message": {
        if (event.actor !== "candidate") break;
        const text = textOf(event.payload);
        if (text.length === 0) break;

        // --- elicitation: clarifying question, before vs. after work started ---
        if (/\?/.test(text)) {
          const isPreWork = !firstCommandRun || event.sequence_number < firstCommandRun.sequence_number;
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "elicitation",
              direction: "supporting",
              magnitude: isPreWork ? 0.6 : 0.45,
              relevance: isPreWork ? 0.7 : 0.5,
              sourceKind: "behavioral_heuristic",
              independenceGroup: isPreWork
                ? "elicitation:pre_work_question"
                : "elicitation:midwork_clarification",
              summary: isPreWork
                ? "Asked a clarifying question before running the first command."
                : "Asked a clarifying question after work had already started.",
              eventRefs: [event.id],
            })
          );
        }

        // --- contradiction_handling: naming a conflicting stakeholder narrative ---
        if (CONTRADICTION_TRAP_RE.test(text)) {
          const surfaced = CONTRADICTION_SURFACING_RE.test(text);
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "contradiction_handling",
              direction: surfaced ? "supporting" : "mixed",
              magnitude: surfaced ? 0.65 : 0.4,
              relevance: 0.65,
              sourceKind: "behavioral_heuristic",
              independenceGroup: "contradiction_handling:surface_conflicting_narrative",
              summary: surfaced
                ? "Named a conflict between stakeholder accounts (ops/VP/dashboard) in the customer chat."
                : "Referenced ops/VP/dashboard context without clearly naming the conflict between accounts.",
              eventRefs: [event.id],
            })
          );
        }

        // --- scope_renegotiation: renegotiating scope with the customer post-curveball ---
        if (
          curveballEvent &&
          event.sequence_number > curveballEvent.sequence_number &&
          SCOPE_RENEGOTIATION_RE.test(text)
        ) {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "scope_renegotiation",
              direction: "supporting",
              magnitude: 0.6,
              relevance: 0.65,
              sourceKind: "behavioral_heuristic",
              independenceGroup: "scope_renegotiation:renegotiate_after_curveball",
              summary: "Told the customer what was now in/out of scope after the mid-session change.",
              eventRefs: [curveballEvent.id, event.id],
            })
          );
        }
        break;
      }

      case "command_run": {
        const command = commandOf(event.payload);
        const ok = commandOk(event.payload);

        if (command === "test" || command === "pytest") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "technical_execution",
              direction: ok ? "supporting" : "counter",
              magnitude: ok ? 0.6 : 0.5,
              relevance: 0.7,
              sourceKind: "behavioral_direct",
              independenceGroup: "technical_execution:tests_pass",
              summary: ok
                ? "Ran the test command and it passed before submission."
                : "Ran the test command and it did not pass.",
              eventRefs: [event.id],
            })
          );
        }

        if (command === "evals") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "technical_execution",
              direction: ok ? "supporting" : "mixed",
              magnitude: ok ? 0.55 : 0.4,
              relevance: 0.65,
              sourceKind: "behavioral_direct",
              independenceGroup: "technical_execution:evals_pass",
              summary: ok
                ? "Ran the evaluation suite and reached a passing result."
                : "Ran the evaluation suite; result needed further interpretation.",
              eventRefs: [event.id],
            })
          );

          if (payloadHasIntegritySignal(event.payload)) {
            const payload = event.payload as { integrity_caught?: boolean; rows_dropped_naive?: number };
            const caught = typeof payload.integrity_caught === "boolean" ? payload.integrity_caught : null;
            const direction: EvidenceDirection = caught === false ? "counter" : caught === true ? "supporting" : "mixed";
            atoms.push(
              makeAtom({
                sessionId: opts.sessionId,
                eventId: event.id,
                traitId: "data_integrity_vigilance",
                direction,
                magnitude: caught === null ? 0.45 : 0.6,
                relevance: 0.7,
                sourceKind: "behavioral_direct",
                independenceGroup: "data_integrity_vigilance:notice_integrity_signal",
                summary:
                  caught === true
                    ? "Evaluation run confirms the fix catches the data-integrity issue."
                    : caught === false
                      ? "Evaluation run shows the data-integrity issue was not caught."
                      : "Evaluation run surfaced a dropped-rows / integrity signal.",
                eventRefs: [event.id],
              })
            );
          }
        }

        if (command === "reconcile") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "data_integrity_vigilance",
              direction: ok ? "supporting" : "mixed",
              magnitude: ok ? 0.65 : 0.5,
              relevance: 0.75,
              sourceKind: "behavioral_direct",
              independenceGroup: "data_integrity_vigilance:run_reconcile",
              summary: ok
                ? "Ran a reconciliation check and it passed."
                : "Ran a reconciliation check; it surfaced a discrepancy.",
              eventRefs: [event.id],
            })
          );
        }

        if (command === "preview") {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "verification_discipline",
              direction: "supporting",
              magnitude: 0.5,
              relevance: 0.55,
              sourceKind: "behavioral_direct",
              independenceGroup: "verification_discipline:preview_or_test_before_handoff",
              summary: "Ran a deterministic preview to inspect request/response behavior before handoff.",
              eventRefs: [event.id],
            })
          );
        }

        if (
          curveballEvent &&
          event.sequence_number > curveballEvent.sequence_number &&
          VERIFICATION_COMMANDS.has(command)
        ) {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "prioritization_under_pressure",
              direction: "supporting",
              magnitude: 0.5,
              relevance: 0.55,
              sourceKind: "behavioral_heuristic",
              independenceGroup: "prioritization_under_pressure:reprioritize_after_curveball",
              summary: "Continued targeted technical work after the mid-session change.",
              eventRefs: [curveballEvent.id, event.id],
            })
          );
        }
        break;
      }

      case "ai_patch_applied": {
        const verifiedAfter = sorted.find(
          (e) =>
            e.sequence_number > event.sequence_number &&
            e.event_type === "command_run" &&
            VERIFICATION_COMMANDS.has(commandOf(e.payload))
        );
        if (verifiedAfter) {
          const ok = commandOk(verifiedAfter.payload);
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "ai_tool_judgment",
              direction: ok ? "supporting" : "mixed",
              magnitude: ok ? 0.65 : 0.45,
              relevance: 0.65,
              sourceKind: "behavioral_heuristic",
              independenceGroup: "ai_tool_judgment:verify_ai_patch",
              summary: ok
                ? "Applied an AI-suggested patch and verified it with a subsequent test/eval run that passed."
                : "Applied an AI-suggested patch and ran a verification step, but the result did not pass.",
              eventRefs: [event.id, verifiedAfter.id],
            })
          );
        } else {
          atoms.push(
            makeAtom({
              sessionId: opts.sessionId,
              eventId: event.id,
              traitId: "ai_tool_judgment",
              direction: "counter",
              magnitude: 0.5,
              relevance: 0.6,
              sourceKind: "behavioral_heuristic",
              independenceGroup: "ai_tool_judgment:verify_ai_patch",
              summary: "Applied an AI-suggested patch with no recorded verification afterward.",
              eventRefs: [event.id],
            })
          );
        }
        break;
      }

      case "session_submitted": {
        atoms.push(
          makeAtom({
            sessionId: opts.sessionId,
            eventId: event.id,
            traitId: "verification_discipline",
            direction: "supporting",
            magnitude: 0.35,
            relevance: 0.4,
            sourceKind: "behavioral_direct",
            independenceGroup: "verification_discipline:session_submitted",
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
