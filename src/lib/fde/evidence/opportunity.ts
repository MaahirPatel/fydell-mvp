/**
 * Opportunity detection — decides, per trait, whether the scenario ever
 * presented the trap or the candidate ever created the moment where this
 * trait could be observed at all.
 *
 * This is what separates "not_observed" (no opportunity — inconclusive, not
 * a bad score) from a low score on a trait the candidate genuinely had a
 * chance to demonstrate and didn't. Getting this wrong in either direction
 * is a fairness bug: flagging opportunities that never existed manufactures
 * false negatives; failing to flag real opportunities hides real signal
 * behind a shrug of "not observed".
 *
 * Pure function of the event timeline (+ optional workspace text) — no I/O.
 */
import type { RelayEventLike } from "./types";
import { TRAIT_IDS, type TraitId } from "./traits";
import {
  CONTRADICTION_TRAP_RE,
  commandOf,
  payloadHasIntegritySignal,
  textOf,
} from "./signals";

export type OpportunityContext = {
  hasAnyEvent: boolean;
  hasAnyCommand: boolean;
  hasAnyCandidateChat: boolean;
  hasContradictionTrap: boolean;
  hasReconcileCommand: boolean;
  hasIntegritySignal: boolean;
  hasCurveball: boolean;
  hasAiPatch: boolean;
  reachedSubmission: boolean;
};

export type OpportunityFlags = Record<TraitId, boolean>;

/** Builds the raw signal context once so every trait's flag reads from the same facts. */
export function buildOpportunityContext(
  events: RelayEventLike[],
  opts: { handoffTextPresent?: boolean } = {}
): OpportunityContext {
  let hasAnyCommand = false;
  let hasAnyCandidateChat = false;
  let hasContradictionTrap = false;
  let hasReconcileCommand = false;
  let hasIntegritySignal = false;
  let hasCurveball = false;
  let hasAiPatch = false;
  let reachedSubmission = false;

  for (const event of events) {
    switch (event.event_type) {
      case "command_run": {
        hasAnyCommand = true;
        const cmd = commandOf(event.payload);
        if (cmd === "reconcile") hasReconcileCommand = true;
        if (cmd === "evals" && payloadHasIntegritySignal(event.payload)) hasIntegritySignal = true;
        break;
      }
      case "customer_chat_message": {
        const text = textOf(event.payload);
        if (event.actor === "candidate") hasAnyCandidateChat = true;
        if (text && CONTRADICTION_TRAP_RE.test(text)) hasContradictionTrap = true;
        break;
      }
      case "curveball_revealed":
        hasCurveball = true;
        break;
      case "ai_patch_applied":
        hasAiPatch = true;
        break;
      case "session_submitted":
        reachedSubmission = true;
        break;
      default:
        break;
    }
  }

  if (opts.handoffTextPresent) reachedSubmission = reachedSubmission || true;

  return {
    hasAnyEvent: events.length > 0,
    hasAnyCommand,
    hasAnyCandidateChat,
    hasContradictionTrap,
    hasReconcileCommand,
    hasIntegritySignal,
    hasCurveball,
    hasAiPatch,
    reachedSubmission,
  };
}

/**
 * Opportunity_flag = 1 if the scenario presented the trap OR the candidate
 * created the opportunity themselves; 0 otherwise. A flag of 0 must always
 * map to the "not_observed" bucket in score.ts — never to a negative score.
 */
export function computeOpportunityFlags(ctx: OpportunityContext): OpportunityFlags {
  const flags: OpportunityFlags = {
    // A chat channel or workspace surface existed — the window "before
    // first command" (or absent any command, the whole session) counts.
    elicitation: ctx.hasAnyCandidateChat || ctx.hasAnyCommand || ctx.hasAnyEvent,
    contradiction_handling: ctx.hasContradictionTrap,
    data_integrity_vigilance: ctx.hasReconcileCommand || ctx.hasIntegritySignal,
    scope_renegotiation: ctx.hasCurveball,
    technical_execution: ctx.hasAnyCommand,
    ai_tool_judgment: ctx.hasAiPatch,
    verification_discipline: ctx.hasAnyCommand,
    limitation_honesty: ctx.reachedSubmission,
    prioritization_under_pressure: ctx.hasCurveball,
    communication_translation: ctx.reachedSubmission,
  };

  for (const id of TRAIT_IDS) {
    if (!(id in flags)) flags[id] = false;
  }
  return flags;
}

export function opportunityFlagsFromEvents(
  events: RelayEventLike[],
  opts: { handoffTextPresent?: boolean } = {}
): OpportunityFlags {
  return computeOpportunityFlags(buildOpportunityContext(events, opts));
}
