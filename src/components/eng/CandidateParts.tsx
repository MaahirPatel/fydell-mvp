import type { ReactNode } from "react";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/cn";

export const RECORDED_ITEMS = [
  "Your messages in the team thread and when you sent them.",
  "The setup result you paste, when you start, and when you submit.",
  "Your uploaded ZIP and your handoff answers.",
  "Fydell does not see your screen, editor, files or AI tools. Anything you say about them is recorded as your statement.",
  "Your ZIP is tested in an isolated environment. People on the hiring team review the results and make any decision; Fydell does not.",
];

const STAGES = ["Invitation", "Setup", "Start"] as const;
export type Stage = (typeof STAGES)[number];

export function StageProgress({ current }: { current: Stage }) {
  const index = STAGES.indexOf(current);
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-app-meta">
      {STAGES.map((stage, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={stage} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums",
                active
                  ? "bg-[var(--fydell-brand-blue)] text-white"
                  : done
                    ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                    : "border border-[var(--border-default)] text-[var(--text-tertiary)]"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{stage}</span>
            {i < STAGES.length - 1 ? <span aria-hidden className="mx-1 h-px w-6 bg-[var(--border-default)]" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-app-meta text-[var(--text-tertiary)]">{item.label}</dt>
          <dd className="mt-0.5 text-app-body text-[var(--text-primary)]">{item.value}</dd>
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
    <ul className={cn("grid list-disc gap-1.5 pl-4 leading-[1.6]", className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
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
    <ul className="grid gap-1.5 text-app-meta text-[var(--text-secondary)]">
      {environments.map((env) => (
        <li key={env.label}>
          <span className="text-[var(--text-primary)]">{env.label}</span> · {tag[env.status]}. {env.note}
        </li>
      ))}
    </ul>
  );
}
