"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, FileCheck2, GitBranch, MessageSquare } from "lucide-react";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import { ExecutionResults } from "./CodeWorkspace";

type Tab = "brief" | "lineage" | "plan";
type ReviewDecision = "approve" | "limit" | "follow_up" | "reject";

export function SandboxEvidence({
  session,
  busy,
  onAction,
}: {
  session: SandboxSessionView | null;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [tab, setTab] = useState<Tab>("brief");
  const passBClaims = session?.claims.filter((claim) => claim.pass === "B") ?? [];

  if (!session || !session.brief) {
    return (
      <section className="mx-auto max-w-[760px] py-10">
        <FileCheck2 className="h-5 w-5 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
        <h1 className="mt-4 text-app-page">Evidence is created from completed work</h1>
        <p className="mt-2 max-w-[68ch] text-app-body text-[var(--text-secondary)]">
          Complete the Applied AI episode and defense first. This page will then show measured claims, source events,
          review state, the decision brief, and the interview plan. No sample evidence is shown.
        </p>
        <Link
          href="/sandbox/work"
          className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
        >
          Continue the work episode
        </Link>
      </section>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "brief", label: "Decision brief" },
    { id: "lineage", label: "Evidence lineage" },
    { id: "plan", label: "Interview plan" },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-app-page">Applied AI evidence</h1>
          <p className="mt-2 text-app-body text-[var(--text-secondary)]">
            {session.fixture.candidate.label} · {session.fixture.role.title} · {passBClaims.length} Pass B claims
          </p>
          <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{session.labels.banner}</p>
        </div>
        <div className="text-right">
          <p className="text-app-meta text-[var(--text-tertiary)]">Review state</p>
          <p className="mt-1 text-app-body font-medium">
            {session.reviewKind === "none" ? "Explicit review required" : session.labels.review}
          </p>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
            Brief {session.brief.published ? "published" : "unpublished"}
          </p>
        </div>
      </div>

      {session.workspace.codeExecution ? <section className="mt-5 max-w-xl rounded-lg border border-[var(--border-default)] p-5"><h2 className="text-app-section">Code execution evidence</h2><p className="mt-2 text-app-meta text-[var(--text-secondary)]">Results for the saved Python snapshot. These are separate from synthetic configuration metrics and do not establish overall engineering ability.</p><ExecutionResults result={session.workspace.codeExecution} /></section> : null}
      <div role="tablist" aria-label="Evidence views" className="mt-5 flex gap-6 border-b border-[var(--border-subtle)]">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={`-mb-px border-b-2 pb-2.5 text-app-body ${
              tab === entry.id
                ? "border-[var(--text-primary)] font-medium text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "brief" ? (
        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            {passBClaims.map((claim) => (
              <article key={claim.id} className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-app-meta">
                  <span className="font-mono text-[var(--text-tertiary)]">{claim.competency}</span>
                  <span
                    style={{
                      color:
                        claim.direction === "STRENGTH"
                          ? "var(--color-good)"
                          : claim.direction === "CONCERN"
                            ? "var(--color-risk)"
                            : "var(--color-changed)",
                    }}
                  >
                    {claim.direction.replaceAll("_", " ")}
                  </span>
                  <span className="text-[var(--text-tertiary)]">{claim.confidence} confidence</span>
                  <span className="ml-auto text-[var(--text-secondary)]">{claim.reviewStatus.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-2 max-w-[78ch] text-app-body text-[var(--text-primary)]">{claim.claim}</p>
              </article>
            ))}
          </div>
          <aside>
            <p className="text-app-meta text-[var(--text-tertiary)]">Pass B recommendation</p>
            <p className="mt-1 text-app-section font-medium">{session.brief.recommendation.replaceAll("_", " ")}</p>
            <p className="mt-3 text-app-body text-[var(--text-secondary)]">{session.brief.why}</p>
            <BriefList label="Strengths" items={session.brief.strengths} />
            <BriefList label="Concerns and limitations" items={session.brief.concerns} />
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <p className="flex items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
                <MessageSquare className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                Defense review
              </p>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                {session.defense?.answer
                  ? `Response recorded · session ${session.defense.status}`
                  : "No defense response has been recorded."}
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "lineage" ? (
        <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          {passBClaims.map((claim) => (
            <article key={claim.id} className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
              <p className="flex items-center gap-2 text-app-body font-medium">
                <GitBranch className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
                {claim.competency}
              </p>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">{claim.claim}</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <EventList label="Supporting events" events={claim.supportingEvents} tone="var(--color-good)" />
                <EventList label="Counterevidence events" events={claim.counterevidenceEvents} tone="var(--color-risk)" />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "plan" ? (
        session.interviewPlan ? (
          <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            <PlanSection label="Confirm" items={session.interviewPlan.confirm} />
            <PlanSection label="Investigate" items={session.interviewPlan.investigate} />
            <PlanSection label="Challenge" items={session.interviewPlan.challenge} />
          </div>
        ) : (
          <p className="mt-6 text-app-body text-[var(--text-secondary)]">The interview plan has not been generated yet.</p>
        )
      ) : null}

      {session.step === "review_pending" ? (
        <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-4 w-4 text-[var(--color-changed)]" strokeWidth={1.8} aria-hidden />
            <div>
              <h2 className="text-app-section">Record sandbox visitor review</h2>
              <p className="mt-1 max-w-[75ch] text-app-body text-[var(--text-secondary)]">
                Approval publishes eligible claims and this fictional decision brief. Limit and follow-up record review
                without approval. Reject marks all Pass B claims rejected. This is not a Fydell hiring decision.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ["approve", "Approve and publish"],
              ["limit", "Review with limits"],
              ["follow_up", "Require follow-up"],
              ["reject", "Reject claims"],
            ] as const).map(([decision, label]) => (
              <ReviewButton
                key={decision}
                decision={decision}
                label={label}
                busy={busy}
                onAction={onAction}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-7 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-5 text-app-body text-[var(--text-secondary)]">
          <Check className="h-4 w-4 text-[var(--color-good)]" strokeWidth={2} aria-hidden />
          {session.labels.review ?? "Review has not started."}
        </p>
      )}
    </section>
  );
}

function ReviewButton({
  decision,
  label,
  busy,
  onAction,
}: {
  decision: ReviewDecision;
  label: string;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onAction({ type: "review", decision, idempotencyKey: `visitor-review:${decision}` })}
      className={`h-9 rounded-[var(--radius-control)] px-3.5 text-app-body font-medium disabled:opacity-40 ${
        decision === "approve"
          ? "bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
          : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {label}
    </button>
  );
}

function BriefList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-5">
      <p className="text-app-meta text-[var(--text-tertiary)]">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-app-body text-[var(--text-secondary)]">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function EventList({
  label,
  events,
  tone,
}: {
  label: string;
  events: Array<{ id: string; label: string }>;
  tone: string;
}) {
  return (
    <div>
      <p className="text-app-meta font-medium" style={{ color: tone }}>{label}</p>
      {events.length ? (
        <ul className="mt-2 space-y-1">
          {events.map((event) => (
            <li key={event.id} className="text-app-meta text-[var(--text-secondary)]">
              {event.label} · <span className="font-mono">{event.id}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">None recorded.</p>
      )}
    </div>
  );
}

function PlanSection({ label, items }: { label: string; items: string[] }) {
  return (
    <section className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
      <h2 className="text-app-section">{label}</h2>
      {items.length ? (
        <ol className="mt-3 space-y-2">
          {items.map((item) => <li key={item} className="text-app-body text-[var(--text-secondary)]">{item}</li>)}
        </ol>
      ) : (
        <p className="mt-2 text-app-body text-[var(--text-tertiary)]">No question derived for this category.</p>
      )}
    </section>
  );
}
