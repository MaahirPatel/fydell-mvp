/**
 * Grounded LLM response generator.
 *
 * Replaces canned response selection with model-composed responses using
 * ONLY the permitted context. The model interprets the candidate's message,
 * composes a response grounded in permitted facts, and proposes memory updates.
 *
 * All output is validated before publishing:
 * - Referenced fact IDs must be in the permitted set
 * - Assistance category must be allowed by policy
 * - Withheld content is screened
 * - Response length bounded
 *
 * If the model is unavailable, returns an explicit unavailable state - 
 * never a fake dynamic response.
 */
import type { SimulationStakeholder } from "../types";
import type { ConversationState } from "./types";
import type { AssistancePolicy } from "./assistance";
import {
  buildGenerationContext,
  formatContextForPrompt,
  getPermittedFacts,
  type GenerationContext,
} from "./generation-context";
import {
  validateGeneration,
  GENERATION_SCHEMA,
  type StructuredGeneration,
} from "./structured-output";
import {
  getProviderConfig,
  postChatCompletion,
  type ChatMessage,
} from "@/lib/ai/provider";
import { verifyGrounding, checkContradiction } from "./grounding";
import { validateAssistance } from "./assistance-guard";

export interface GenerateInput {
  stakeholder: SimulationStakeholder;
  state: ConversationState;
  candidateMessage: string;
  recentMessages: GenerationContext["recentMessages"];
  policy: AssistancePolicy;
}

export type GenerateResult =
  | {
      status: "generated";
      generation: StructuredGeneration;
      /** Validated fact IDs referenced. */
      factIds: string[];
    }
  | {
      status: "unavailable";
      reason: string;
      /** False when no provider is set up at all, as opposed to a failing one. */
      configured: boolean;
    }
  | {
      status: "invalid";
      reason: string;
    };

/**
 * Screen response text for withheld content.
 * Checks if the response contains phrases from the withholds list.
 */
function containsWithheld(text: string, withholds: string[]): string | null {
  const lower = text.toLowerCase();
  for (const w of withholds) {
    // Check for key phrases (first 5 words) to catch paraphrasing attempts
    const keyPhrase = w.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
    if (keyPhrase.length > 10 && lower.includes(keyPhrase)) {
      return w;
    }
  }
  return null;
}

/**
 * Generate a grounded coworker response.
 */
export async function generateResponse(input: GenerateInput): Promise<GenerateResult> {
  const config = getProviderConfig();
  if (!config) {
    return { status: "unavailable", reason: "Model not configured (set MODEL_PROVIDER and its credentials)", configured: false };
  }

  const ctx = buildGenerationContext({
    stakeholder: input.stakeholder,
    state: input.state,
    candidateMessage: input.candidateMessage,
    recentMessages: input.recentMessages,
    policy: input.policy,
  });

  const permittedIds = new Set(getPermittedFacts(input.stakeholder).map((f) => f.id));
  const systemPrompt = formatContextForPrompt(ctx);

  // For providers without native JSON-schema enforcement (Ollama), describe
  // the exact shape in the prompt. Validation below is the real enforcement
  // for every provider.
  const schemaHint = config.supportsJsonSchema
    ? ""
    : `\n\nRespond with ONLY a JSON object matching this shape (no markdown fences, no commentary):\n${JSON.stringify(GENERATION_SCHEMA, null, 1)}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt + schemaHint },
    {
      role: "user",
      content: `Candidate message: "${input.candidateMessage.slice(0, 1000)}"\n\nAnalyze this message and compose your response as JSON.`,
    },
  ];

  let content: string;
  try {
    content = await postChatCompletion(config, messages, {
      schema: GENERATION_SCHEMA as Record<string, unknown>,
      schemaName: "coworker_response",
      temperature: 0.3,
      maxTokens: 800,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    if (/timed out/i.test(reason)) {
      return { status: "unavailable", reason: "Model request timed out", configured: true };
    }
    return { status: "unavailable", reason: `Model error: ${reason}`, configured: true };
  }

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { status: "invalid", reason: "Model returned invalid JSON" };
    }

    const validated = validateGeneration(parsed, permittedIds);
    if (!validated) {
      return { status: "invalid", reason: "Model output failed validation" };
    }

    // Screen for withheld content
    const withheld = containsWithheld(validated.response.text, input.stakeholder.withholds || []);
    if (withheld) {
      return { status: "invalid", reason: `Response contained withheld content` };
    }

    // Verify grounding: specific claims must be supported by cited facts.
    // A valid fact ID is not enough - the claim must actually appear in the fact.
    const permittedFacts = getPermittedFacts(input.stakeholder);
    const grounding = verifyGrounding(
      validated.response.text,
      validated.response.fact_ids,
      permittedFacts
    );
    if (!grounding.supported) {
      return {
        status: "invalid",
        reason: `Unsupported claims: ${grounding.issues.map((i) => i.detail).join("; ")}`,
      };
    }

    // Check for contradictions with cited facts
    const contradiction = checkContradiction(
      validated.response.text,
      validated.response.fact_ids,
      permittedFacts
    );
    if (contradiction) {
      return { status: "invalid", reason: contradiction };
    }

    // Validate assistance: check for mislabeled solution content,
    // hint budget, and cumulative reveal across turns
    const assistanceCheck = validateAssistance(
      validated.response.text,
      validated.response.assistance_category,
      input.state,
      input.policy.maxHints,
      input.policy.allowSolution
    );
    if (!assistanceCheck.valid) {
      return { status: "invalid", reason: `Assistance policy: ${assistanceCheck.reason}` };
    }

    // Check assistance policy: hint limit
    if (validated.response.assistance_category === "hint") {
      const hintsUsed = input.state.helpGiven.filter((h) => h.level === "hint").length;
      if (hintsUsed >= input.policy.maxHints) {
        return { status: "invalid", reason: "Model proposed hint over policy limit" };
      }
    }

    // Check assistance policy: solution never allowed unless explicitly permitted
    if (validated.response.assistance_category === "solution" && !input.policy.allowSolution) {
      return { status: "invalid", reason: "Model proposed solution-level help (not permitted)" };
    }

    return {
      status: "generated",
      generation: validated,
      factIds: validated.response.fact_ids,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "unavailable", reason: "Model request timed out", configured: true };
    }
    return { status: "unavailable", reason: `Model error: ${err instanceof Error ? err.message : "unknown"}`, configured: true };
  }
}
