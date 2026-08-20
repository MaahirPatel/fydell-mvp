"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, RotateCcw, X } from "lucide-react";
import { SAMPLE_GUIDE_TOTAL } from "./sample-artifacts";

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
          Demo guide · {guide.step} of {SAMPLE_GUIDE_TOTAL}
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
        {Array.from({ length: SAMPLE_GUIDE_TOTAL }, (_, index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full"
            style={{
              background: index < guide.step ? "var(--color-action)" : "var(--border-default)",
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
  simulation: {
    step: 4,
    title: "Review the revised rollout plan",
    body: "Verify the candidate updated the plan to respect the security constraint while keeping adoption sizing unverified.",
    nextLabel: "Continue to oral defense",
    nextHref: "/sandbox/evidence",
    candidateHref: "/sandbox/work",
  },
  evidence: {
    step: 7,
    title: "Trace the claim to its sources",
    body: "Explore the evidence lineage to see how each source supports, limits, or counters the claim.",
    nextLabel: "Open work receipt",
    nextHref: "/sandbox/receipts",
    candidateHref: "/sandbox/work",
  },
  receipt: {
    step: 8,
    title: "Receipt issued",
    body: "You followed Candidate 01 from work to evidence to a portable receipt.",
    nextLabel: "Restart demo",
    nextHref: "/sandbox",
    restart: true,
    returnHref: "/sandbox",
  },
};
