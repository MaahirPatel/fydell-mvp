/**
 * Deterministic, fully-offline "AI workspace" helper for Project Relay.
 *
 * There is no live model call here — every suggestion is either a
 * hand-authored fix for the known router.py approval-policy defect, or a
 * mechanical, clearly-labeled note appended for a candidate-typed
 * instruction. Nothing here fabricates a real LLM response.
 */

export type PatchProposal = {
  file: string;
  before: string;
  after: string;
  summary: string;
  source: "router_policy_bug_fix" | "instruction";
};

const ROUTER_FILE_SUFFIX = "router.py";

const ROUTER_IMPORT_BEFORE = `from models import ModelResponse, Ticket, TriageDecision
from prompts import call_model`;

const ROUTER_IMPORT_AFTER = `from models import ModelResponse, Ticket, TriageDecision
from policy import requires_human_approval
from prompts import call_model`;

const ROUTER_RETURN_BEFORE = `    telemetry.record("route_model_assisted", {"ticket_id": ticket.id})
    model_response: ModelResponse = call_model(ticket.text)

    return TriageDecision(
        ticket_id=ticket.id,
        category=model_response.category,
        action=model_response.action,
        confidence=model_response.confidence,
        human_approval_required=False,
        evidence=[f"model_assisted_{model_response.rationale}"],
        reason="model_assisted_v0",
        source="model_assisted_v0",
    )`;

const ROUTER_RETURN_AFTER = `    telemetry.record("route_model_assisted", {"ticket_id": ticket.id})
    model_response: ModelResponse = call_model(ticket.text)

    # Fix: re-check the approval policy before treating a model suggestion as
    # authorized — mirrors the heuristic branch above via triage.recommend_action.
    human_approval_required = requires_human_approval(model_response.action)
    action = "abstain" if human_approval_required else model_response.action

    return TriageDecision(
        ticket_id=ticket.id,
        category=model_response.category,
        action=action,
        confidence=model_response.confidence,
        human_approval_required=human_approval_required,
        evidence=[f"model_assisted_{model_response.rationale}"],
        reason="model_assisted_v0",
        source="model_assisted_v0",
    )`;

export function detectRouterPolicyBug(file: string, content: string): boolean {
  return (
    file.endsWith(ROUTER_FILE_SUFFIX) &&
    content.includes(ROUTER_RETURN_BEFORE) &&
    !content.includes("requires_human_approval(model_response.action)")
  );
}

function routerPolicyFix(file: string, content: string): PatchProposal | null {
  if (!detectRouterPolicyBug(file, content)) return null;
  let after = content.replace(ROUTER_IMPORT_BEFORE, ROUTER_IMPORT_AFTER);
  after = after.replace(ROUTER_RETURN_BEFORE, ROUTER_RETURN_AFTER);
  if (after === content) return null;
  return {
    file,
    before: content,
    after,
    summary:
      "Known defect: the model-assisted branch never re-checks policy.requires_human_approval, so a " +
      "high-confidence model suggestion could auto-execute a refund or account lock. This patch threads " +
      "the same approval check the heuristic branch already uses.",
    source: "router_policy_bug_fix",
  };
}

const UNSAFE_TO_ANNOTATE = [".json", ".jsonl"];

function commentPrefixFor(file: string): string {
  if (file.endsWith(".py")) return "#";
  if (file.endsWith(".md")) return "<!--";
  return "//";
}

function instructionPatch(file: string, content: string, instruction: string): PatchProposal | null {
  const trimmed = instruction.trim();
  if (UNSAFE_TO_ANNOTATE.some((ext) => file.endsWith(ext))) return null;
  const prefix = commentPrefixFor(file);
  const suffix = prefix === "<!--" ? " -->" : "";
  const note = `${prefix} AI workspace note (deterministic, offline — not a live model call): ${trimmed}${suffix}`;
  const after = content.endsWith("\n") ? `${content}${note}\n` : `${content}\n${note}\n`;
  return {
    file,
    before: content,
    after,
    summary: `No live model is wired up, so this appends a clearly-labeled note capturing your instruction rather than inventing a code change: "${trimmed}".`,
    source: "instruction",
  };
}

/**
 * Propose a deterministic patch for the given file.
 * - A typed instruction always wins (that's the more specific request).
 * - Otherwise, if the file is router.py and still has the known approval-policy
 *   defect, propose the canonical fix.
 * - Otherwise there is nothing to suggest.
 */
export function proposePatch(file: string, content: string, instruction: string): PatchProposal | null {
  if (instruction.trim()) return instructionPatch(file, content, instruction);
  return routerPolicyFix(file, content);
}
