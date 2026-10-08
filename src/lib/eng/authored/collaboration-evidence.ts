/**
 * Communication evidence for an authored simulation, built from the stored
 * team thread and the handoff. Each behaviour is either observed, with the
 * excerpts that show it, not observed, or had no opportunity to occur.
 *
 * Deliberately not measured: message count, length, speed, tone, English
 * fluency, agreement with teammates, or whether the candidate used the
 * assistant. Not observed is never a negative finding.
 */
import type { PackageFile } from "../authoring/package";
import type { AssistantInteractionView, ScenarioEventKey, TeamMessageView } from "./collaboration-types";

export type CommunicationBehavior = "clarification" | "evidence_explanation" | "tradeoff" | "feedback" | "handoff";
export type EvidenceState = "observed" | "not_observed" | "no_opportunity";

export interface EvidenceExcerpt {
  source: "team" | "handoff";
  label: string;
  text: string;
  at: string | null;
}

export interface CommunicationItem {
  behavior: CommunicationBehavior;
  label: string;
  state: EvidenceState;
  summary: string;
  excerpts: EvidenceExcerpt[];
  /** What this evidence does not establish. */
  limits: string;
}

export interface AssistantUseSummary {
  requests: number;
  proposedPatches: number;
  accepted: number;
  rejected: number;
  undecided: number;
  /** Accepted patches whose content is still byte-identical in the submitted file. */
  retainedUnchanged: number;
  items: Array<{
    prompt: string;
    status: AssistantInteractionView["status"];
    decision: AssistantInteractionView["decision"];
    paths: string[];
    submittedAs: "unchanged" | "modified_after" | "not_submitted" | null;
    at: string;
  }>;
}

const LABELS: Record<CommunicationBehavior, string> = {
  clarification: "Clarification",
  evidence_explanation: "Evidence-based explanation",
  tradeoff: "Tradeoff discussion",
  feedback: "Handling feedback",
  handoff: "Handoff",
};

const NOT_A_DEFICIT = "Not observed means this attempt holds no record of it, not that the candidate lacks the skill.";

function clip(text: string, max = 320): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const QUESTION = /\?|^(how|what|why|when|where|which|who|is|are|does|do|can|could|should|would|will)\b/i;
const EVIDENCE_WORDS = /\b(test(s|ed|ing)?|pytest|jest|vitest|repro(duce|duced|duction)?|fail(s|ed|ing|ure)?|traceback|stack ?trace|log(s|ged)?|assert(ion)?|output|line \d+|ran|run(ning)?)\b/i;
const TRADEOFF_WORDS = /\b(trade-?offs?|instead of|rather than|alternative(ly)?|downside|at the cost of|at the expense of|chose|chosen|considered|versus|vs\.?|risk(s|y)?|limitation(s)?|simpler|edge case(s)?)\b/i;

export function buildCommunicationEvidence(input: {
  hasTeammates: boolean;
  messages: TeamMessageView[];
  handoff: Array<{ id: string; label: string; answer: string }> | null;
  submitted: boolean;
  filePaths: string[];
}): CommunicationItem[] {
  const { messages, handoff } = input;
  const candidate = messages.filter((m) => m.sender === "candidate");
  const handoffText = (handoff ?? []).filter((h) => h.answer.trim());
  const pathPattern = input.filePaths.length
    ? new RegExp(`(${input.filePaths.map((p) => p.split("/").pop() ?? p).filter((p) => p.length > 3).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i")
    : null;

  const teamExcerpt = (m: TeamMessageView): EvidenceExcerpt => ({ source: "team", label: "Team thread", text: clip(m.body), at: m.createdAt });
  const handoffExcerpt = (h: { label: string; answer: string }): EvidenceExcerpt => ({ source: "handoff", label: h.label, text: clip(h.answer), at: null });

  const items: CommunicationItem[] = [];

  // Clarification
  if (!input.hasTeammates) {
    items.push({ behavior: "clarification", label: LABELS.clarification, state: "no_opportunity", summary: "This task had no simulated teammates to ask.", excerpts: [], limits: NOT_A_DEFICIT });
  } else {
    const questions = candidate.filter((m) => QUESTION.test(m.body.trim()));
    items.push(
      questions.length
        ? {
            behavior: "clarification",
            label: LABELS.clarification,
            state: "observed",
            summary: `Asked ${questions.length === 1 ? "a question" : `${questions.length} questions`} of the simulated teammates.`,
            excerpts: questions.slice(0, 3).map(teamExcerpt),
            limits: "Shows that questions were asked, not whether they were the right ones. Asking fewer questions is not a weakness when the brief was clear.",
          }
        : { behavior: "clarification", label: LABELS.clarification, state: "not_observed", summary: "No questions to the simulated teammates.", excerpts: [], limits: NOT_A_DEFICIT },
    );
  }

  // Evidence-based explanation
  const evidenceMsgs = candidate.filter((m) => EVIDENCE_WORDS.test(m.body) || (pathPattern?.test(m.body) ?? false));
  const evidenceHandoff = handoffText.filter((h) => EVIDENCE_WORDS.test(h.answer) || (pathPattern?.test(h.answer) ?? false));
  const evidenceExcerpts = [...evidenceHandoff.map(handoffExcerpt), ...evidenceMsgs.map(teamExcerpt)].slice(0, 3);
  items.push(
    evidenceExcerpts.length
      ? {
          behavior: "evidence_explanation",
          label: LABELS.evidence_explanation,
          state: "observed",
          summary: "Explained the work with reference to tests, failures, output or specific files.",
          excerpts: evidenceExcerpts,
          limits: "Excerpts were found by wording. Read them in context; whether the reasoning is correct is a reviewer judgment.",
        }
      : {
          behavior: "evidence_explanation",
          label: LABELS.evidence_explanation,
          state: input.submitted || candidate.length ? "not_observed" : "no_opportunity",
          summary: "No explanation referring to tests, failures or specific files was found.",
          excerpts: [],
          limits: NOT_A_DEFICIT,
        },
  );

  // Tradeoff discussion
  const tradeoffs = [...handoffText.filter((h) => TRADEOFF_WORDS.test(h.answer)).map(handoffExcerpt), ...candidate.filter((m) => TRADEOFF_WORDS.test(m.body)).map(teamExcerpt)].slice(0, 3);
  items.push(
    tradeoffs.length
      ? {
          behavior: "tradeoff",
          label: LABELS.tradeoff,
          state: "observed",
          summary: "Discussed alternatives, risks or limitations of the approach.",
          excerpts: tradeoffs,
          limits: "Excerpts were found by wording. A different valid implementation is not a weaker one.",
        }
      : {
          behavior: "tradeoff",
          label: LABELS.tradeoff,
          state: input.submitted || candidate.length ? "not_observed" : "no_opportunity",
          summary: "No discussion of alternatives or limitations was found.",
          excerpts: [],
          limits: NOT_A_DEFICIT,
        },
  );

  // Handling feedback
  const review = messages.find((m) => m.eventKey === ("review_question" satisfies ScenarioEventKey));
  if (!review) {
    items.push({ behavior: "feedback", label: LABELS.feedback, state: "no_opportunity", summary: "No review question was asked during this attempt.", excerpts: [], limits: NOT_A_DEFICIT });
  } else {
    const answer = candidate.find((m) => m.seq > review.seq && m.toTeammateId === review.teammateId);
    const answerInHandoff = handoffText.length > 0;
    items.push(
      answer
        ? {
            behavior: "feedback",
            label: LABELS.feedback,
            state: "observed",
            summary: "Responded to the reviewer's question.",
            excerpts: [teamExcerpt(review), teamExcerpt(answer)],
            limits: "Disagreeing with a reviewer, with reasons, is a valid response. Whether the answer is correct is a reviewer judgment.",
          }
        : {
            behavior: "feedback",
            label: LABELS.feedback,
            state: "not_observed",
            summary: answerInHandoff ? "The review question was not answered in the thread. The handoff may address it." : "The review question was not answered in the thread.",
            excerpts: [teamExcerpt(review)],
            limits: NOT_A_DEFICIT,
          },
    );
  }

  // Handoff
  if (!input.submitted) {
    items.push({ behavior: "handoff", label: LABELS.handoff, state: "no_opportunity", summary: "The attempt has not been submitted.", excerpts: [], limits: NOT_A_DEFICIT });
  } else {
    items.push(
      handoffText.length
        ? {
            behavior: "handoff",
            label: LABELS.handoff,
            state: "observed",
            summary: `Answered ${handoffText.length} of ${(handoff ?? []).length} handoff questions.`,
            excerpts: handoffText.map(handoffExcerpt),
            limits: "Shows what the candidate wrote. Accuracy against the submitted code is for the reviewer to check.",
          }
        : { behavior: "handoff", label: LABELS.handoff, state: "not_observed", summary: "The handoff questions were left empty.", excerpts: [], limits: NOT_A_DEFICIT },
    );
  }

  return items;
}

export function summarizeAssistantUse(interactions: AssistantInteractionView[], submitted: PackageFile[] | null): AssistantUseSummary {
  const files = new Map((submitted ?? []).map((f) => [f.path, f.content]));
  let retainedUnchanged = 0;
  const items = interactions.map((i) => {
    let submittedAs: AssistantUseSummary["items"][number]["submittedAs"] = null;
    if (i.decision === "accepted" && i.patch && submitted) {
      const states = i.patch.map((p) => (files.has(p.path) ? (files.get(p.path) === p.content ? "unchanged" : "modified_after") : "not_submitted"));
      submittedAs = states.every((s) => s === "unchanged") ? "unchanged" : states.includes("modified_after") ? "modified_after" : "not_submitted";
      if (submittedAs === "unchanged") retainedUnchanged += 1;
    }
    return { prompt: clip(i.prompt, 240), status: i.status, decision: i.decision, paths: (i.patch ?? []).map((p) => p.path), submittedAs, at: i.createdAt };
  });
  return {
    requests: interactions.filter((i) => i.status !== "limit_reached").length,
    proposedPatches: interactions.filter((i) => i.patch).length,
    accepted: interactions.filter((i) => i.decision === "accepted").length,
    rejected: interactions.filter((i) => i.decision === "rejected").length,
    undecided: interactions.filter((i) => i.decision === "pending").length,
    retainedUnchanged,
    items,
  };
}
