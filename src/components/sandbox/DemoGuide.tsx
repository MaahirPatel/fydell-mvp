"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, RotateCcw, X } from "lucide-react";

/** Steps in the Applied AI proof sequence the guide walks through. */
const GUIDE_TOTAL = 6;

export type GuideStep = {
  step: number;
  title: string;
  body: string;
  nextLabel: string;
  nextHref: string;
  candidateHref?: string;
  restart?: boolean;
  returnHref?: string;
};

export function DemoGuide({
  guide,
  onDismiss,
  onRestart,
}: {
  guide: GuideStep;
  onDismiss: () => void;
  onRestart?: () => void;
}) {
  return (
    <aside
      aria-label="Demo guide"
      className="pointer-events-auto fixed bottom-5 right-5 z-40 w-[268px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <p className="text-app-meta text-[var(--text-tertiary)]">
          Demo guide · {guide.step} of {GUIDE_TOTAL}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss demo guide"
          className="ml-auto text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div className="mt-2.5 flex gap-1" aria-hidden>
        {Array.from({ length: GUIDE_TOTAL }, (_, index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full"
            style={{
              background: index < guide.step ? "var(--fydell-evidence)" : "var(--border-default)",
            }}
          />
        ))}
      </div>

      <p className="mt-3 text-app-body font-medium">{guide.title}</p>
      <p className="mt-1.5 text-app-meta text-[var(--text-secondary)]">{guide.body}</p>

      {guide.candidateHref ? (
        <Link
          href={guide.candidateHref}
          className="mt-3 inline-flex items-center gap-1.5 text-app-meta"
          style={{ color: "var(--action-ink)" }}
        >
          Open candidate view
          <ExternalLink className="h-3 w-3" strokeWidth={1.7} aria-hidden />
        </Link>
      ) : null}

      {guide.restart ? (
        <button
          type="button"
          onClick={onRestart}
          className="mt-3.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-body font-medium text-[var(--control-solid-ink)]"
        >
          {guide.nextLabel}
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      ) : (
        <Link
          href={guide.nextHref}
          className="mt-3.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-body font-medium text-[var(--control-solid-ink)]"
        >
          {guide.nextLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </Link>
      )}

      {guide.returnHref ? (
        <Link
          href={guide.returnHref}
          className="mt-2.5 block text-center text-app-meta"
          style={{ color: "var(--action-ink)" }}
        >
          Return to overview
        </Link>
      ) : null}
    </aside>
  );
}

export const GUIDE_BY_SURFACE: Record<string, GuideStep> = {
  work: {
    step: 4,
    title: "Close the proof gaps",
    body: "Inspect a failed trace, change the executable config and eval coverage, then measure the result against the released latency constraint.",
    nextLabel: "Continue to evidence",
    nextHref: "/sandbox/evidence",
    candidateHref: "/sandbox/roles",
  },
  evidence: {
    step: 5,
    title: "Trace each claim to its sources",
    body: "Every claim keeps its supporting and counterevidence events, so a reader can check what was observed and what was not.",
    nextLabel: "Open work receipt",
    nextHref: "/sandbox/receipts",
    candidateHref: "/sandbox/work",
  },
  receipt: {
    step: 6,
    title: "Portable receipt",
    body: "Reviewed claims, measured snapshots, and stated limits travel together with an integrity hash.",
    nextLabel: "Restart demo",
    nextHref: "/sandbox",
    restart: true,
    returnHref: "/sandbox",
  },
};
