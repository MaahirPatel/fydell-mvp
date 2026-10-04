/**
 * Cumulative assistance tracking across conversation turns.
 *
 * Prevents gradual solution reveal: the model cannot bypass hint limits by
 * splitting a solution across multiple "clarifications" or by giving
 * overly specific hints labeled as lower assistance categories.
 */
import type { ConversationState, HelpLevel } from "./types";

/**
 * Solution-reveal indicators: phrases suggesting the model is giving
 * implementation details rather than guidance.
 */
const SOLUTION_INDICATORS = [
  /\b(here's|here is) the (code|fix|solution|implementation)\b/i,
  /\b(copy|paste) this\b/i,
  /\bchange line \d+ to\b/i,
  /\badd this (code|function|method)\b/i,
  /\bthe exact (fix|change|code) is\b/i,
];

/**
 * Check if a response labeled as clarification/direction is actually
 * solution-level content.
 */
export function isMislabeledAssistance(
  text: string,
  claimedLevel: HelpLevel
): { mislabeled: boolean; reason?: string } {
  if (claimedLevel === "solution") {
    return { mislabeled: false }; // Honestly labeled
  }

  for (const pattern of SOLUTION_INDICATORS) {
    if (pattern.test(text)) {
      return {
        mislabeled: true,
        reason: `Response labeled "${claimedLevel}" contains solution-level content`,
      };
    }
  }

  // Check for code blocks in non-solution responses
  const codeBlockCount = (text.match(/```/g) || []).length / 2;
  if (codeBlockCount > 0 && (claimedLevel === "clarification" || claimedLevel === "direction")) {
    return {
      mislabeled: true,
      reason: `Response labeled "${claimedLevel}" contains code blocks`,
    };
  }

  return { mislabeled: false };
}

/**
 * Check cumulative solution reveal across turns.
 * If multiple hints/clarifications together cover the solution steps,
 * flag it even if each individually was within policy.
 */
export function checkCumulativeReveal(
  state: ConversationState,
  newResponseText: string,
  newLevel: HelpLevel
): { exceeds: boolean; reason?: string } {
  // Count substantive help (hints + directions) in this conversation
  const substantiveHelp = state.helpGiven.filter(
    (h) => h.level === "hint" || h.level === "direction" || h.level === "solution"
  );

  // If we've already given 3+ substantive helps, any further specific
  // guidance risks completing the solution by accumulation
  if (substantiveHelp.length >= 3 && (newLevel === "hint" || newLevel === "direction")) {
    return {
      exceeds: true,
      reason: `Cumulative assistance limit: ${substantiveHelp.length} substantive helps already given`,
    };
  }

  return { exceeds: false };
}

/**
 * Validate a proposed assistance level against policy and history.
 */
export function validateAssistance(
  text: string,
  proposedLevel: HelpLevel,
  state: ConversationState,
  maxHints: number,
  allowSolution: boolean
): { valid: boolean; reason?: string; correctedLevel?: HelpLevel } {
  // Check mislabeling first
  const mislabeled = isMislabeledAssistance(text, proposedLevel);
  if (mislabeled.mislabeled) {
    return { valid: false, reason: mislabeled.reason };
  }

  // Solution never allowed unless explicitly permitted
  if (proposedLevel === "solution" && !allowSolution) {
    return { valid: false, reason: "Solution-level help not permitted by policy" };
  }

  // Hint budget
  if (proposedLevel === "hint") {
    const hintsUsed = state.helpGiven.filter((h) => h.level === "hint").length;
    if (hintsUsed >= maxHints) {
      return { valid: false, reason: `Hint budget exhausted (${maxHints})` };
    }
  }

  // Cumulative check
  const cumulative = checkCumulativeReveal(state, text, proposedLevel);
  if (cumulative.exceeds) {
    return { valid: false, reason: cumulative.reason };
  }

  return { valid: true };
}
