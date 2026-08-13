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
    "inline-flex h-8 shrink-0 items-center rounded-[8px] bg-[#eceef1] px-3.5 text-[13px] font-medium text-[#0a0b0d] transition-colors hover:bg-white";

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

export default function SetupPath({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0"
        >
          <span
            aria-hidden
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium tabular-nums ${
              step.state === "done"
                ? "border-[rgba(103,217,160,0.4)] text-[var(--fydell-good)]"
                : step.state === "current"
                  ? "border-[var(--border-strong)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-tertiary)]"
            }`}
          >
            {step.state === "done" ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              i + 1
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p
              className={`text-[14px] font-medium ${
                step.state === "upcoming"
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {step.title}
            </p>
            <p
              className={`mt-0.5 text-[13px] leading-[1.55] ${
                step.state === "upcoming"
                  ? "text-[var(--text-tertiary)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {step.description}
            </p>
          </div>

          {step.state === "current" && step.action ? (
            <StepAction action={step.action} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
