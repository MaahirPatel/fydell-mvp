/**
 * Submission readiness + partial-submission marking (WORK-04, E2E-24).
 *
 * An early submission must never silently bypass a required issue update.
 * `evaluateSubmissionReadiness` computes, from server-side session state and
 * recorded events, whether the attempt is complete - and when it is not,
 * exactly which dimensions become UNOBSERVED so the report can say so
 * honestly instead of scoring them.
 *
 * Two outcomes:
 *  - complete: every required milestone is satisfied; all dimensions observed.
 *  - partial: the candidate may still submit, but the submission is marked
 *    "intentional partial" with the unobserved dimensions listed. The report
 *    must not claim adaptation (or any other unobserved dimension) was measured.
 *
 * This module is pure. The submit route (chunk-submit) calls it and persists
 * the resulting marking with the submission.
 */

import { validateHandoff } from "./handoff";

export interface ReadinessInput {
  /** Session row subset the route already loaded. */
  session: {
    status: string;
    started_at: string | null;
    curveball_presented_at: string | null;
    curveball_acknowledged_at: string | null;
  };
  /** Authored content facts. */
  content: {
    /** True when the scenario ships a required issue update. */
    hasCurveball: boolean;
    /** Deliverable field keys that are required for a complete attempt. */
    requiredDeliverableFields: string[];
    /** Competency keys whose evidence depends on the requirement update. */
    adaptationCompetencyKeys: string[];
    /** All scored competency keys (for the unobserved list). */
    allCompetencyKeys: string[];
  };
  deliverable: Record<string, unknown>;
  events: Array<{ event_type: string; actor: string }>;
}

export interface SubmissionReadiness {
  complete: boolean;
  /** Human-readable blockers / warnings for the candidate. */
  blockers: string[];
  /**
   * Competency keys with no observable evidence in this attempt. The report
   * must label these "not observed", never score them.
   */
  unobservedDimensions: string[];
  /** Handoff completeness detail (SIM-09). */
  handoffComplete: boolean;
  handoffMissingKeys: string[];
  /** True when the requirement update was never exposed to the candidate. */
  curveballMissing: boolean;
  /** True when exposed but never acknowledged. */
  curveballUnacknowledged: boolean;
}

function hasEvent(events: ReadinessInput["events"], type: string): boolean {
  return events.some((e) => e.event_type === type);
}

function isNonEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return false;
}

export function evaluateSubmissionReadiness(input: ReadinessInput): SubmissionReadiness {
  const blockers: string[] = [];
  const unobserved = new Set<string>();

  const curveballMissing =
    input.content.hasCurveball && !input.session.curveball_presented_at;
  const curveballUnacknowledged =
    input.content.hasCurveball &&
    Boolean(input.session.curveball_presented_at) &&
    !input.session.curveball_acknowledged_at;

  if (curveballMissing) {
    blockers.push(
      "A required issue update has not been delivered yet. It will appear before the deadline; submitting now would skip it."
    );
    for (const k of input.content.adaptationCompetencyKeys) unobserved.add(k);
  } else if (curveballUnacknowledged) {
    blockers.push(
      "Please acknowledge the issue update before submitting, so we know you saw it."
    );
    for (const k of input.content.adaptationCompetencyKeys) unobserved.add(k);
  }

  const missingFields = input.content.requiredDeliverableFields.filter(
    (k) => !isNonEmpty(input.deliverable[k])
  );
  if (missingFields.length > 0) {
    blockers.push(
      `These required deliverable fields are empty: ${missingFields.join(", ")}.`
    );
  }

  const handoff = validateHandoff(input.deliverable);
  if (!handoff.complete) {
    blockers.push(
      `Your handoff is missing: ${handoff.missingKeys.join(", ")}.`
    );
  }

  if (input.session.status !== "active") {
    blockers.push("This session is not active.");
  }

  const messageCount = input.events.filter(
    (e) => e.event_type === "message_sent" && e.actor === "candidate"
  ).length;
  if (messageCount === 0) {
    // Not a blocker: a candidate may legitimately need no clarification. But
    // the communication dimension then has limited evidence - flag it so the
    // report can be honest about coverage.
    unobserved.add("__communication_limited");
  }

  return {
    complete: blockers.length === 0,
    blockers,
    unobservedDimensions: [...unobserved],
    handoffComplete: handoff.complete,
    handoffMissingKeys: handoff.missingKeys,
    curveballMissing,
    curveballUnacknowledged,
  };
}

export interface PartialSubmissionMarking {
  kind: "intentional_partial";
  markedAt: string;
  /** Competency keys the report must label "not observed". */
  unobservedDimensions: string[];
  /** Why the submission is partial (candidate-visible copy). */
  reason: string;
  /** The candidate explicitly accepted the partial marking. */
  candidateAccepted: boolean;
}

/**
 * Build the marking persisted with an intentional partial submission.
 * Requires the candidate's explicit acceptance - the route must collect it.
 */
export function markIntentionalPartial(args: {
  readiness: SubmissionReadiness;
  candidateAccepted: boolean;
  nowIso?: string;
}): PartialSubmissionMarking {
  if (!args.candidateAccepted)
    throw new Error("An intentional partial submission requires explicit candidate acceptance");
  const reasons: string[] = [];
  if (args.readiness.curveballMissing)
    reasons.push("submitted before the required issue update was delivered");
  if (args.readiness.curveballUnacknowledged)
    reasons.push("submitted without acknowledging the issue update");
  if (!args.readiness.handoffComplete)
    reasons.push(`handoff incomplete (${args.readiness.handoffMissingKeys.join(", ")})`);
  return {
    kind: "intentional_partial",
    markedAt: args.nowIso || new Date().toISOString(),
    unobservedDimensions: args.readiness.unobservedDimensions,
    reason:
      reasons.length > 0
        ? `Intentional partial submission: ${reasons.join("; ")}.`
        : "Intentional partial submission.",
    candidateAccepted: true,
  };
}

/**
 * Report-side guard (E2E-24): given a partial marking, list the claims the
 * report is FORBIDDEN from making.
 */
export function forbiddenClaimsForPartial(marking: PartialSubmissionMarking): string[] {
  return marking.unobservedDimensions.map(
    (dim) =>
      `Must not claim "${dim}" was measured: the candidate submitted before that dimension could be observed.`
  );
}
