import { PanelLabel, PanelSection } from "@/components/ui/Panel";
import { BulletList, Disclosure, Facts } from "@/components/eng/CandidateParts";
import { CommandBlock } from "@/components/eng/CommandBlock";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import type { CandidateTask } from "@/lib/eng/authored/types";

/**
 * Presentational views of an employer-authored task, taking only the
 * candidate payload. Kept free of state so they can be unified with the
 * creator's candidate preview later.
 */

function windowsCommand(command: string): string {
  return command.replace(/^python3 /, "python ");
}

export function TaskBriefSections({ task }: { task: CandidateTask }) {
  return (
    <>
      <PanelSection title="The task" description={task.summary}>
        <div className="grid gap-4 text-app-body leading-[1.65] text-[var(--text-body)]">
          {task.context ? <p className="whitespace-pre-wrap">{task.context}</p> : null}
          <p className="whitespace-pre-wrap text-[var(--text-primary)]">{task.task}</p>
          {task.outcomes.length ? (
            <div>
              <PanelLabel>What done looks like</PanelLabel>
              <BulletList className="mt-2 text-[var(--text-secondary)]" items={task.outcomes} />
            </div>
          ) : null}
          {task.constraints.length ? (
            <div>
              <PanelLabel>Constraints</PanelLabel>
              <BulletList className="mt-2 text-[var(--text-secondary)]" items={task.constraints} />
            </div>
          ) : null}
          {task.outOfScope.length ? (
            <div>
              <PanelLabel>Out of scope</PanelLabel>
              <BulletList className="mt-2 text-[var(--text-secondary)]" items={task.outOfScope} />
            </div>
          ) : null}
          {task.optionalExtensions.length ? (
            <div>
              <PanelLabel>Optional, if you have time</PanelLabel>
              <BulletList className="mt-2 text-[var(--text-secondary)]" items={task.optionalExtensions} />
            </div>
          ) : null}
        </div>
      </PanelSection>
      {task.interface.trim() ? (
        <PanelSection title="Interface" description="The public surface of the starter project. Keep it working unless the task says otherwise.">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-[var(--text-primary)]">
            {task.interface}
          </pre>
        </PanelSection>
      ) : null}
      <PanelSection title="Acceptance criteria" description="Tests check these. Some tests ship with the starter; others run only after you submit, and check the same criteria.">
        <ol className="grid gap-2">
          {task.acceptanceCriteria.map((ac) => (
            <li key={ac.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 text-app-body leading-[1.55]">
              <span className="font-mono text-app-meta text-[var(--text-tertiary)]">{ac.id}</span>
              <span className="text-[var(--text-primary)]">{ac.text}</span>
            </li>
          ))}
        </ol>
      </PanelSection>
    </>
  );
}

export function EnvironmentSection({ task, starterHref }: { task: CandidateTask; starterHref?: string }) {
  const env = task.environment;
  return (
    <PanelSection title="Setup and environment" description={`Setup is not timed. Allow about ${env.setupMinutes} minutes.`}>
      <div className="grid gap-4">
        <Facts
          items={[
            { label: "Required runtime", value: env.label },
            { label: "Packages", value: "Standard library only. Nothing to install from the network." },
            { label: "Work time", value: `About ${env.taskMinutes} minutes, from when you press Start` },
            { label: "Where you work", value: "In the editor on this page, or in your own editor with the starter download" },
          ]}
        />
        {task.setupInstructions.length ? (
          <div>
            <PanelLabel>Setup steps</PanelLabel>
            <BulletList className="mt-2 text-app-body text-[var(--text-secondary)]" items={task.setupInstructions} />
          </div>
        ) : null}
        {env.setupCommands.length ? (
          <div className="grid gap-2">
            <PanelLabel>Setup commands</PanelLabel>
            {env.setupCommands.map((c) => (
              <CommandBlock key={c} label="Setup command" commands={{ windows: windowsCommand(c), unix: c }} />
            ))}
          </div>
        ) : null}
        <div className="grid gap-2">
          <PanelLabel>Run the public tests locally</PanelLabel>
          <CommandBlock label="Public test command" commands={{ windows: windowsCommand(env.publicTestCommand), unix: env.publicTestCommand }} />
          {env.testCommand.trim() && env.testCommand.trim() !== env.publicTestCommand ? (
            <p className="text-app-meta text-[var(--text-secondary)]">
              The task author also suggests <code className="font-mono text-[var(--text-primary)]">{env.testCommand}</code>.
            </p>
          ) : null}
          {env.runtime === "python" ? <p className="text-app-meta text-[var(--text-tertiary)]">On Windows the command is usually python or py rather than python3.</p> : null}
        </div>
        {starterHref ? (
          <p className="text-app-body text-[var(--text-secondary)]">
            <a href={starterHref} className="font-medium text-[var(--text-primary)] underline underline-offset-2 hover:no-underline">
              Download the starter project (ZIP)
            </a>{" "}
            if you prefer your own editor. You can paste your changes back into the editor here before submitting.
          </p>
        ) : null}
      </div>
    </PanelSection>
  );
}

export function CoworkersSection({ task }: { task: CandidateTask }) {
  if (!task.coworkers.length) return null;
  return (
    <PanelSection title="People on this team" description="Messaging is not available for this task. Work from the brief; if something is unclear, state your assumption in the handoff.">
      <ul className="grid gap-3">
        {task.coworkers.map((c) => (
          <li key={`${c.name}-${c.title}`} className="text-app-body leading-[1.55]">
            <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
            <span className="text-[var(--text-secondary)]">, {c.title}</span>
            {c.responsibilities ? <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">{c.responsibilities}</p> : null}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

export function PoliciesSection({ task }: { task: CandidateTask }) {
  return (
    <PanelSection>
      <Disclosure summary="Allowed tools and AI use">
        <p className="whitespace-pre-wrap">{task.aiPolicy}</p>
      </Disclosure>
      <Disclosure summary="If you are interrupted or leave the page">
        <p className="whitespace-pre-wrap">{task.interruptionPolicy || "The timer keeps running while you are away. Your saved files stay in the workspace."}</p>
      </Disclosure>
      <Disclosure summary="What you will see afterwards">
        <p className="whitespace-pre-wrap">{task.feedbackPolicy}</p>
      </Disclosure>
      <Disclosure summary="How it is reviewed">
        <ul className="grid gap-2">
          {task.howReviewed.map((r) => (
            <li key={r.label}>
              <span className="font-medium text-[var(--text-primary)]">{r.label}</span>
              <span className="text-[var(--text-tertiary)]">{r.judgedBy === "tests" ? ", checked by tests" : ", judged by a reviewer"}</span>
              <p className="mt-0.5">{r.explanation}</p>
            </li>
          ))}
        </ul>
      </Disclosure>
      <Disclosure summary="Accessibility, extensions and support">
        {task.accommodations.length ? <BulletList items={task.accommodations} /> : null}
        <p className="mt-2">
          Support:{" "}
          <a href={CONTACT_MAILTO} className="text-[var(--text-primary)] underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Disclosure>
    </PanelSection>
  );
}
