import "server-only";
import { getProviderConfig, postChatCompletion } from "@/lib/ai/provider";
import type { TeamRequest, TeamResponse } from "./team";
import { checkTeammateDraft, senderOf, TEAMMATE_REPLY_SCHEMA, teammateMessages } from "./team-core";
import { TEAMMATES } from "./team-knowledge";

const ATTEMPTS = 3;
const PROVIDER_BACKOFF_MS = 8_000;
/** Groq meters each model separately, so a smaller sibling keeps teammates answering when the primary's quota is spent. */
const FALLBACK_GROQ_MODEL = "openai/gpt-oss-20b";
const PRIMARY_COOLDOWN_MS = 5 * 60_000;
let primaryCooldownUntil = 0;

function unavailable(reason: Extract<TeamResponse, { status: "unavailable" }>["reason"], name: string, retryAfterSeconds: number | null = null): TeamResponse {
  const message =
    reason === "not_configured"
      ? `${name} is not available: no language model is configured for the demo.`
      : reason === "rate_limited"
        ? `${name} could not reply because the language model is busy right now. Your message is kept; try again in a minute.`
        : reason === "rejected"
          ? `${name}'s reply did not pass Fydell's checks, so it was not shown. Try rephrasing or ask again.`
          : `${name} could not reply: the language model did not respond. Your message is kept; try again.`;
  return { status: "unavailable", reason, retryAfterSeconds, message };
}

/**
 * One teammate turn: generate with the configured model, validate, retry
 * with the rejection reason, and return an honest unavailable state instead
 * of a fallback reply.
 */
export async function composeTeammateTurn(request: TeamRequest, trace?: string[]): Promise<TeamResponse> {
  const self = TEAMMATES[senderOf(request)];
  const primary = getProviderConfig();
  if (!primary) return unavailable("not_configured", self.firstName);
  const fallbackModel = process.env.DEMO_TEAM_FALLBACK_MODEL ?? (primary.provider === "groq" ? FALLBACK_GROQ_MODEL : null);
  let config = fallbackModel && Date.now() < primaryCooldownUntil ? { ...primary, model: fallbackModel } : primary;

  let retryNote: string | null = null;
  let waited = false;
  for (let i = 0; i < ATTEMPTS; i++) {
    let raw: unknown;
    const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
    try {
      const content = await postChatCompletion(config, teammateMessages(request, retryNote), {
        schema: TEAMMATE_REPLY_SCHEMA,
        schemaName: "teammate_reply",
        temperature: i === 0 ? 0.6 : 0.4,
        maxTokens: 900,
        extraBody,
      });
      raw = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch (error) {
      if (error instanceof SyntaxError) {
        retryNote = "it was not valid JSON";
        continue;
      }
      if (error instanceof Error && /\b429\b/.test(error.message)) {
        if (fallbackModel && config.model !== fallbackModel) {
          primaryCooldownUntil = Date.now() + PRIMARY_COOLDOWN_MS;
          config = { ...primary, model: fallbackModel };
          i -= 1;
          continue;
        }
        if (!waited) {
          waited = true;
          i -= 1;
          await new Promise((r) => setTimeout(r, PROVIDER_BACKOFF_MS));
          continue;
        }
        return unavailable("rate_limited", self.firstName, 60);
      }
      return unavailable("provider_error", self.firstName);
    }
    const checked = checkTeammateDraft(raw, request);
    if (checked.ok === false) {
      retryNote = checked.reason;
      trace?.push(`${config.model}: ${checked.reason}`);
      continue;
    }
    return {
      status: "answered",
      reply: {
        clientMsgId: request.clientMsgId,
        teammateId: self.id,
        kind: request.kind === "message" ? "reply" : "checkin",
        trigger: request.kind === "checkin" ? request.trigger : null,
        text: checked.text,
        factIds: checked.factIds,
      },
    };
  }
  return unavailable("rejected", self.firstName);
}
