/**
 * AI-08 - Narrow communication evaluation.
 *
 * The reviewer may assess ONLY: relevant clarification, impact description,
 * stated uncertainty, and handoff accuracy - each cited to transcript
 * messages. Culture fit, personality, accent, sentiment, "attitude", and any
 * other suitability inference are prohibited and rejected by validation.
 *
 * Absence of messages is not a negative signal: with no transcript, the
 * dimension scores insufficient_evidence.
 */

export interface TranscriptMessage {
  id: string;
  from: "candidate" | "coworker" | "system";
  text: string;
  at: string;
}

/** Phrasing that indicates a prohibited suitability inference. */
const PROHIBITED_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /culture[-\s]?fit/i, label: "culture-fit inference" },
  { re: /\bpersonality\b/i, label: "personality inference" },
  { re: /\bextrovert|\bintrovert/i, label: "personality inference" },
  { re: /\baccent\b/i, label: "accent-based inference" },
  { re: /\bsentiment\b/i, label: "sentiment-based suitability inference" },
  { re: /\battitude\b/i, label: "attitude inference" },
  { re: /likeab(ility|le)/i, label: "likeability inference" },
  { re: /would be (a )?great (hire|fit|colleague)/i, label: "suitability inference" },
  { re: /not (a )?culture/i, label: "culture-fit inference" },
  { re: /\bconfident\b.*\b(leader|hire)\b|\b(passive|aggressive)\b.*\b(person|style)\b/i, label: "personality inference" },
];

export interface CommunicationCheck {
  ok: boolean;
  reason?: string;
}

/** Reject text containing prohibited inferences. */
export function validateCommunicationSection(text: string): CommunicationCheck {
  for (const { re, label } of PROHIBITED_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, reason: `AI-08: prohibited ${label} detected` };
    }
  }
  return { ok: true };
}

export interface CommunicationObservation {
  /** Allowed kinds only. */
  kind: "clarification" | "uncertainty_stated" | "impact_described" | "handoff_accuracy";
  detail: string;
  messageIds: string[];
}

const CLARIFICATION_RE = /\?$/;
const UNCERTAINTY_RE = /\b(not sure|uncertain|unclear|might|may not|assum(?:e|ing)|caveat)\b/i;
const IMPACT_RE = /\b(affect|impact|break|risk|downstream|user|customer)\b/i;

/**
 * Extract narrow, cited observations from candidate messages.
 * This is deliberately shallow: keyword-grounded observations with message
 * ids, never trait inference. Anything deeper requires a human reviewer.
 */
export function assessCommunication(messages: TranscriptMessage[]): {
  observations: CommunicationObservation[];
  messageCount: number;
} {
  const candidate = messages.filter((m) => m.from === "candidate");
  const observations: CommunicationObservation[] = [];
  for (const m of candidate) {
    const text = m.text.trim();
    if (CLARIFICATION_RE.test(text)) {
      observations.push({
        kind: "clarification",
        detail: "Candidate asked a clarifying question.",
        messageIds: [m.id],
      });
    }
    if (UNCERTAINTY_RE.test(text)) {
      observations.push({
        kind: "uncertainty_stated",
        detail: "Candidate stated uncertainty or an assumption explicitly.",
        messageIds: [m.id],
      });
    }
    if (IMPACT_RE.test(text)) {
      observations.push({
        kind: "impact_described",
        detail: "Candidate described impact or downstream risk.",
        messageIds: [m.id],
      });
    }
  }
  return { observations, messageCount: candidate.length };
}
