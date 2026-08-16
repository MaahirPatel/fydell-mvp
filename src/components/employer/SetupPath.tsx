"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useInviteModal } from "./InviteCandidateModal";

/**
 * The first-run path, as one object with hairline-separated rows.
 *
 * This replaced a row of four cards each showing the number zero, which
 * reported the absence of data instead of telling a new workspace what to do.
 */
export type SetupStep = {
  title: string;
  description: string;
  state: "done" | "current" | "upcoming";
  action?: { label: string; href?: string; invite?: boolean };
};

function StepAction({ action }: { action: NonNullable<SetupStep["action"]> }) {
  const { open } = useInviteModal();
  const className =
    "inline-flex h-8 shrink-0 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--control-solid-hover)] active:bg-[var(--control-solid-active)]";

  if (action.invite) {
    return (
      <button type="button" onClick={() => open()} className={className}>
        {action.label}
      </button>
    );
  }
  return (
    <Link href={action.href ?? "#"} className={className}>
      {action.label}
    </Link>
  );
}

/**
 * Renders inside a Panel section, so it carries no frame of its own. The
 * current step gets a raised band and the only action, because a checklist
 * where every row is equally loud is a list, not a path.
 */
export default function SetupPath({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
      {steps.map((step, i) => {
        const current = step.state === "current";
        return (
          <li
            key={step.title}
            aria-current={current ? "step" : undefined}
            className={`flex items-center gap-3.5 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 ${
              current ? "bg-[var(--surface-panel)]" : ""
            }`}
          >
            <span
              aria-hidden
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[11.5px] font-medium tabular-nums ${
                step.state === "done"
                  ? "border-[color-mix(in_srgb,var(--fydell-good)_45%,transparent)] text-[var(--fydell-good)]"
                  : current
                    ? "border-[var(--border-strong)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] text-[var(--text-tertiary)]"
              }`}
            >
              {step.state === "done" ? (
                <Check className="h-3 w-3" strokeWidth={2.4} />
              ) : (
                i + 1
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`text-app-body font-medium ${
                  step.state === "upcoming"
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {step.title}
              </p>
              <p
                className={`mt-0.5 text-app-meta leading-[1.5] ${
                  step.state === "upcoming"
                    ? "text-[var(--text-tertiary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {step.description}
              </p>
            </div>

            {current && step.action ? <StepAction action={step.action} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
