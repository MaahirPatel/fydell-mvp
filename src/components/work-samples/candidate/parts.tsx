import type { ScenarioPackage } from "@/lib/eng/authoring/package";
import { cn } from "@/lib/cn";

/**
 * Candidate-facing presentation of a ScenarioPackage. Pure components with no
 * client state, shared by the employer preview and the candidate runtime.
 * They read only candidate-visible fields of the package.
 */

export function CandidateSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0", className)}>
      <h2 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.01em] text-[var(--text-primary)]">{title}</h2>
      <div className="mt-2.5 text-[15px] leading-[1.6] text-[var(--text-body)]">{children}</div>
    </section>
  );
}

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className={cn("whitespace-pre-line", i > 0 && "mt-2.5")}>
          {p}
        </p>
      ))}
    </>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <ul className="grid list-disc gap-1.5 pl-5 marker:text-[var(--text-tertiary)]">
      {clean.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function CandidateBrief({ pkg }: { pkg: ScenarioPackage }) {
  const b = pkg.brief;
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.015em] text-[var(--text-primary)]">{b.title}</h1>
        {b.summary ? <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">{b.summary}</p> : null}
      </header>
      {b.context ? (
        <CandidateSection title="Context">
          <Paragraphs text={b.context} />
        </CandidateSection>
      ) : null}
      {b.task ? (
        <CandidateSection title="Your task">
          <Paragraphs text={b.task} />
        </CandidateSection>
      ) : null}
      {b.outcomes.some((o) => o.trim()) ? (
        <CandidateSection title="Required outcomes">
          <Bullets items={b.outcomes} />
        </CandidateSection>
      ) : null}
      {b.constraints.some((o) => o.trim()) ? (
        <CandidateSection title="Constraints">
          <Bullets items={b.constraints} />
        </CandidateSection>
      ) : null}
      {b.outOfScope.some((o) => o.trim()) ? (
        <CandidateSection title="Out of scope">
          <Bullets items={b.outOfScope} />
        </CandidateSection>
      ) : null}
      {b.optionalExtensions.some((o) => o.trim()) ? (
        <CandidateSection title="If you have time">
          <Bullets items={b.optionalExtensions} />
        </CandidateSection>
      ) : null}
    </div>
  );
}

export function CandidateInterface({ pkg }: { pkg: ScenarioPackage }) {
  if (!pkg.brief.interface.trim()) return null;
  return (
    <CandidateSection title="Interface">
      <pre className="overflow-x-auto whitespace-pre rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-code)] px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-[var(--text-primary)]">
        {pkg.brief.interface}
      </pre>
    </CandidateSection>
  );
}

export function CandidateAcceptanceCriteria({ pkg }: { pkg: ScenarioPackage }) {
  if (pkg.acceptanceCriteria.length === 0) return null;
  return (
    <CandidateSection title="Acceptance criteria">
      <ol className="grid gap-2">
        {pkg.acceptanceCriteria.map((ac) => (
          <li key={ac.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
            <span className="font-mono text-[13px] leading-[1.75] text-[var(--text-tertiary)]">{ac.id}</span>
            <span>{ac.text}</span>
          </li>
        ))}
      </ol>
    </CandidateSection>
  );
}

function Commands({ commands }: { commands: string[] }) {
  const clean = commands.filter((c) => c.trim());
  if (clean.length === 0) return null;
  return (
    <pre className="mt-2.5 overflow-x-auto whitespace-pre rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-code)] px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-[var(--text-primary)]">
      {clean.join("\n")}
    </pre>
  );
}

export function CandidateSetup({ pkg }: { pkg: ScenarioPackage }) {
  const env = pkg.environment;
  return (
    <CandidateSection title="Setup">
      <p>
        Setup takes up to {env.setupMinutes} minutes and is not counted in your task time.
      </p>
      {pkg.setupInstructions.some((s) => s.trim()) ? (
        <ol className="mt-2.5 grid list-decimal gap-1.5 pl-5 marker:text-[var(--text-tertiary)]">
          {pkg.setupInstructions.filter((s) => s.trim()).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}
      <Commands commands={env.setupCommands} />
      {env.testCommand.trim() ? (
        <div className="mt-3">
          <p className="text-[14px] text-[var(--text-secondary)]">Run the tests with</p>
          <Commands commands={[env.testCommand]} />
        </div>
      ) : null}
    </CandidateSection>
  );
}

export function CandidateTime({ pkg }: { pkg: ScenarioPackage }) {
  const env = pkg.environment;
  return (
    <CandidateSection title="Time">
      <p>
        {env.taskMinutes} minutes for the task, plus up to {env.setupMinutes} minutes of setup before the timer starts.
      </p>
      {pkg.interruptionPolicy.trim() ? <p className="mt-2">{pkg.interruptionPolicy}</p> : null}
    </CandidateSection>
  );
}

export function CandidateAiPolicy({ pkg }: { pkg: ScenarioPackage }) {
  return (
    <CandidateSection title="AI tools">
      <p>{pkg.aiPolicy.candidateText}</p>
    </CandidateSection>
  );
}

export function CandidateSubmission({ pkg }: { pkg: ScenarioPackage }) {
  const s = pkg.submission;
  return (
    <CandidateSection title="What to submit">
      <Bullets items={s.requirements} />
      {s.handoffPrompts.length ? (
        <div className="mt-3">
          <p className="text-[14px] text-[var(--text-secondary)]">Your handoff note answers:</p>
          <ul className="mt-1.5 grid gap-2">
            {s.handoffPrompts.map((h) => (
              <li key={h.id}>
                <span className="font-medium text-[var(--text-primary)]">{h.label}</span>
                {h.help ? <span className="block text-[14px] text-[var(--text-secondary)]">{h.help}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pkg.feedbackPolicy.trim() ? <p className="mt-3">{pkg.feedbackPolicy}</p> : null}
    </CandidateSection>
  );
}

export function CandidateAccommodations({ pkg }: { pkg: ScenarioPackage }) {
  if (!pkg.accommodations.some((a) => a.trim())) return null;
  return (
    <CandidateSection title="Accommodations">
      <Bullets items={pkg.accommodations} />
    </CandidateSection>
  );
}

/** Coworkers by name and title only. Their facts and boundaries are evaluator material. */
export function CandidateCoworkers({ pkg }: { pkg: ScenarioPackage }) {
  if (pkg.coworkers.length === 0) return null;
  return (
    <CandidateSection title="People you can message">
      <ul className="grid gap-1.5">
        {pkg.coworkers.map((c) => (
          <li key={c.id}>
            <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
            <span className="text-[var(--text-secondary)]">, {c.title}</span>
          </li>
        ))}
      </ul>
    </CandidateSection>
  );
}
