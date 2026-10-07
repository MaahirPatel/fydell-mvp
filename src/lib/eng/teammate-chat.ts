import "server-only";
import { getProviderConfig, postChatCompletion, type ProviderConfig } from "@/lib/ai/provider";
import type { ScenarioDefinition } from "./scenarios/types";
import {
  DRAFTED_REPLY_SCHEMA,
  assembleReply,
  authoredReply,
  availableFacts,
  buildTeammatePrompt,
  selectReply,
  type Fact,
  type GeneratedReply,
  type ThreadTurn,
} from "./teammate";

export interface ComposedReply {
  teammateId: string;
  body: string;
  /** Stored in eng_messages.rule_id; shown to reviewers next to the reply. */
  ruleId: string;
  mode: "generated" | "authored";
  factIds: string[];
  /** Why the authored reply was used. Never contains provider output or secrets. */
  fallbackReason: string | null;
  /** Framing lines removed because they could have stated or endorsed policy. */
  droppedFraming: string[];
  provider: ProviderConfig["provider"] | null;
}

type Draft = { ok: true; value: GeneratedReply } | { ok: false; reason: string };

async function draft(
  config: ProviderConfig,
  scenario: ScenarioDefinition,
  ctx: { facts: Fact[]; thread: ThreadTurn[]; question: string; updateReleased: boolean; hintRuleId: string | null },
  temperature: number,
): Promise<Draft> {
  let raw: unknown;
  try {
    const content = await postChatCompletion(config, buildTeammatePrompt(scenario, ctx), {
      schema: DRAFTED_REPLY_SCHEMA,
      schemaName: "teammate_reply",
      temperature,
      maxTokens: 300,
    });
    raw = JSON.parse(content);
  } catch {
    return { ok: false, reason: "provider_error" };
  }
  return assembleReply(raw, scenario, ctx);
}

export async function composeTeammateReply(
  scenario: ScenarioDefinition,
  question: string,
  thread: ThreadTurn[],
  updateReleased: boolean,
): Promise<ComposedReply> {
  const authored = (reason: string, provider: ComposedReply["provider"]): ComposedReply => {
    const r = authoredReply(scenario, question, thread, updateReleased);
    return {
      teammateId: r.teammateId,
      body: r.body,
      ruleId: r.ruleId,
      mode: "authored",
      factIds: r.ruleId === scenario.fallbackRuleId ? [] : [r.ruleId],
      fallbackReason: reason,
      droppedFraming: [],
      provider,
    };
  };

  const config = getProviderConfig();
  if (!config) return authored("no_provider", null);

  const hint = selectReply(scenario, question, { updateReleased });
  const ctx = {
    facts: availableFacts(scenario, updateReleased),
    thread,
    question,
    updateReleased,
    hintRuleId: hint.ruleId === scenario.fallbackRuleId ? null : hint.ruleId,
  };

  let result = await draft(config, scenario, ctx, 0.7);
  if (result.ok === false && result.reason !== "provider_error") result = await draft(config, scenario, ctx, 0.9);
  if (result.ok === false) return authored(result.reason, config.provider);

  const { teammateId, reply, factIds, dropped } = result.value;
  return {
    teammateId,
    body: reply,
    ruleId: factIds.length ? `gen:${factIds.join("+")}` : "gen:conversation",
    mode: "generated",
    factIds,
    fallbackReason: null,
    droppedFraming: dropped,
    provider: config.provider,
  };
}
