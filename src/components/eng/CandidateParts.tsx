import type { ReactNode } from "react";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/cn";
import { EvidenceRail, type RailStep } from "@/components/evidence/Evidence";

export const RECORDED_ITEMS = [
  "Your messages in the team thread and when you sent them.",
  "The setup result you paste, when you start, and when you submit.",
  "Your uploaded ZIP and your handoff answers.",
  "Fydell does not see your screen, editor, files or AI tools. Anything you say about them is recorded as your statement.",
  "Your ZIP is tested in an isolated environment. People on the hiring team review the results and make any decision; Fydell does not.",
];

export const JOURNEY = ["invitation", "setup", "work", "submit", "review"] as const;
export type JourneyStage = (typeof JOURNEY)[number];

const JOURNEY_COPY: Record<JourneyStage, { label: string; done: string; current: string; pending: string }> = {
  invitation: { label: "Invitation", done: "Accepted", current: "Waiting on you", pending: "From the employer" },
  setup: { label: "Setup", done: "Confirmed", current: "Not timed", pending: "Not timed" },
  work: { label: "Work", done: "Finished", current: "Timer running", pending: "Timed" },
  submit: { label: "Submit", done: "Sealed", current: "ZIP and handoff", pending: "ZIP and handoff" },
  review: { label: "Review", done: "Reviewed", current: "With the team", pending: "Hiring team" },
};

/** The five stages every engineering task moves through, in the shared rail. */
export function journeySteps(at: JourneyStage, opts: { complete?: boolean; value?: string } = {}): RailStep[] {
  const index = JOURNEY.indexOf(at);
  return JOURNEY.map((stage, i) => {
    const copy = JOURNEY_COPY[stage];
    const done = i < index || (i === index && Boolean(opts.complete));
    const current = i === index && !done;
    return {
      label: copy.label,
      value: current && opts.value ? opts.value : done ? copy.done : current ? copy.current : copy.pending,
      state: done ? "done" : current ? "current" : "pending",
    };
  });
}

export function JourneyRail({ at, complete, value }: { at: JourneyStage; complete?: boolean; value?: string }) {
  return <EvidenceRail steps={journeySteps(at, { complete, value })} />;
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-2" style={{ gap: 1 }}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-[var(--surface-raised)] px-4 py-3">
          <dt className="text-[13px] font-medium text-[var(--text-tertiary)]">{item.label}</dt>
          <dd className="mt-1 text-app-body leading-[1.55] text-[var(--text-primary)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-t border-[var(--border-subtle)] py-2.5 first:border-t-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-control)] text-app-body text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fydell-brand-blue)] [&::-webkit-details-marker]:hidden">
        {summary}
        <span aria-hidden className="text-[var(--text-tertiary)] transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{children}</div>
    </details>
  );
}

export function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-2 leading-[1.6]", className)}>
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2">
          <span aria-hidden className="mt-[0.7em] h-px w-2.5 bg-[var(--fy-accent)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PolicyDisclosures({ aiPolicy, accommodations }: { aiPolicy: string[]; accommodations: string[] }) {
  return (
    <div>
      <Disclosure summary="Allowed tools and AI use">
        <BulletList items={aiPolicy} />
      </Disclosure>
      <Disclosure summary="What Fydell records">
        <BulletList items={RECORDED_ITEMS} />
      </Disclosure>
      <Disclosure summary="Accessibility, extensions and support">
        <BulletList items={accommodations} />
        <p className="mt-2">
          Support:{" "}
          <a href={CONTACT_MAILTO} className="text-[var(--text-primary)] underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Disclosure>
    </div>
  );
}

export function EnvironmentList({ environments }: { environments: { label: string; status: "validated" | "expected" | "unsupported"; note: string }[] }) {
  const tag = { validated: "Confirmed", expected: "Should work", unsupported: "Not supported" } as const;
  return (
    <ul className="grid divide-y divide-[var(--border-subtle)] text-app-meta text-[var(--text-secondary)]">
      {environments.map((env) => (
        <li key={env.label} className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[200px_110px_minmax(0,1fr)] sm:gap-4">
          <span className="font-medium text-[var(--text-primary)]">{env.label}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              env.status === "validated" ? "text-[var(--fy-green-ink)]" : env.status === "unsupported" ? "text-[var(--fy-red-ink)]" : "text-[var(--text-secondary)]"
            )}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {tag[env.status]}
          </span>
          <span>{env.note}</span>
        </li>
      ))}
    </ul>
  );
}
