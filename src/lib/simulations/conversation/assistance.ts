/**
 * Assistance policy: controls what level of help coworkers may give.
 *
 * Levels (in order of increasing intervention):
 * - clarification: restating requirements, pointing to docs (always allowed)
 * - direction: suggesting where to look, not what to change (allowed)
 * - hint: specific diagnostic suggestion (limited per scenario)
 * - solution: revealing the fix (only if scenario explicitly permits)
 *
 * Every help instance is recorded in conversation memory so reviewers can
 * interpret the work fairly. Comparable candidates get the same policy.
 */
import type { ConversationState, HelpLevel, HelpRecord } from "./types";

export interface AssistancePolicy {
  /** Policy version (tied to scenario version). */
  version: string;
  /** Max hints per session. */
  maxHints: number;
  /** Whether solution-level help is ever permitted. */
  allowSolution: boolean;
  /** Topics where hints are not allowed (must be discovered independently). */
  hintBlockedTopics: string[];
}

export const DEFAULT_POLICY: AssistancePolicy = {
  version: "v1",
  maxHints: 2,
  allowSolution: false,
  hintBlockedTopics: [],
};

/**
 * Determine what help level a candidate request warrants.
 */
export function classifyHelpRequest(
  text: string,
  state: ConversationState,
  policy: AssistancePolicy
): {
  level: HelpLevel;
  allowed: boolean;
  reason: string;
} {
  const lower = text.toLowerCase();

  // Explicit solution requests are never allowed unless policy permits
  const wantsSolution =
    /\b(give me|show me|tell me)\b.*\b(answer|solution|fix|code)\b/i.test(lower) ||
    /\bwhat('s| is) the (fix|answer|solution)\b/i.test(lower);

  if (wantsSolution) {
    if (!policy.allowSolution) {
      return {
        level: "solution",
        allowed: false,
        reason: "Solution-level help not permitted by scenario policy",
      };
    }
    return { level: "solution", allowed: true, reason: "Explicitly permitted" };
  }

  // Hint requests: "give me a hint", "any hints?", "what should I try?"
  const wantsHint =
    /\bhint\b/i.test(lower) ||
    /\bwhat should i (try|do|look at)\b/i.test(lower) ||
    /\bpoint me in\b.*\bdirection\b/i.test(lower);

  if (wantsHint) {
    const hintsUsed = state.helpGiven.filter((h) => h.level === "hint").length;
    if (hintsUsed >= policy.maxHints) {
      return {
        level: "hint",
        allowed: false,
        reason: `Hint limit reached (${policy.maxHints})`,
      };
    }
    return {
      level: "hint",
      allowed: true,
      reason: `Hint ${hintsUsed + 1} of ${policy.maxHints}`,
    };
  }

  // Direction: "where should I look?", "I'm stuck on X"
  const wantsDirection =
    /\bwhere should i look\b/i.test(lower) ||
    /\bi'm stuck\b/i.test(lower) ||
    /\bstuck on\b/i.test(lower);

  if (wantsDirection) {
    return { level: "direction", allowed: true, reason: "Diagnostic direction" };
  }

  // Default: clarification (restating what's already documented)
  return { level: "clarification", allowed: true, reason: "Ordinary clarification" };
}

/**
 * Check if a topic is blocked from hints.
 */
export function isHintBlocked(topicId: string, policy: AssistancePolicy): boolean {
  return policy.hintBlockedTopics.includes(topicId);
}

/**
 * Get a summary of help given, for the employer report.
 */
export function summarizeHelp(state: ConversationState): {
  totalHelps: number;
  byLevel: Record<HelpLevel, number>;
  details: HelpRecord[];
} {
  const byLevel: Record<HelpLevel, number> = {
    none: 0,
    clarification: 0,
    direction: 0,
    hint: 0,
    solution: 0,
  };
  for (const h of state.helpGiven) {
    byLevel[h.level]++;
  }
  return {
    totalHelps: state.helpGiven.length,
    byLevel,
    details: state.helpGiven,
  };
}
