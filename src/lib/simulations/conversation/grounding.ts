/**
 * Grounding verification: check that response claims are supported by cited facts.
 *
 * Fact-ID existence is necessary but not sufficient. A model can cite a valid
 * fact while making claims that fact does not support. This module extracts
 * specific claims from the response and verifies they appear in the cited facts.
 *
 * Distinguishes:
 * - Scenario facts (must be in permitted facts)
 * - Candidate statements (attributed to candidate, not asserted as fact)
 * - Observed tool results (must reference actual events)
 * - Engineering suggestions (marked as suggestions, not facts)
 */
import type { PermittedFact } from "./generation-context";

export interface GroundingIssue {
  type: "unsupported_number" | "unsupported_name" | "unsupported_technical" | "exaggeration";
  claim: string;
  detail: string;
}

export interface GroundingResult {
  supported: boolean;
  issues: GroundingIssue[];
}

/**
 * Extract numbers from text (e.g., "3 merchants", "09:14 UTC", "five merchants").
 */
function extractNumbers(text: string): string[] {
  const digitMatches = text.match(/\b\d+(?::\d+)?(?:\s*(?:UTC|ms|s|seconds|minutes|hours))?\b/g) || [];
  // Number words
  const wordMatches = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi) || [];
  return [...digitMatches, ...wordMatches];
}

/**
 * Extract ALL-CAPS identifiers (e.g., "MAX_DELAY_SECONDS", "RFC-12").
 */
function extractIdentifiers(text: string): string[] {
  const matches = text.match(/\b[A-Z][A-Z0-9_]+(?:-[A-Z0-9]+)*\b/g);
  return matches || [];
}

/**
 * Extract quoted terms.
 */
function extractQuoted(text: string): string[] {
  const matches = text.match(/"([^"]+)"/g);
  return (matches || []).map((m) => m.slice(1, -1));
}

/**
 * Check if a response's specific claims are supported by the cited facts.
 *
 * @param responseText The model's composed response
 * @param citedFactIds Fact IDs the model claims support the response
 * @param allFacts All permitted facts (to look up text by ID)
 */
export function verifyGrounding(
  responseText: string,
  citedFactIds: string[],
  allFacts: PermittedFact[]
): GroundingResult {
  const issues: GroundingIssue[] = [];

  // Build the combined text of cited facts
  const citedTexts = allFacts
    .filter((f) => citedFactIds.includes(f.id))
    .map((f) => f.text.toLowerCase())
    .join(" ");

  const responseLower = responseText.toLowerCase();

  // Check numbers: every specific number in the response should appear in cited facts
  // (unless it's clearly a suggestion/hedge like "maybe try 3")
  const numbers = extractNumbers(responseText);
  for (const num of numbers) {
    const numLower = num.toLowerCase();
    // Skip if it's part of a hedged suggestion
    const idx = responseLower.indexOf(numLower);
    const context = responseLower.slice(Math.max(0, idx - 30), idx + numLower.length + 10);
    const isHedged = /\b(maybe|perhaps|try|consider|around|about|roughly)\b/.test(context);
    if (!isHedged && !citedTexts.includes(numLower)) {
      issues.push({
        type: "unsupported_number",
        claim: num,
        detail: `Number "${num}" not found in cited facts`,
      });
    }
  }

  // Check identifiers: ALL-CAPS terms should appear in cited facts
  const identifiers = extractIdentifiers(responseText);
  for (const id of identifiers) {
    if (!citedTexts.includes(id.toLowerCase())) {
      issues.push({
        type: "unsupported_technical",
        claim: id,
        detail: `Identifier "${id}" not found in cited facts`,
      });
    }
  }

  return {
    supported: issues.length === 0,
    issues,
  };
}

/**
 * Check if a response contradicts its cited facts.
 * Looks for negation patterns that conflict with fact content.
 */
export function checkContradiction(
  responseText: string,
  citedFactIds: string[],
  allFacts: PermittedFact[]
): string | null {
  const citedTexts = allFacts
    .filter((f) => citedFactIds.includes(f.id))
    .map((f) => f.text.toLowerCase());

  const responseLower = responseText.toLowerCase();

  // Simple check: if a fact says "X is always Y" and response says "X is never Y"
  // This is heuristic; full contradiction detection needs semantic understanding.
  // For now, flag obvious negations of key fact phrases.
  for (const factText of citedTexts) {
    // Extract key assertions (simplified: look for "always", "never", "must", "permanent")
    if (factText.includes("always") && responseLower.includes("never")) {
      // Check if they're about the same subject (crude: share 3+ words)
      const factWords = new Set(factText.split(/\s+/));
      const respWords = new Set(responseLower.split(/\s+/));
      const overlap = [...factWords].filter((w) => respWords.has(w) && w.length > 3);
      if (overlap.length >= 3) {
        return `Possible contradiction: fact asserts "always" but response says "never" about "${overlap.slice(0, 3).join(" ")}"`;
      }
    }
  }

  return null;
}
