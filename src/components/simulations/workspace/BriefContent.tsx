import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { TeammateView } from "@/lib/eng/authored/collaboration-types";
import type { AuthoredCandidateView } from "@/lib/eng/authored/types";

function windowsCommand(command: string): string {
  return command.replace(/^python3 /, "python ");
}

export function BriefSection({ title, children, compact, id }: { title: string; children: ReactNode; compact?: boolean; id?: string }) {
  return (
    <section aria-labelledby={id} className={cn("grid", compact ? "gap-2" : "gap-3")}>
      <h2 id={id} className={cn("font-semibold tracking-[-0.01em] text-[var(--text-primary)]", compact ? "text-[13.5px]" : "text-[16px]")}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items, compact }: { items: string[]; compact?: boolean }) {
  return (
    <ul className={cn("grid list-disc gap-1.5 pl-5 marker:text-[var(--text-quaternary)]", compact ? "text-[13px]" : "text-[15px]")}>
      {items.map((item) => (
        <li key={item} className="leading-[1.55] text-[var(--text-body)]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export type BriefTeammate = Pick<TeammateView, "name" | "title" | "responsibilities"> & { topics: string[] };

export function teammatesFor(view: AuthoredCandidateView, teammates: TeammateView[] | null): BriefTeammate[] {
  if (teammates && teammates.length) return teammates;
  return view.task.coworkers.map((c) => ({ ...c, topics: [] }));
}

/**
 * The task brief, shared by the opening screen and the workspace sidebar so
 * the candidate always reads the same text.
 */
export function BriefContent({
  view,
  teammates,
  messagingAvailable,
  compact,
  idBase,
}: {
  view: AuthoredCandidateView;
  teammates: BriefTeammate[];
  messagingAvailable: boolean;
  compact?: boolean;
  idBase: string;
}) {
  const { task, role } = view;
  const body = compact ? "text-[13px] leading-[1.6]" : "text-[15px] leading-[1.65]";
  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  const starterPaths = [...task.starterFiles].map((f) => f.path).sort((a, b) => a.localeCompare(b));
  const testFiles = new Set(task.publicTests.map((t) => t.file));
  return (
    <div className={cn("grid", compact ? "gap-6" : "gap-9")}>
      <BriefSection title="Business context" compact={compact} id={`${idBase}-context`}>
        <div className={cn("grid gap-3 text-[var(--text-body)]", body)}>
          {role.companyContext ? <p className="whitespace-pre-wrap">{role.companyContext}</p> : null}
          {task.context ? <p className="whitespace-pre-wrap">{task.context}</p> : null}
          {!role.companyContext && !task.context ? <p className="text-[var(--text-secondary)]">{task.summary}</p> : null}
        </div>
      </BriefSection>

      <BriefSection title="The task" compact={compact} id={`${idBase}-task`}>
        <div className={cn("grid gap-3", body)}>
          {task.summary && (role.companyContext || task.context) ? <p className="text-[var(--text-secondary)]">{task.summary}</p> : null}
          <p className="whitespace-pre-wrap text-[var(--text-primary)]">{task.task}</p>
        </div>
      </BriefSection>

      <BriefSection title="Expected behaviour" compact={compact} id={`${idBase}-expected`}>
        <div className="grid gap-4">
          {task.outcomes.length ? <List items={task.outcomes} compact={compact} /> : null}
          {task.acceptanceCriteria.length ? (
            <div className="grid gap-2">
              <h3 className={cn("font-medium text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>Acceptance criteria</h3>
              <ol className="grid gap-2">
                {task.acceptanceCriteria.map((ac) => (
                  <li key={ac.id} className={cn("grid gap-2", compact ? "grid-cols-[36px_minmax(0,1fr)] text-[13px]" : "grid-cols-[48px_minmax(0,1fr)] text-[15px]")}>
                    <span className="pt-[2px] font-mono text-[12px] text-[var(--text-tertiary)]">{ac.id}</span>
                    <span className="leading-[1.55] text-[var(--text-primary)]">{ac.text}</span>
                  </li>
                ))}
              </ol>
              <p className={cn("text-[var(--text-tertiary)]", compact ? "text-[12px]" : "text-[13px]")}>
                Some tests ship with the starter. Others run only after you submit and check the same criteria.
              </p>
            </div>
          ) : null}
        </div>
      </BriefSection>

      {task.constraints.length || task.outOfScope.length || task.optionalExtensions.length ? (
        <BriefSection title="Constraints" compact={compact} id={`${idBase}-constraints`}>
          <div className="grid gap-4">
            {task.constraints.length ? <List items={task.constraints} compact={compact} /> : null}
            {task.outOfScope.length ? (
              <div className="grid gap-2">
                <h3 className={cn("font-medium text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>Out of scope</h3>
                <List items={task.outOfScope} compact={compact} />
              </div>
            ) : null}
            {task.optionalExtensions.length ? (
              <div className="grid gap-2">
                <h3 className={cn("font-medium text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>Optional, if you have time</h3>
                <List items={task.optionalExtensions} compact={compact} />
              </div>
            ) : null}
          </div>
        </BriefSection>
      ) : null}

      {task.interface.trim() ? (
        <BriefSection title="Interface" compact={compact} id={`${idBase}-interface`}>
          <p className={cn("text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>The public surface of the starter project. Keep it working unless the task says otherwise.</p>
          <pre className="sim-scroll overflow-x-auto whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-[var(--text-primary)]">
            {task.interface}
          </pre>
        </BriefSection>
      ) : null}

      <BriefSection title="Starter repository" compact={compact} id={`${idBase}-starter`}>
        <ul className="grid gap-0.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2">
          {starterPaths.map((p) => (
            <li key={p} className="flex items-center justify-between gap-3 font-mono text-[12.5px] leading-[1.7] text-[var(--text-body)]">
              <span className="min-w-0 truncate" title={p}>
                {p}
              </span>
              {testFiles.has(p) ? <span className="shrink-0 font-sans text-[11.5px] text-[var(--text-tertiary)]">Public tests</span> : null}
            </li>
          ))}
        </ul>
        <div className={cn("grid gap-1 text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>
          <p>
            {task.environment.label}. Public test command:{" "}
            <code className="rounded-[4px] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--text-primary)]">{task.environment.publicTestCommand}</code>
          </p>
          {task.environment.runtime === "python" && windowsCommand(task.environment.publicTestCommand) !== task.environment.publicTestCommand ? (
            <p className="text-[var(--text-tertiary)]">On Windows use {windowsCommand(task.environment.publicTestCommand)}.</p>
          ) : null}
        </div>
      </BriefSection>

      <BriefSection title="Permitted tools" compact={compact} id={`${idBase}-tools`}>
        <p className={cn("whitespace-pre-wrap text-[var(--text-body)]", body)}>{task.aiPolicy}</p>
      </BriefSection>

      <BriefSection title="Duration" compact={compact} id={`${idBase}-duration`}>
        <p className={cn("text-[var(--text-body)]", body)}>
          {minutes} minutes, counted from when you open the workspace. Setup is not timed. If you leave the page the timer keeps running and your saved files stay in the workspace.
        </p>
      </BriefSection>

      <BriefSection title="Submission requirements" compact={compact} id={`${idBase}-submission`}>
        <div className="grid gap-3">
          {task.submission.requirements.length ? <List items={task.submission.requirements} compact={compact} /> : null}
          {task.submission.handoffPrompts.length ? (
            <div className="grid gap-2">
              <h3 className={cn("font-medium text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>Handoff questions you answer when you submit</h3>
              <List items={task.submission.handoffPrompts.map((p) => p.label)} compact={compact} />
            </div>
          ) : null}
        </div>
      </BriefSection>

      {teammates.length ? (
        <BriefSection title="Simulated teammates" compact={compact} id={`${idBase}-team`}>
          <p className={cn("text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>
            {messagingAvailable
              ? "These teammates are simulated. You can message them from the Team panel. Each knows about their own area and none of them will edit your files."
              : "Messaging is not available for this task. Work from the brief, and state any assumption in your handoff."}
          </p>
          <ul className="grid gap-3">
            {teammates.map((t) => (
              <li key={`${t.name}-${t.title}`} className="grid gap-1 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5">
                <p className={cn(compact ? "text-[13px]" : "text-[15px]")}>
                  <span className="font-medium text-[var(--text-primary)]">{t.name}</span>
                  <span className="text-[var(--text-secondary)]">, {t.title}</span>
                </p>
                {t.responsibilities ? <p className={cn("text-[var(--text-secondary)]", compact ? "text-[12.5px]" : "text-[14px]")}>{t.responsibilities}</p> : null}
                {t.topics.length ? (
                  <p className={cn("text-[var(--text-tertiary)]", compact ? "text-[12px]" : "text-[13px]")}>Can talk about: {t.topics.join(", ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </BriefSection>
      ) : null}
    </div>
  );
}
