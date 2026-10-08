import { CircleAlert, CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PublicRunView, TestOutcomeView } from "@/lib/eng/authored/types";
import { RUN_STATUS_LABEL, runTally } from "./lib";

const OUTCOME_LABEL: Record<TestOutcomeView, string> = {
  passed: "Passed",
  failed: "Failed",
  error: "Error",
  skipped: "Skipped",
  missing: "Did not run",
};

export function OutcomeIcon({ outcome }: { outcome: TestOutcomeView }) {
  if (outcome === "passed") return <CircleCheck aria-hidden size={15} className="shrink-0 text-[var(--sim-success)]" />;
  if (outcome === "failed" || outcome === "error") return <CircleX aria-hidden size={15} className="shrink-0 text-[var(--sim-error)]" />;
  if (outcome === "missing") return <CircleAlert aria-hidden size={15} className="shrink-0 text-[var(--sim-attention)]" />;
  return <CircleMinus aria-hidden size={15} className="shrink-0 text-[var(--text-tertiary)]" />;
}

/** One line describing a run. Green only when the runner reported every public test passing. */
export function RunHeadline({ run, className }: { run: PublicRunView; className?: string }) {
  const t = runTally(run);
  const tone = run.status === "ran" ? (t.allPassed ? "success" : t.failed > 0 ? "error" : "neutral") : run.status === "running" ? "neutral" : "attention";
  const text =
    run.status === "ran"
      ? t.total
        ? `${t.passed} of ${t.total} public tests passed`
        : "The runner reported no individual test results"
      : RUN_STATUS_LABEL[run.status];
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-[13.5px] font-medium",
        tone === "success" && "text-[var(--sim-success)]",
        tone === "error" && "text-[var(--sim-error)]",
        tone === "attention" && "text-[var(--sim-attention)]",
        tone === "neutral" && "text-[var(--text-primary)]",
        className,
      )}
    >
      {tone === "success" ? <CircleCheck aria-hidden size={15} /> : tone === "error" ? <CircleX aria-hidden size={15} /> : tone === "attention" ? <CircleAlert aria-hidden size={15} /> : <CircleDashed aria-hidden size={15} />}
      {text}
    </p>
  );
}

export function TestList({ tests, onSelect }: { tests: PublicRunView["tests"]; onSelect?: (name: string) => void }) {
  if (!tests.length) return null;
  return (
    <ul className="grid">
      {tests.map((t) => (
        <li key={t.name}>
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(t.name)}
              className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left hover:bg-[var(--surface-hover)]"
            >
              <OutcomeIcon outcome={t.outcome} />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--text-body)]" title={t.name}>
                {t.name}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">{OUTCOME_LABEL[t.outcome]}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1">
              <OutcomeIcon outcome={t.outcome} />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--text-body)]" title={t.name}>
                {t.name}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">{OUTCOME_LABEL[t.outcome]}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
