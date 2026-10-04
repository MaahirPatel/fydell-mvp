/**
 * Deterministic intent classification for candidate messages.
 *
 * Uses pattern matching, not an LLM — fast, predictable, testable.
 * When confidence is low, returns "unclear" and the coordinator decides
 * whether to ask for clarification or stay silent.
 */
import type { ClassifiedMessage, MessageIntent } from "./types";

interface IntentPattern {
  intent: MessageIntent;
  patterns: RegExp[];
  /** Keywords that boost confidence for this intent. */
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "question_requirement",
    patterns: [
      /\b(what|how)\b.*\b(expected|supposed|should)\b/i,
      /\bwhat('s| is) the\b.*\b(behavior|requirement|spec)\b/i,
      /\bcan i\b.*\b(change|modify|use)\b/i,
      /\bis it (ok|okay|allowed)\b/i,
    ],
    keywords: ["requirement", "expected", "should", "allowed", "spec", "behavior"],
  },
  {
    intent: "question_reproduction",
    patterns: [
      /\bhow (do|can) i\b.*\b(reproduce|trigger|test)\b/i,
      /\bsteps to reproduce\b/i,
      /\bhow to (run|test|reproduce)\b/i,
    ],
    keywords: ["reproduce", "steps", "trigger"],
  },
  {
    intent: "question_constraint",
    patterns: [
      /\bcan i change\b/i,
      /\b(is|are) .* (allowed|permitted)\b/i,
      /\bwhat.*(constraints?|limits?|boundaries)\b/i,
      /\bdo i need to\b.*\b(keep|preserve|maintain)\b/i,
    ],
    keywords: ["constraint", "allowed", "scope", "limit", "boundary"],
  },
  {
    intent: "question_help",
    patterns: [
      /\b(help|stuck|confused|don't understand|dont understand)\b/i,
      /\bwhat should i\b/i,
      /\bgive me a (hint|hand)\b/i,
      /\bi('m| am) stuck\b/i,
    ],
    keywords: ["help", "stuck", "hint", "confused"],
  },
  {
    intent: "sharing_plan",
    patterns: [
      /\b(i('m|'ll| am| will)|going to|planning to)\b.*\b(check|look|inspect|investigate|try|test|fix|change|implement)\b/i,
      /\bmy (plan|approach|strategy) is\b/i,
      /\bi('ll| will) (start|begin) (by|with)\b/i,
    ],
    keywords: ["plan", "going to", "will check", "strategy"],
  },
  {
    intent: "sharing_diagnosis",
    patterns: [
      /\bi think\b.*\b(problem|issue|bug|cause|because)\b/i,
      /\bthe (problem|issue|bug) is\b/i,
      /\b(found|discovered|noticed) that\b/i,
      /\bit('s| is) (caused|due to|because)\b/i,
      /\blooks like\b/i,
    ],
    keywords: ["think", "problem", "cause", "found", "because"],
  },
  {
    intent: "sharing_result",
    patterns: [
      /\btests? (pass|fail|passed|failed)\b/i,
      /\b(test|tests) (are|is) (passing|failing|green|red)\b/i,
      /\brunning? .* (now|again)\b/i,
      /\bgot (an? )?(error|failure)\b/i,
    ],
    keywords: ["tests pass", "tests fail", "passing", "failing", "error"],
  },
  {
    intent: "sharing_explanation",
    patterns: [
      /\bbecause\b.*\b(chose|decided|picked|went with)\b/i,
      /\bi (chose|decided|picked) .* because\b/i,
      /\bthe reason\b.*\bis\b/i,
      /\btradeoff\b/i,
    ],
    keywords: ["because", "chose", "decided", "tradeoff", "reason"],
  },
  {
    intent: "acknowledgment",
    patterns: [
      /^(ok|okay|thanks|thank you|got it|understood|sure|yes|yep|nope?)[,.!?]?\s*(thanks|thank you)?[,.!?]?\s*$/i,
      /^(thanks|thank you)[,!]?\s/i,
    ],
    keywords: [],
  },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  retry_backoff: ["retry", "retries", "backoff", "delay", "attempt", "jitter"],
  idempotency: ["idempot", "dedup", "duplicate", "exactly once", "at-least-once"],
  api_compat: ["404", "status", "endpoint", "api", "contract", "breaking"],
  scope: ["scope", "hotfix", "refactor", "rewrite", "how big", "size"],
  testing: ["test", "pytest", "coverage", "regression"],
  runbook: ["runbook", "deploy", "operation", "alert"],
};

/**
 * Classify a candidate message by intent.
 * Returns topic IDs based on keyword overlap.
 */
export function classifyMessage(text: string): ClassifiedMessage {
  const lower = text.toLowerCase().trim();
  const entities: string[] = [];

  // Extract file/function mentions
  const fileMatches = lower.match(/[\w-]+\.(ts|js|py|md|json)\b/g);
  if (fileMatches) entities.push(...fileMatches);
  const funcMatches = lower.match(/\b[a-z_][a-z0-9_]*\(\)/g);
  if (funcMatches) entities.push(...funcMatches);

  // Find matching intent
  let bestIntent: MessageIntent = "unclear";
  let bestScore = 0;

  for (const { intent, patterns, keywords } of INTENT_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(lower)) score += 2;
    }
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Topic detection
  const topicIds: string[] = [];
  for (const [topicId, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      topicIds.push(topicId);
    }
  }

  // Confidence: high if strong pattern match, medium if keyword-only
  const confidence = bestScore >= 3 ? 0.85 : bestScore >= 1 ? 0.6 : 0.3;

  return {
    intent: bestScore > 0 ? bestIntent : "unclear",
    topicIds,
    confidence,
    entities,
  };
}

/**
 * Check if two messages are asking about the same thing (by intent + topic).
 * Used to detect paraphrased repeats: "Why did you choose this approach?"
 * and "Can you explain your reasoning?" with the same topic = same question.
 */
export function isSameQuestion(a: ClassifiedMessage, b: ClassifiedMessage): boolean {
  // Both must be question intents
  const questionIntents: MessageIntent[] = [
    "question_requirement",
    "question_reproduction",
    "question_constraint",
    "question_help",
  ];
  if (!questionIntents.includes(a.intent) || !questionIntents.includes(b.intent)) {
    return false;
  }
  // Must share at least one topic
  if (a.topicIds.length === 0 || b.topicIds.length === 0) return false;
  return a.topicIds.some((t) => b.topicIds.includes(t));
}
