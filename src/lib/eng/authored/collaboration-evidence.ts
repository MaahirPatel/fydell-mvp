/**
 * Collaboration evidence for an authored simulation, built from the stored
 * team thread, the handoff and the platform's own run records. It covers only
 * task-relevant, observable behaviours, and each observation links to the
 * message or handoff answer that supports it.
 *
 * States:
 *   observed      the record contains the behaviour; the excerpts show where.
 *   not_observed  the task gave a fair opportunity and the record does not show it.
 *   not_assessed  the task gave no fair opportunity (or did not require it), so nothing is concluded.
 *
 * Deliberately never measured or penalised: brevity, not asking unnecessary
 * questions, writing style, tone, English fluency, pauses, message volume,
 * agreement with teammates, whether the assistant was used, and behaviours
 * the task never required. Nothing here describes personality or fit.
 */
import type { PackageFile } from "../authoring/package";
import type { AssistantInteractionView, ScenarioEventKey, TeamMessageView } from "./collaboration-types";

export type CommunicationBehavior = "clarification" | "blocker" | "decision" | "new_information" | "uncertainty" | "handoff" | "feedback";
export type EvidenceState = "observed" | "not_observed" | "not_assessed";

/** Where an excerpt comes from, so the employer view can link to it. */
export type EvidenceRef = { kind: "team_message"; messageId: string; seq: number } | { kind: "handoff"; promptId: string };

export interface EvidenceExcerpt {
  source: "team" | "handoff";
  label: string;
  text: string;
  at: string | null;
  ref: EvidenceRef;
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

export const BEHAVIOR_LABELS: Record<CommunicationBehavior, string> = {
  clarification: "Asking a necessary clarification",
  blocker: "Reporting a blocker",
  decision: "Explaining a decision",
  new_information: "Responding to new information",
  uncertainty: "Identifying uncertainty",
  handoff: "Producing a useful handoff",
  feedback: "Incorporating feedback",
};

const NOT_A_DEFICIT = "Not observed means this attempt holds no record of it. It is not a finding about the person.";

function clip(text: string, max = 320): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const QUESTION = /\?|^(how|what|why|when|where|which|who|is|are|does|do|can|could|should|would|will)\b/i;
const BLOCKER_WORDS = /\b(blocked|blocker|stuck|can(?:no|')t (?:run|start|install|open|reach|access|get)|unable to|won'?t (?:run|start|load)|doesn'?t (?:run|start|load)|keeps? (?:failing|timing out|crashing)|error when|not working|environment (?:check )?fail)/i;
const REASON_WORDS = /\b(because|so that|so the|since|instead of|rather than|chose|chosen|choose|decided|trade-?offs?|to avoid|to prevent|which means|otherwise|alternative(?:ly)?|at the cost of)\b/i;
const UNCERTAINTY_WORDS = /\b(assum(?:e|ed|ing|ption)s?|not sure|unsure|unclear|unknown|risks?|might|may not|could still|haven'?t (?:tested|verified|checked)|not (?:tested|verified|covered)|untested|edge cases?|would (?:next|also)|next step)\b/i;
const EMPTY_ANSWER = /^(none|nothing|n\/a|na|no|-+)\.?$/i;
const UNRESOLVED_PROMPT = /unresolved|risk|remain|open question|uncertain|next/i;

type HandoffAnswer = { id: string; label: string; answer: string };

export function buildCommunicationEvidence(input: {
  hasTeammates: boolean;
  messages: TeamMessageView[];
  handoff: HandoffAnswer[] | null;
  submitted: boolean;
  /** Platform faults during the attempt (for example a test run that could not start). Never counted against the candidate. */
  technicalIssues?: Array<{ at: string }>;
}): CommunicationItem[] {
  const { messages, handoff } = input;
  const candidate = messages.filter((m) => m.sender === "candidate" && m.kind === "message");
  const prompts = handoff ?? [];
  const answered = prompts.filter((h) => h.answer.trim());
  const technicalIssues = input.technicalIssues ?? [];

  const teamExcerpt = (m: TeamMessageView, label = "Team thread"): EvidenceExcerpt => ({
    source: "team",
    label: `${label}, message ${m.seq}`,
    text: clip(m.body),
    at: m.createdAt,
    ref: { kind: "team_message", messageId: m.id, seq: m.seq },
  });
  const handoffExcerpt = (h: HandoffAnswer): EvidenceExcerpt => ({ source: "handoff", label: `Handoff: ${h.label}`, text: clip(h.answer), at: null, ref: { kind: "handoff", promptId: h.id } });
  const item = (behavior: CommunicationBehavior, state: EvidenceState, summary: string, excerpts: EvidenceExcerpt[], limits: string): CommunicationItem => ({
    behavior,
    label: BEHAVIOR_LABELS[behavior],
    state,
    summary,
    excerpts: excerpts.slice(0, 4),
    limits,
  });

  const items: CommunicationItem[] = [];

  // Asking a necessary clarification: a question to a simulated teammate and the answer it got.
  if (!input.hasTeammates) {
    items.push(item("clarification", "not_assessed", "This task had no simulated teammates to ask.", [], "Nothing is concluded."));
  } else {
    const pairs: EvidenceExcerpt[] = [];
    let asked = 0;
    for (const q of candidate.filter((m) => QUESTION.test(m.body.trim()))) {
      asked += 1;
      const reply = messages.find((m) => m.sender === "teammate" && m.seq > q.seq && m.teammateId === q.toTeammateId && m.kind === "message");
      pairs.push(teamExcerpt(q, "Question"));
      if (reply) pairs.push(teamExcerpt(reply, "Answer"));
    }
    items.push(
      asked
        ? item(
            "clarification",
            "observed",
            `Asked ${asked === 1 ? "a question" : `${asked} questions`} of the simulated teammates. The excerpts pair each question with the answer.`,
            pairs,
            "Shows what was asked and what the answer said. Whether the question was necessary is a reviewer judgment; extra questions are not counted against the candidate.",
          )
        : item(
            "clarification",
            "not_assessed",
            "No questions were asked. A question is only expected when the brief leaves something out, so this is not assessed.",
            [],
            "Not asking is never counted against the candidate.",
          ),
    );
  }

  // Reporting a blocker: only assessable when something actually blocked the work.
  const reported = candidate.filter((m) => BLOCKER_WORDS.test(m.body));
  if (reported.length) {
    items.push(
      item("blocker", "observed", "Told a teammate about something blocking the work.", reported.map((m) => teamExcerpt(m)), "Shows the report, not whether the blocker was real. Platform faults are recorded separately and never count against the candidate."),
    );
  } else {
    items.push(
      item(
        "blocker",
        "not_assessed",
        technicalIssues.length
          ? `A platform problem occurred ${technicalIssues.length === 1 ? "once" : `${technicalIssues.length} times`} (a test run could not start). It is recorded as a platform fault, not a candidate result, and reporting it was not required.`
          : "Nothing blocked the work in this attempt, so there was nothing to report.",
        [],
        "Nothing is concluded.",
      ),
    );
  }

  // Explaining a decision: reasons given for the approach, in the handoff or the thread.
  const reasoned = [...answered.filter((h) => REASON_WORDS.test(h.answer)).map(handoffExcerpt), ...candidate.filter((m) => REASON_WORDS.test(m.body)).map((m) => teamExcerpt(m))];
  if (reasoned.length) {
    items.push(item("decision", "observed", "Gave reasons for the approach taken.", reasoned, "Found by wording; read the excerpts in context. Whether the reasoning is correct is a reviewer judgment, and a short explanation counts the same as a long one."));
  } else if (input.submitted && prompts.length) {
    items.push(item("decision", "not_observed", "The handoff and thread do not give a reason for the approach.", [], `${NOT_A_DEFICIT} Detection is by wording, so a reviewer may find reasoning the summary missed.`));
  } else {
    items.push(item("decision", "not_assessed", input.submitted ? "This task asked for no written explanation." : "The attempt has not been submitted.", [], "Nothing is concluded."));
  }

  // Responding to new information: only when the scenario introduced new information during the work.
  const injected = messages.filter((m) => m.kind === "scenario_event" && m.eventKey !== "initial_context" && m.eventKey !== "review_question" && m.eventKey !== "final_handoff");
  if (!injected.length) {
    items.push(item("new_information", "not_assessed", "The task did not introduce new information while the candidate worked.", [], "Nothing is concluded."));
  } else {
    const first = injected[0];
    const response = candidate.find((m) => m.seq > first.seq);
    items.push(
      response
        ? item("new_information", "observed", "Responded after the scenario introduced new information.", [teamExcerpt(first, "Update"), teamExcerpt(response, "Response")], "Shows a response, not whether it was right. A reviewer judges the content.")
        : item("new_information", "not_observed", "No response to the new information was recorded.", [teamExcerpt(first, "Update")], NOT_A_DEFICIT),
    );
  }

  // Identifying uncertainty: an answer to the handoff's open-risks question, or explicit assumptions and risks.
  const unresolvedPrompt = prompts.find((h) => UNRESOLVED_PROMPT.test(`${h.id} ${h.label}`));
  const uncertain = [
    ...(unresolvedPrompt && unresolvedPrompt.answer.trim() && !EMPTY_ANSWER.test(unresolvedPrompt.answer.trim()) ? [handoffExcerpt(unresolvedPrompt)] : []),
    ...answered.filter((h) => h !== unresolvedPrompt && UNCERTAINTY_WORDS.test(h.answer)).map(handoffExcerpt),
    ...candidate.filter((m) => UNCERTAINTY_WORDS.test(m.body)).map((m) => teamExcerpt(m)),
  ];
  if (uncertain.length) {
    items.push(item("uncertainty", "observed", "Named assumptions, risks or what was not verified.", uncertain, "Shows what the candidate said was uncertain. Whether anything important was missed is a reviewer judgment."));
  } else if (input.submitted && unresolvedPrompt) {
    items.push(
      item(
        "uncertainty",
        "not_observed",
        unresolvedPrompt.answer.trim() ? "The answer to the open-risks question says nothing remains." : "The open-risks question was left empty.",
        unresolvedPrompt.answer.trim() ? [handoffExcerpt(unresolvedPrompt)] : [],
        `${NOT_A_DEFICIT} Saying nothing remains can be accurate; a reviewer judges it against the submitted work.`,
      ),
    );
  } else {
    items.push(item("uncertainty", "not_assessed", input.submitted ? "The task did not ask about open risks." : "The attempt has not been submitted.", [], "Nothing is concluded."));
  }

  // Producing a useful handoff.
  if (!input.submitted || prompts.length === 0) {
    items.push(item("handoff", "not_assessed", input.submitted ? "This task asked for no handoff." : "The attempt has not been submitted.", [], "Nothing is concluded."));
  } else {
    items.push(
      answered.length
        ? item("handoff", "observed", `Answered ${answered.length} of ${prompts.length} handoff questions.`, answered.map(handoffExcerpt), "Shows what the candidate wrote. Whether it matches the submitted code is for the reviewer to check; length is not counted.")
        : item("handoff", "not_observed", "The handoff questions were left empty.", [], NOT_A_DEFICIT),
    );
  }

  // Incorporating feedback: the planned review question and the reply.
  const review = messages.find((m) => m.eventKey === ("review_question" satisfies ScenarioEventKey));
  if (!review) {
    items.push(item("feedback", "not_assessed", "No review feedback was given during this attempt.", [], "Nothing is concluded."));
  } else {
    const answer = candidate.find((m) => m.seq > review.seq && m.toTeammateId === review.teammateId);
    items.push(
      answer
        ? item("feedback", "observed", "Responded to the reviewer's question.", [teamExcerpt(review, "Review question"), teamExcerpt(answer, "Reply")], "Disagreeing with a reviewer, with reasons, is a valid response. Whether the answer is correct is a reviewer judgment.")
        : input.submitted
          ? item("feedback", "not_observed", answered.length ? "The review question was not answered in the thread. The handoff may address it." : "The review question was not answered.", [teamExcerpt(review, "Review question")], NOT_A_DEFICIT)
          : item("feedback", "not_assessed", "The review question arrived and the attempt is still open.", [teamExcerpt(review, "Review question")], "Nothing is concluded."),
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
