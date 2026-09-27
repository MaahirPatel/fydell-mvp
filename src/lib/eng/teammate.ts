import type { ClarificationRule, ScenarioDefinition } from "./scenarios/types";

/**
 * Deterministic clarification policy. A question is reduced to a token set,
 * each authored rule scores by how many of its signal groups it satisfies, and
 * rules are filtered by world state (whether the requirement update has been
 * released). The same question in the same world state always gets the same
 * authored answer; nothing is generated, so no requirement can be invented
 * and nothing about the hidden checks can leak.
 */
export function tokenize(text: string): Set<string> {
  const lowered = text.toLowerCase().replace(/retry[\s-]*after/g, " retryafter ");
  const tokens = lowered.split(/[^a-z0-9_]+/).filter(Boolean);
  const out = new Set<string>(tokens);
  for (const token of tokens) {
    if (/^\d{3}$/.test(token)) out.add(`${token[0]}xx`);
  }
  return out;
}

export interface TeammateReply {
  ruleId: string;
  teammateId: string;
  body: string;
}

function available(rule: ClarificationRule, updateReleased: boolean): boolean {
  if (rule.availability === "always") return true;
  return rule.availability === "after_update" ? updateReleased : !updateReleased;
}

export function selectReply(
  scenario: ScenarioDefinition,
  question: string,
  worldState: { updateReleased: boolean }
): TeammateReply {
  const tokens = tokenize(question);
  let best: { rule: ClarificationRule; hits: number; ratio: number } | null = null;
  for (const rule of scenario.clarificationRules) {
    if (rule.id === scenario.fallbackRuleId || !available(rule, worldState.updateReleased)) continue;
    const hits = rule.signals.filter((group) => group.some((token) => tokens.has(token))).length;
    if (hits < rule.minGroups || hits === 0) continue;
    const ratio = hits / rule.signals.length;
    if (!best || hits > best.hits || (hits === best.hits && ratio > best.ratio)) {
      best = { rule, hits, ratio };
    }
  }
  const rule =
    best?.rule ?? scenario.clarificationRules.find((r) => r.id === scenario.fallbackRuleId);
  if (!rule) throw new Error("Scenario has no fallback clarification rule");
  return { ruleId: rule.id, teammateId: rule.teammateId, body: rule.answer };
}
