import { PanelSection } from "@/components/ui/Panel";
import { Status } from "@/components/ui/report";
import type { EmployerCollaboration } from "@/lib/eng/authored/collaboration";
import type { EvidenceRef, EvidenceState } from "@/lib/eng/authored/collaboration-evidence";

const STATE_LABEL: Record<EvidenceState, string> = {
  observed: "Observed",
  not_observed: "Not observed",
  not_assessed: "Not assessed",
};

function sourceHref(ref: EvidenceRef): string {
  return ref.kind === "team_message" ? `#team-msg-${ref.messageId}` : `#handoff-${ref.promptId}`;
}

const SUBMITTED_AS: Record<"unchanged" | "modified_after" | "not_submitted", string> = {
  unchanged: "Submitted unchanged",
  modified_after: "Edited further before submitting",
  not_submitted: "Not in the submission",
};

function time(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Employer view of the simulated-teammate thread, communication evidence and assistant use. No score. */
export function AuthoredCollaborationPanel({ data }: { data: EmployerCollaboration }) {
  const names = new Map(data.teammates.map((t) => [t.id, t.name]));
  const conversation = data.messages.filter((m) => m.kind === "message" || (m.eventKey !== null && m.eventKey !== "initial_context" && m.eventKey !== "final_handoff"));
  return (
    <>
      <PanelSection
        title="Collaboration behaviours"
        description="Task-relevant behaviours this attempt shows, each linked to the message or handoff answer behind it. Not assessed means the task gave no fair opportunity. Brevity, message count, writing style, pauses and not asking unneeded questions are never counted."
      >
        <ul className="grid gap-3">
          {data.communication.map((item) => (
            <li key={item.behavior} className="rounded-[8px] border border-[var(--border-subtle)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-app-body font-semibold text-[var(--text-primary)]">{item.label}</p>
                <Status kind={item.state === "observed" ? "success" : "neutral"} icon={item.state === "observed"}>
                  {STATE_LABEL[item.state]}
                </Status>
              </div>
              <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{item.summary}</p>
              {item.excerpts.length ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-primary)]">
                    {item.excerpts.length === 1 ? "1 excerpt" : `${item.excerpts.length} excerpts`}
                  </summary>
                  <ul className="mt-2 grid gap-2">
                    {item.excerpts.map((e, i) => (
                      <li key={i} className="rounded-[6px] bg-[var(--surface-panel)] px-3 py-2">
                        <p className="text-[12px] text-[var(--text-tertiary)]">
                          <a href={sourceHref(e.ref)} className="underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text-primary)]">
                            {e.label}
                          </a>
                          {e.at ? `, ${time(e.at)}` : ""}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-app-meta text-[var(--text-body)]">{e.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">{item.limits}</p>
            </li>
          ))}
        </ul>
      </PanelSection>

      <PanelSection
        title="Team thread"
        description={
          data.teammates.length
            ? `Simulated teammates: ${data.teammates.map((t) => `${t.name} (${t.title})`).join(", ")}. They answer only from the scenario's notes and cannot change files.`
            : "This task had no simulated teammates."
        }
      >
        {conversation.length === 0 ? (
          <p className="text-app-body text-[var(--text-secondary)]">No messages.</p>
        ) : (
          <details>
            <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-primary)]">
              Show {conversation.length} {conversation.length === 1 ? "message" : "messages"}
            </summary>
            <ol className="mt-3 grid gap-2">
              {conversation.map((m) => (
                <li key={m.id} id={`team-msg-${m.id}`} className="scroll-mt-6 text-app-meta">
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    {m.sender === "candidate"
                      ? `Candidate to ${names.get(m.toTeammateId ?? "") ?? "the team"}`
                      : `${names.get(m.teammateId ?? "") ?? "Teammate"}${m.eventKey === "review_question" ? ", planned review question" : ""}${m.answeredFrom === "scenario_notes" ? ", fixed reply from scenario notes" : ""}`}
                    , {time(m.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-body)]">{m.body}</p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </PanelSection>

      <PanelSection
        title="Coding assistant"
        description={data.assistant.enabled ? "The built-in assistant was available under this task's AI policy. Using it or not is not scored." : "This task's AI policy did not include the built-in assistant."}
      >
        {data.assistant.enabled ? (
          data.assistant.items.length === 0 ? (
            <p className="text-app-body text-[var(--text-secondary)]">Not used.</p>
          ) : (
            <>
              <p className="text-app-body text-[var(--text-body)]">
                {data.assistant.requests} {data.assistant.requests === 1 ? "request" : "requests"}, {data.assistant.proposedPatches} proposed{" "}
                {data.assistant.proposedPatches === 1 ? "change" : "changes"}: {data.assistant.accepted} accepted, {data.assistant.rejected} rejected
                {data.assistant.undecided ? `, ${data.assistant.undecided} left undecided` : ""}.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-primary)]">Show requests</summary>
                <ol className="mt-3 grid gap-2">
                  {data.assistant.items.map((i, idx) => (
                    <li key={idx} className="text-app-meta">
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        {time(i.at)}
                        {i.paths.length ? `, proposed changes to ${i.paths.join(", ")}` : ""}
                        {i.decision === "accepted" ? ", accepted" : i.decision === "rejected" ? ", rejected" : ""}
                        {i.submittedAs ? `, ${SUBMITTED_AS[i.submittedAs].toLowerCase()}` : ""}
                        {i.status === "provider_unavailable" ? ", assistant unavailable" : i.status === "limit_reached" ? ", over the request limit" : ""}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-body)]">{i.prompt}</p>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          )
        ) : null}
      </PanelSection>
    </>
  );
}
