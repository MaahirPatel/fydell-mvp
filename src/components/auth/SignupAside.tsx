import { FileArchive, GitBranch, PenLine, Building2, ClipboardList, Send } from "lucide-react";
import { SAMPLE_PASSPORT } from "@/lib/marketing/sample-passport";
import { DEMO_LABEL } from "@/lib/marketing/demo-fixture";
import s from "./auth.module.css";

/**
 * The right column of signup: what the person will do in their first minute,
 * drawn with real product data. The engineer column renders a finding from
 * the public sample passport, labelled as example data. The hiring column
 * renders the task definition new roles actually use.
 */

type Step = { icon: typeof GitBranch; title: string; body: string };

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-6 grid gap-4">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-app-body font-medium text-[var(--text-primary)]">
              <span className="sr-only">Step {i + 1}: </span>
              {title}
            </p>
            <p className="mt-0.5 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const ENGINEER_STEPS: Step[] = [
  { icon: GitBranch, title: "Import a public GitHub repository", body: "Pick up to three. Fydell reads them at a pinned commit and never runs the code." },
  { icon: FileArchive, title: "Or upload a ZIP", body: "For work that isn't public. You see exactly which files will be read first." },
  { icon: PenLine, title: "Or describe a project", body: "No source needed. Your profile says plainly that nothing was analyzed." },
];

export function EngineerAside() {
  const project = SAMPLE_PASSPORT.projects[0];
  const finding = project.evidence[0];
  const shown = finding.excerpt.slice(0, 7);
  return (
    <div>
      <h2 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.018em] text-[var(--text-primary)]">
        Your first minute: add one project
      </h2>
      <p className="mt-2 max-w-[48ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
        Fydell reads it and cites what the code shows, line by line. Nothing is shared until you create a link, and you can revoke
        it any time.
      </p>
      <Steps steps={ENGINEER_STEPS} />

      <figure className={`${s.sheet} mt-8 overflow-hidden`} aria-label="Example finding from a Builder Report">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border-subtle)] px-4 py-2.5">
          <span className="font-mono text-[12px] text-[var(--text-primary)]">{finding.path}</span>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            lines {finding.startLine}–{finding.endLine}
          </span>
        </div>
        <div className={`${s.code} overflow-x-auto py-2`} aria-hidden>
          {shown.map((line, i) => (
            <div key={i} className={`${s.codeLine} ${i < 2 ? s.cited : ""} pr-4`}>
              <span>{(finding.startLine ?? 1) + i}</span>
              <span className="text-[var(--text-body)]">{line || " "}</span>
            </div>
          ))}
        </div>
        <figcaption className="border-t border-[var(--border-subtle)] px-4 py-3">
          <p className="text-app-meta leading-[1.55] text-[var(--text-primary)]">{finding.finding}</p>
          <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">Not checked: {finding.limitations[1] ?? finding.limitations[0]}</p>
        </figcaption>
        <div className={s.titleBlock}>
          <span>
            Builder Report · {project.repoFullName} @ {project.commitSha.slice(0, 7)}
          </span>
          <span>{DEMO_LABEL}</span>
        </div>
      </figure>
    </div>
  );
}

const EMPLOYER_STEPS: Step[] = [
  { icon: Building2, title: "Name your workspace", body: "You are the owner. Only people you invite can see it." },
  { icon: ClipboardList, title: "Create an engineering role", body: "Title, stack and what the work should show. It starts as a draft you can edit." },
  { icon: Send, title: "Publish it and invite a candidate", body: "By email, or by an engineer's @handle if they are already on Fydell." },
];

export type TaskSummary = {
  scenarioKey: string;
  version: number;
  title: string;
  summary: string;
  targetMinutes: number;
  allowedMinutes: number;
  stack: string[];
};

export function EmployerAside({ task }: { task: TaskSummary }) {
  return (
    <div>
      <h2 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.018em] text-[var(--text-primary)]">
        From signup to a first invitation
      </h2>
      <p className="mt-2 max-w-[48ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
        Three steps, each one a real action in your workspace. Your team reads the evidence and makes the decision.
      </p>
      <Steps steps={EMPLOYER_STEPS} />

      <figure className={`${s.sheet} mt-8 overflow-hidden`} aria-label="The task invited candidates receive">
        <div className="px-4 py-4">
          <p className="text-app-body font-medium text-[var(--text-primary)]">{task.title}</p>
          <p className="mt-1.5 text-app-meta leading-[1.6] text-[var(--text-secondary)]">{task.summary}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-3">
            <div className="min-w-0">
              <dt className="text-[12px] text-[var(--text-tertiary)]">Target effort</dt>
              <dd className="mt-0.5 text-app-meta tabular-nums text-[var(--text-primary)]">About {task.targetMinutes} min</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[12px] text-[var(--text-tertiary)]">Window</dt>
              <dd className="mt-0.5 text-app-meta tabular-nums text-[var(--text-primary)]">{task.allowedMinutes} min</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[12px] text-[var(--text-tertiary)]">Stack</dt>
              <dd className="mt-0.5 truncate text-app-meta text-[var(--text-primary)]" title={task.stack.join(", ")}>
                {task.stack[0] ?? "Python"}
              </dd>
            </div>
          </dl>
        </div>
        <div className={s.titleBlock}>
          <span>The task candidates receive</span>
          <span>
            {task.scenarioKey} v{task.version}
          </span>
        </div>
      </figure>
      <p className="mt-5 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
        Priced per completed simulation. Invitations and expired links are never billed.
      </p>
    </div>
  );
}
