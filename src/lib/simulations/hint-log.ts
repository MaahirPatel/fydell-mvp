/**
 * Hint/fact exposure ledger (WORK-05).
 *
 * Every authored hint or fact a simulated teammate conveys is traceable to
 * the exact response rule / proactive message / curveball that delivered it.
 * The ledger answers "which hints and facts did THIS candidate receive?" for
 * reports and comparability audits.
 *
 * Stability guarantees (tested):
 *  - The deterministic response engine returns the same reply for the same
 *    candidate message + session context (no per-candidate wording drift).
 *  - Authored replies never contradict a stakeholder's `withholds` and never
 *    state acceptance requirements beyond the authored facts.
 *  - When an LLM redraft is enabled, the prompt constrains it to the approved
 *    reply's facts; the authored reply is always the fallback.
 */

import type { SimulationContent, SimulationStakeholder } from "./types";
import type { MicroSimContent } from "./micro-types";

export type HintKind = "response_rule" | "proactive" | "curveball" | "fallback";

export interface HintExposure {
  /** Stable authored id, e.g. "rule:rel_reclass", "proactive:jordan_welcome". */
  hintId: string;
  kind: HintKind;
  stakeholderId: string;
  /** The authored text that was delivered (for audit, not candidate display). */
  deliveredText: string;
  /** Server timestamp of delivery. */
  deliveredAt: string;
  /** Session event id that recorded the delivery, when known. */
  eventId?: string;
}

export interface HintLedger {
  sessionId: string;
  exposures: HintExposure[];
}

interface StakeholderLike {
  id: string;
  responseRules: { id: string; reply: string }[];
  proactiveMessages?: { id: string; body: string }[];
  fallbackReply: string;
}

function stakeholderIndex(content: SimulationContent | MicroSimContent): Map<string, StakeholderLike> {
  const map = new Map<string, StakeholderLike>();
  for (const s of (content.stakeholders || []) as StakeholderLike[]) {
    map.set(s.id, s);
  }
  return map;
}

/**
 * Rebuild the per-candidate hint ledger from recorded session events.
 * Sources:
 *  - message_received with payload.ruleId        → response_rule exposure
 *  - message_received with source "curveball_announcement" → curveball exposure
 *  - proactive_message_delivered with payload.proactiveId → proactive exposure
 *  - message_received with ruleId null and no curveball source → fallback
 */
export function buildHintLedger(
  sessionId: string,
  content: SimulationContent | MicroSimContent,
  events: Array<{
    id?: string;
    event_type: string;
    actor: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>
): HintLedger {
  const stakeholders = stakeholderIndex(content);
  const exposures: HintExposure[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    if (e.event_type === "proactive_message_delivered") {
      const pid = e.payload?.proactiveId;
      const sid = e.payload?.stakeholderId;
      if (typeof pid !== "string" || typeof sid !== "string") continue;
      const key = `proactive:${pid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const def = stakeholders.get(sid)?.proactiveMessages?.find((p) => p.id === pid);
      exposures.push({
        hintId: key,
        kind: "proactive",
        stakeholderId: sid,
        deliveredText: def?.body || "",
        deliveredAt: e.created_at,
        eventId: e.id,
      });
    } else if (e.event_type === "message_received" && e.actor === "stakeholder") {
      const sid =
        typeof e.payload?.stakeholderId === "string" ? e.payload.stakeholderId : "unknown";
      const source = e.payload?.source;
      if (source === "curveball_announcement") {
        const key = "curveball:announcement";
        if (seen.has(key)) continue;
        seen.add(key);
        exposures.push({
          hintId: key,
          kind: "curveball",
          stakeholderId: sid,
          deliveredText: "",
          deliveredAt: e.created_at,
          eventId: e.id,
        });
        continue;
      }
      const ruleId = e.payload?.ruleId;
      if (typeof ruleId === "string" && ruleId) {
        const key = `rule:${ruleId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const rule = stakeholders.get(sid)?.responseRules.find((r) => r.id === ruleId);
        exposures.push({
          hintId: key,
          kind: "response_rule",
          stakeholderId: sid,
          deliveredText: rule?.reply || "",
          deliveredAt: e.created_at,
          eventId: e.id,
        });
      } else {
        // Fallback reply (no rule matched). Logged per delivery, not deduped:
        // a fallback is not a hint, but its occurrence is auditable.
        exposures.push({
          hintId: `fallback:${sid}:${e.created_at}`,
          kind: "fallback",
          stakeholderId: sid,
          deliveredText: stakeholders.get(sid)?.fallbackReply || "",
          deliveredAt: e.created_at,
          eventId: e.id,
        });
      }
    }
  }

  return { sessionId, exposures };
}

/** Distinct authored hints (excluding fallbacks) a candidate received. */
export function authoredHintsReceived(ledger: HintLedger): HintExposure[] {
  return ledger.exposures.filter((e) => e.kind !== "fallback");
}

/**
 * WORK-05 stability validation for authored teammate content. Returns a list
 * of problems; empty means the content is stable and testable:
 *  - every stakeholder has a fallback reply
 *  - rule/proactive ids are unique per stakeholder
 *  - no reply text is empty
 *  - no reply may state or imply acceptance requirements beyond the authored
 *    facts: replies must not contain grading/evaluation language
 */
const GRADING_LANGUAGE = [
  "you will be graded",
  "your score",
  "evaluation criteria",
  "to pass you must",
  "points will be",
  "rubric",
];

export function validateHintStability(
  content: SimulationContent | MicroSimContent
): string[] {
  const errors: string[] = [];
  for (const s of (content.stakeholders || []) as SimulationStakeholder[]) {
    if (!s.fallbackReply || !s.fallbackReply.trim())
      errors.push(`Stakeholder ${s.id} has no fallback reply`);
    const seen = new Set<string>();
    for (const r of s.responseRules || []) {
      if (seen.has(r.id)) errors.push(`Stakeholder ${s.id} duplicate rule id ${r.id}`);
      seen.add(r.id);
      if (!r.reply || !r.reply.trim()) errors.push(`Rule ${r.id} has empty reply`);
      const lower = (r.reply || "").toLowerCase();
      for (const phrase of GRADING_LANGUAGE) {
        if (lower.includes(phrase))
          errors.push(`Rule ${r.id} reply leaks grading language ("${phrase}")`);
      }
    }
    const seenP = new Set<string>();
    for (const p of s.proactiveMessages || []) {
      if (seenP.has(p.id)) errors.push(`Stakeholder ${s.id} duplicate proactive id ${p.id}`);
      seenP.add(p.id);
      if (!p.body || !p.body.trim()) errors.push(`Proactive ${p.id} has empty body`);
      const lower = (p.body || "").toLowerCase();
      for (const phrase of GRADING_LANGUAGE) {
        if (lower.includes(phrase))
          errors.push(`Proactive ${p.id} body leaks grading language ("${phrase}")`);
      }
    }
  }
  return errors;
}
