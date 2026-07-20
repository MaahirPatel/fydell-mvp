/**
 * AI Quality (AIQ) — how the candidate used AI assistance in-session.
 *
 *   AIQ = b1·F + b2·C + b3·V + b4·I − b5·B − b6·U
 *
 * Components (each in [0, 1], expert-prior coefficients):
 *   F  fluency / appropriate AI engagement
 *   C  critical review of AI output (non-blind)
 *   V  verification after AI (tests/evals)
 *   I  iteration after AI feedback
 *   B  blind-accept rate (penalty)
 *   U  uncritical over-reliance (penalty)
 *
 * Using no AI at all → { observed: false, score: null } — not a penalty.
 * Pure function of the event timeline.
 */
import type { RelayEventLike } from "./types";
import { clampFinite } from "./reliability";
import { commandOf, commandOk } from "./signals";

export const AIQ_VERSION = "aiq-v1";

/** Expert-prior coefficients for AIQ (design-weighted, not outcome-calibrated). */
export const AIQ_B1_FLUENCY = 0.2;
export const AIQ_B2_CRITICAL = 0.2;
export const AIQ_B3_VERIFY = 0.25;
export const AIQ_B4_ITERATE = 0.15;
export const AIQ_B5_BLIND = 0.2;
export const AIQ_B6_OVERRELY = 0.15;

const AI_EVENT_TYPES = new Set([
  "ai_patch_applied",
  "ai_assist",
  "ai_message",
  "ai_suggestion",
  "ai_suggestion_accepted",
]);

const VERIFICATION_COMMANDS = new Set(["test", "pytest", "evals"]);

export type AiQualityResult = {
  observed: boolean;
  /** AIQ in [0, 1], null when AI was never used. */
  score: number | null;
  score100: number | null;
  components: {
    fluency: number;
    critical: number;
    verification: number;
    iteration: number;
    blindAccept: number;
    overRely: number;
  } | null;
  aiInteractionCount: number;
  verifiedAfterAiCount: number;
  blindAcceptCount: number;
  eventIds: string[];
  version: string;
};

function clamp01(n: number): number {
  return clampFinite(n, 0, 1);
}

function isAiEvent(e: RelayEventLike): boolean {
  return AI_EVENT_TYPES.has(e.event_type);
}

function isVerification(e: RelayEventLike): boolean {
  if (e.event_type === "evals_run" || e.event_type === "tests_run") return true;
  if (e.event_type !== "command_run") return false;
  return VERIFICATION_COMMANDS.has(commandOf(e.payload));
}

/**
 * Compute AIQ from relay events. No AI interactions → observed: false.
 */
export function computeAiQuality(events: RelayEventLike[]): AiQualityResult {
  const sorted = [...events].sort((a, b) => a.sequence_number - b.sequence_number);
  const aiEvents = sorted.filter(isAiEvent);

  if (aiEvents.length === 0) {
    return {
      observed: false,
      score: null,
      score100: null,
      components: null,
      aiInteractionCount: 0,
      verifiedAfterAiCount: 0,
      blindAcceptCount: 0,
      eventIds: [],
      version: AIQ_VERSION,
    };
  }

  let verifiedAfterAiCount = 0;
  let blindAcceptCount = 0;
  let iteratedCount = 0;

  for (let i = 0; i < aiEvents.length; i++) {
    const ai = aiEvents[i];
    const after = sorted.filter((e) => e.sequence_number > ai.sequence_number);
    const nextAi = aiEvents[i + 1];
    const window = nextAi
      ? after.filter((e) => e.sequence_number < nextAi.sequence_number)
      : after;

    const verified = window.find(isVerification);
    if (verified) {
      verifiedAfterAiCount += 1;
      // Iteration: a later AI interaction after a failing or passing verify.
      if (nextAi && (!commandOk(verified.payload) || verified.event_type === "command_run")) {
        iteratedCount += 1;
      }
    } else if (ai.event_type === "ai_patch_applied" || ai.event_type === "ai_suggestion_accepted") {
      blindAcceptCount += 1;
    }
  }

  const n = aiEvents.length;
  const verifyRate = verifiedAfterAiCount / n;
  const blindRate = blindAcceptCount / n;

  // Fluency: some use is good; saturates around 3 interactions.
  const fluency = clamp01(n / 3);
  // Critical: inverse of blind accepts among patch/accept events.
  const critical = clamp01(1 - blindRate);
  const verification = clamp01(verifyRate);
  const iteration = clamp01(iteratedCount / Math.max(1, n - 1));
  // Over-rely: many AI events with little verification.
  const overRely = clamp01((1 - verifyRate) * clamp01(n / 5));

  const raw =
    AIQ_B1_FLUENCY * fluency +
    AIQ_B2_CRITICAL * critical +
    AIQ_B3_VERIFY * verification +
    AIQ_B4_ITERATE * iteration -
    AIQ_B5_BLIND * blindRate -
    AIQ_B6_OVERRELY * overRely;

  const score = clamp01(raw);

  return {
    observed: true,
    score,
    score100: Math.round(score * 100),
    components: {
      fluency,
      critical,
      verification,
      iteration,
      blindAccept: blindRate,
      overRely,
    },
    aiInteractionCount: n,
    verifiedAfterAiCount,
    blindAcceptCount,
    eventIds: aiEvents.map((e) => e.id),
    version: AIQ_VERSION,
  };
}
