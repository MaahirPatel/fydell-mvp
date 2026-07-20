/**
 * Adaptability — plan / hypothesis change after a mid-session curveball.
 *
 *   A = σ(k · (change01 − midpoint))
 *
 * Anchored to the `curveball_revealed` event (created_at when present,
 * otherwise sequence_number). No curveball → { observed: false } — not a
 * penalty. Pure function of the event timeline.
 */
import type { RelayEventLike } from "./types";
import { clampFinite } from "./reliability";
import { SCOPE_RENEGOTIATION_RE, textOf } from "./signals";

export const ADAPTABILITY_VERSION = "adaptability-v1";

/** Logistic steepness (expert prior). */
export const ADAPT_SIGMOID_K = 6;
/** Logistic midpoint on the raw change score (expert prior). */
export const ADAPT_SIGMOID_MID = 0.45;

const PLAN_CHANGE_RE =
  /\b(revising|revised|updating|updated|changing|changed|adjusting|adjusted|new plan|repriorit|cutting scope|cut scope|pivoting|hypothesis)\b/i;

export type AdaptabilityResult = {
  observed: boolean;
  /** Sigmoid adaptability in [0, 1], null when no curveball. */
  score01: number | null;
  score100: number | null;
  /** Raw change evidence in [0, 1] before the sigmoid. */
  change01: number | null;
  curveballEventId: string | null;
  supportingEventIds: string[];
  version: string;
};

function clamp01(n: number): number {
  return clampFinite(n, 0, 1);
}

function sigmoid(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  // Stable logistic.
  if (x >= 20) return 1;
  if (x <= -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function eventTimeKey(e: RelayEventLike): number {
  if (e.created_at) {
    const t = Date.parse(e.created_at);
    if (Number.isFinite(t)) return t;
  }
  return e.sequence_number;
}

function isAfterCurveball(e: RelayEventLike, curveball: RelayEventLike): boolean {
  if (e.created_at && curveball.created_at) {
    const a = Date.parse(e.created_at);
    const b = Date.parse(curveball.created_at);
    if (Number.isFinite(a) && Number.isFinite(b)) return a > b;
  }
  return e.sequence_number > curveball.sequence_number;
}

/**
 * Compute adaptability from relay events. No curveball → observed: false.
 */
export function computeAdaptability(events: RelayEventLike[]): AdaptabilityResult {
  const sorted = [...events].sort((a, b) => eventTimeKey(a) - eventTimeKey(b));
  const curveball = sorted.find((e) => e.event_type === "curveball_revealed") || null;

  if (!curveball) {
    return {
      observed: false,
      score01: null,
      score100: null,
      change01: null,
      curveballEventId: null,
      supportingEventIds: [],
      version: ADAPTABILITY_VERSION,
    };
  }

  const after = sorted.filter((e) => e.id !== curveball.id && isAfterCurveball(e, curveball));
  const supportingEventIds: string[] = [];
  let change = 0;

  for (const e of after) {
    const text = textOf(e.payload) || "";
    const isChat =
      e.event_type === "customer_chat_message" ||
      e.event_type === "candidate_message" ||
      e.event_type === "chat_message";
    const isNotes = e.event_type === "notes_saved" || e.event_type === "workspace_saved";
    const isPlan = e.event_type === "plan_updated" || e.event_type === "hypothesis_updated";

    if (isPlan) {
      change += 0.45;
      supportingEventIds.push(e.id);
      continue;
    }

    if ((isChat || isNotes) && text) {
      if (SCOPE_RENEGOTIATION_RE.test(text) || PLAN_CHANGE_RE.test(text)) {
        change += isChat ? 0.35 : 0.3;
        supportingEventIds.push(e.id);
      }
    }

    // Targeted technical work after the curveball is mild evidence of adapting.
    if (e.event_type === "command_run") {
      change += 0.12;
      supportingEventIds.push(e.id);
    }
  }

  const change01 = clamp01(change);
  const score01 = clamp01(sigmoid(ADAPT_SIGMOID_K * (change01 - ADAPT_SIGMOID_MID)));

  return {
    observed: true,
    score01,
    score100: Math.round(score01 * 100),
    change01,
    curveballEventId: curveball.id,
    supportingEventIds: Array.from(new Set(supportingEventIds)).slice(0, 8),
    version: ADAPTABILITY_VERSION,
  };
}
