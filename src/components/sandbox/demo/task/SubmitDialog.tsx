"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import type { FileDiff } from "@/lib/sandbox-demo/diff";
import { RUN_LOCATION_LABEL } from "@/lib/sandbox-demo/runner";
import { HANDOFF_FIELDS, HANDOFF_PROMPTS, hasHandoff, type Handoff, type HandoffField } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";
import { formatClock } from "@/components/simulations/workspace/lib";
import { RunHeadline } from "./TaskPanels";

const HELP: Record<HandoffField, string> = {
  changed: "The behaviour you changed and where, in a sentence or two.",
  checked: "Tests you ran, cases you tried by hand, anything you read.",
  unresolved: "Risks, tradeoffs or questions you would raise with the team.",
};

const field =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] disabled:opacity-60";

function Card({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
      <h2 id={id} className="text-[15px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Review before submitting, in the shape of the production review screen:
 * handoff answers on the left; what changed, the latest run and what is kept
 * on the right. Submitting runs the public and protected tests in the browser.
 */
export function SubmitDialog({
  scenario,
  diffs,
  run,
  handoff,
  teamCount,
  submitting,
  error,
  onHandoff,
  onOpenDiff,
  onSubmit,
  onClose,
  consequence,
}: {
  scenario: DemoScenario;
  diffs: FileDiff[];
  run: RunRecord | null;
  handoff: Handoff;
  teamCount: number;
  submitting: boolean;
  error: string | null;
  onHandoff: (field: HandoffField, value: string) => void;
  onOpenDiff: (path: string) => void;
  /** Where the submission goes, when it is not the public preview's browser-only report. */
  consequence?: { confirm: string; kept: string };
  onSubmit: () => void;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirming, setConfirming] = useState(false);
  const answered = hasHandoff(handoff);

  useEffect(() => {
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="demo-review-title" className="fixed inset-0 z-[70] flex flex-col bg-[var(--surface-canvas)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <ArrowLeft aria-hidden size={15} />
          Back to workspace
        </button>
        <h1 id="demo-review-title" ref={heading} tabIndex={-1} className="text-[14px] font-semibold text-[var(--text-primary)] outline-none">
          Review submission
        </h1>
      </header>

      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid content-start gap-6">
            <section aria-labelledby="demo-handoff-title" className="grid gap-5">
              <div className="grid gap-1">
                <h2 id="demo-handoff-title" className="text-[18px] font-semibold text-[var(--text-primary)]">
                  Handoff
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Write as you would to a colleague picking this up tomorrow. Short and specific is fine. The reviewer reads this as written; it is not scored.
                </p>
              </div>
              {HANDOFF_FIELDS.map((f) => (
                <div key={f} className="grid gap-1.5">
                  <label htmlFor={`demo-handoff-${f}`} className="text-[15px] font-medium text-[var(--text-primary)]">
                    {HANDOFF_PROMPTS[f]}
                  </label>
                  <p id={`demo-handoff-${f}-help`} className="text-[13px] text-[var(--text-secondary)]">
                    {HELP[f]}
                  </p>
                  <textarea
                    id={`demo-handoff-${f}`}
                    aria-describedby={`demo-handoff-${f}-help`}
                    rows={4}
                    maxLength={4000}
                    value={handoff[f]}
                    disabled={submitting}
                    onChange={(e) => onHandoff(f, e.target.value)}
                    className={field}
                  />
                </div>
              ))}
            </section>

            {error ? (
              <p role="alert" className="rounded-[8px] bg-[var(--sim-error-bg)] px-3 py-2 text-[14px] text-[var(--sim-error)]">
                {error}
              </p>
            ) : null}

            {confirming ? (
              <div className="grid gap-3 rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-panel)] p-4">
                <p className="text-[15px] text-[var(--text-primary)]">
                  {consequence?.confirm ??
                    "Submit now? The public and protected tests run on your files in this browser as a preview, then your report opens. You can come back and submit again."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={onSubmit} loading={submitting}>
                    {submitting ? "Running all tests" : "Submit and open report"}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                    Keep working
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => setConfirming(true)} disabled={!answered}>
                  Submit
                </Button>
                {!answered ? <p className="text-[13px] text-[var(--text-secondary)]">Answer at least one handoff question to submit.</p> : null}
              </div>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <Card title="Files changed from the starter" id="demo-review-files">
              {diffs.length ? (
                <ul className="grid gap-0.5">
                  {diffs.map((d) => (
                    <li key={d.path}>
                      <button
                        type="button"
                        onClick={() => onOpenDiff(d.path)}
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-app-meta text-[var(--text-primary)] underline-offset-2 hover:underline">{d.path}</span>
                        <span className="shrink-0 text-app-meta text-[var(--text-tertiary)]">Edited</span>
                        <span className="shrink-0 font-mono text-app-marker tabular-nums">
                          <span className="text-[var(--sim-success)]">+{d.added}</span> <span className="text-[var(--sim-error)]">-{d.removed}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13.5px] text-[var(--text-secondary)]">No files differ from the starter yet. You can still submit; the report will say there is nothing to assess.</p>
              )}
            </Card>

            <Card title="Latest public test run" id="demo-review-tests">
              {run ? (
                <div className="grid gap-1.5">
                  <RunHeadline scenario={scenario} run={run} />
                  <p className="text-app-meta text-[var(--text-tertiary)]">
                    {RUN_LOCATION_LABEL}, {formatClock(run.at)}
                  </p>
                </div>
              ) : (
                <p className="text-[13.5px] text-[var(--text-secondary)]">You have not run the public tests. That is fine; every test runs when you submit.</p>
              )}
            </Card>

            <Card title="What the report includes" id="demo-review-receives">
              <ul className="grid list-disc gap-1.5 pl-5 text-[13.5px] leading-[1.55] text-[var(--text-body)] marker:text-[var(--text-quaternary)]">
                <li>Your edited files, compared with the starter</li>
                <li>Results of the public and protected tests, run in your browser when you submit</li>
                <li>Your handoff answers, shown as written</li>
                <li>
                  The team thread ({teamCount} {teamCount === 1 ? "message" : "messages"}), with check-ins labelled
                </li>
              </ul>
              <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">
                {consequence?.kept ??
                  "A browser preview, saved in this browser only. Nothing is sent to an employer. A real assessment runs in the Fydell desktop app, where results come from the isolated runner rather than the browser."}
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
