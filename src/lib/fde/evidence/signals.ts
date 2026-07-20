/**
 * Shared, pure text/payload signal detectors used by both atoms.ts (turning
 * events into evidence atoms) and opportunity.ts (deciding whether a trap/
 * opportunity was even present). Kept in one place so the two never drift —
 * an opportunity detector and its matching atom detector must agree on what
 * counts as "the trap showed up".
 */
import type { RelayEventLike } from "./types";

export function textOf(payload: Record<string, unknown> | undefined | null): string {
  return String((payload as { text?: string })?.text || "").trim();
}

export const QUESTION_RE = /\?/;

export const CONTRADICTION_TRAP_RE =
  /(ops team|operations team|\bops\b|\bvp\b|v\.p\.|dashboard|root[\s-]?cause|conflict\w*|contradict\w*|inconsisten\w*|discrepan\w*|doesn'?t match|two different|different numbers?|different stor(y|ies))/i;

export const CONTRADICTION_SURFACING_RE =
  /(conflict\w*|contradict\w*|inconsisten\w*|discrepan\w*|doesn'?t match|two different|root[\s-]?cause|which (one|number|account) is (right|correct|accurate))/i;

export const SCOPE_RENEGOTIATION_RE =
  /(\bscope\b|descop\w*|defer\w*|out of scope|in scope|\bcut\w*|\bdrop\w*|trade[\s-]?off|reduc\w*|cannot do both|can't do both|prioriti[sz]\w*|timeline|push (this |that )?back)/i;

export const PRIORITIZATION_RE =
  /(prioriti[sz]\w*|deprioriti[sz]\w*|\bfirst\b|\bdefer\w*|\btriage\w*|focus on|most important|before .* less)/i;

export const VERIFICATION_LANGUAGE_RE =
  /(verif\w*|tested|test\w* (pass|ran)|confirm\w*|validat\w*|checked|ran the (tests|evals)|preview\w*)/i;

export const LIMITATION_LANGUAGE_RE =
  /(not sure|unsure|uncertain\w*|\bunknown\b|unverified|haven'?t verified|residual risk|risks?:|assum\w*|limitation\w*|don'?t know|couldn'?t confirm|out of scope for now|needs? (further|more) (review|testing|validation))/i;

export const RECOMMENDATION_RE = /(recommend\w*|suggest\w*|\badvice\b|\bshould\b|next step)/i;

const INTEGRITY_PAYLOAD_KEYS = [
  "integrity_caught",
  "integritycaught",
  // "rows_dropped_naive" is the exact field name evals/run_evals.py's
  // EVAL_SUMMARY_JSON emits (see scenarios/project-relay/evals/run_evals.py
  // and src/lib/relay/eval-summary.ts) — kept alongside looser aliases so
  // this still works if a future scenario variant names the field differently.
  "rows_dropped_naive",
  "rows_dropped",
  "rowsdropped",
  "dropped_rows",
  "data_integrity_flag",
];

/**
 * True when an evals/command payload surfaces a data-integrity signal —
 * presence of the field is the signal, regardless of whether the value is
 * "good" (true / 0 dropped) or "bad" (false / N dropped): either way the
 * harness explicitly checked and reported on it.
 */
export function payloadHasIntegritySignal(payload: Record<string, unknown> | undefined | null): boolean {
  if (!payload) return false;
  const keys = Object.keys(payload).map((k) => k.toLowerCase());
  return INTEGRITY_PAYLOAD_KEYS.some((key) => keys.includes(key));
}

export function commandOf(payload: Record<string, unknown> | undefined | null): string {
  return String((payload as { command?: string })?.command || "");
}

export function commandOk(payload: Record<string, unknown> | undefined | null): boolean {
  return Boolean((payload as { ok?: boolean })?.ok);
}

export function firstEventOfType(events: RelayEventLike[], eventType: string): RelayEventLike | null {
  return events.find((e) => e.event_type === eventType) || null;
}

export function firstCommandRunSequence(events: RelayEventLike[]): number | null {
  const first = events.find((e) => e.event_type === "command_run");
  return first ? first.sequence_number : null;
}
