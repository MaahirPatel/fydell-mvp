import { Check } from "lucide-react";
import type { SampleStepState } from "./sample-artifacts";

const TONE_COLOR = {
  good: "var(--color-good)",
  changed: "var(--color-changed)",
  risk: "var(--color-risk)",
  evidence: "var(--color-evidence)",
} as const;

export function StatusDot({ tone, label }: { tone: keyof typeof TONE_COLOR; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-app-meta text-[var(--text-secondary)]">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
      {label}
    </span>
  );
}

export function Stepper({
  steps,
  className = "",
}: {
  steps: Array<{ label: string; state: SampleStepState }>;
  className?: string;
}) {
  return (
    <ol className={`flex items-start ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = step.state === "done";
        const current = step.state === "current";
        return (
          <li key={step.label} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-2">
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium"
                style={
                  done
                    ? { background: "var(--color-good)", borderColor: "var(--color-good)", color: "#08090a" }
                    : current
                      ? { background: "var(--color-good)", borderColor: "var(--color-good)", color: "#08090a" }
                      : { borderColor: "var(--border-strong)", color: "var(--text-tertiary)" }
                }
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : index + 1}
              </span>
              <span
                className={`truncate text-app-meta ${
                  current ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast ? (
              <span
                aria-hidden
                className="mt-3 h-px min-w-4 flex-1"
                style={{ background: done ? "var(--color-good)" : "var(--border-default)" }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function TimelineMarker({ state, last }: { state: SampleStepState; last: boolean }) {
  return (
    <span className="flex flex-col items-center">
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={
          state === "done"
            ? { background: "var(--color-good)", borderColor: "var(--color-good)", color: "#08090a" }
            : state === "current"
              ? { borderColor: "var(--color-evidence)", color: "var(--color-evidence)" }
              : { borderColor: "var(--border-strong)", color: "var(--text-tertiary)" }
        }
      >
        {state === "done" ? (
          <Check className="h-3 w-3" strokeWidth={2.4} />
        ) : state === "current" ? (
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-evidence)" }} />
        ) : (
          <span className="h-px w-2" style={{ background: "var(--text-tertiary)" }} />
        )}
      </span>
      {!last ? <span aria-hidden className="w-px flex-1" style={{ background: "var(--border-default)" }} /> : null}
    </span>
  );
}
