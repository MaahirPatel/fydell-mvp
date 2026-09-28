"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, ReceiptText, TriangleAlert } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function SandboxWorkReceipt({
  session,
  receiptPayload,
  publicId: routePublicId,
}: {
  session: SandboxSessionView | null;
  receiptPayload?: Record<string, unknown> | null;
  publicId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const payload = receiptPayload ?? session?.receipt;

  if (!payload) {
    return (
      <section className="mx-auto max-w-[760px] py-10">
        <ReceiptText className="h-5 w-5 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
        <h1 className="mt-4 text-app-page">Work receipt is not issued yet</h1>
        <p className="mt-2 max-w-[68ch] text-app-body text-[var(--text-secondary)]">
          A receipt is issued only after Pass B claims receive explicit sandbox review. Complete the work, defense, and
          review to create a versioned receipt from the recorded session.
        </p>
        <Link
          href={session?.brief ? `/sandbox/evidence/${session.runId}` : "/sandbox/work"}
          className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
        >
          {session?.brief ? "Review evidence" : "Continue the work episode"}
        </Link>
      </section>
    );
  }

  const role = record(payload.role);
  const evaluation = record(payload.evaluatorSummary);
  const baseline = record(evaluation.baseline);
  const postFact = record(evaluation.postFact);
  const defense = record(payload.defense);
  const review = record(payload.review);
  const changedFact = record(payload.changedFact);
  const reviewedClaims = Array.isArray(payload.reviewedClaims)
    ? payload.reviewedClaims.map(record)
    : [];
  const publicId = String(payload.publicId ?? routePublicId ?? session?.receiptPublicId ?? "");
  const integrityHash = String(payload.integrityHash ?? session?.receiptIntegrityHash ?? "");

  async function copyVerificationLink() {
    const url = `${window.location.origin}/sandbox/receipts/${publicId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${publicId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <h1 className="text-app-page">Applied AI Work Receipt</h1>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              {session?.fixture.candidate.label ?? "Fictional sandbox candidate"} · {String(role.title ?? session?.fixture.role.title ?? "Applied AI Engineer")}
            </p>
            <p className="mt-2 flex items-center gap-2 text-app-meta text-[var(--text-secondary)]">
              <Check className="h-4 w-4 text-[var(--color-good)]" strokeWidth={2} aria-hidden />
              Issued from reviewed fictional sandbox data
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyVerificationLink()}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-app-body hover:bg-[var(--surface-hover)]"
            >
              <Copy className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              {copied ? "Link copied" : "Copy verification link"}
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-body font-medium text-[var(--control-solid-ink)]"
            >
              <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              Download JSON
            </button>
          </div>
        </div>

        <article className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-panel)]">
          <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
            <FydellMark width={22} />
            <span className="text-app-body font-medium">Fydell sandbox work receipt</span>
            <span className="ml-auto font-mono text-app-meta text-[var(--text-tertiary)]">{publicId}</span>
          </header>
          <div className="px-6 py-5">
            <p className="flex items-center gap-2 text-app-meta text-[var(--fydell-changed)]">
              <TriangleAlert className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              {String(payload.label)}
            </p>
            <dl className="mt-5 grid gap-4 border-y border-[var(--border-subtle)] py-4 sm:grid-cols-3">
              <Meta label="Format" value={String(payload.formatVersion)} />
              <Meta label="Proof spec" value={String(role.proofSpecVersion)} />
              <Meta label="Fixture" value={String(role.fixtureVersion)} />
              <Meta label="Review kind" value={String(review.kind).replaceAll("_", " ")} />
              <Meta label="Review decision" value={String(review.decision)} />
              <Meta label="Changed fact" value={`${String(changedFact.id)} · ${changedFact.released ? "released" : "not released"}`} />
            </dl>

            <ReceiptSection title="Work completed" items={strings(payload.completedWork)} />

            <section className="mt-6">
              <h2 className="text-app-section">Evaluator summaries</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-app-body">
                  <thead className="text-app-meta text-[var(--text-tertiary)]">
                    <tr>
                      {["Snapshot", "Cases", "Quality", "Critical authorization", "p95 latency", "Cost"].map((heading) => (
                        <th key={heading} className="border-b border-[var(--border-subtle)] pb-2 pr-4 text-left font-normal">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRow label="Baseline" metrics={baseline} />
                    <MetricRow label="Post-fact" metrics={postFact} />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-app-section">Reviewed claims</h2>
              <div className="mt-3">
                {reviewedClaims.map((claim) => (
                  <div key={String(claim.id)} className="border-b border-[var(--border-subtle)] py-3 last:border-b-0">
                    <p className="text-app-meta text-[var(--text-tertiary)]">
                      {String(claim.requirementId)} · {String(claim.direction).replaceAll("_", " ")} · {String(claim.reviewStatus).replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-app-body text-[var(--text-secondary)]">{String(claim.summary)}</p>
                    <p className="mt-2 break-all font-mono text-app-meta text-[var(--text-tertiary)]">
                      Sources: {strings(claim.supportingEventIds).join(", ") || "none"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-app-section">Defense and limits</h2>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                Question {defense.questionExists ? "recorded" : "missing"} · response {defense.responseExists ? "recorded" : "missing"}
              </p>
              <ul className="mt-3 space-y-1.5">
                {strings(payload.limitations).map((item) => (
                  <li key={item} className="text-app-body text-[var(--text-secondary)]">• {item}</li>
                ))}
              </ul>
            </section>
          </div>
        </article>
      </section>

      <aside>
        <h2 className="text-app-section">Receipt verification</h2>
        <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">SHA-256 integrity hash</p>
        <p className="mt-2 break-all font-mono text-app-meta text-[var(--text-primary)]">{integrityHash}</p>
        <p className="mt-3 text-app-body text-[var(--text-secondary)]">{String(payload.integrityNotice)}</p>
        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Source event IDs</p>
        <ul className="mt-2 space-y-1">
          {strings(payload.sourceEventIds).map((eventId) => (
            <li key={eventId} className="break-all font-mono text-app-meta text-[var(--text-secondary)]">{eventId}</li>
          ))}
        </ul>
        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Review label</p>
        <p className="mt-2 text-app-body text-[var(--text-secondary)]">{String(review.label)}</p>
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{String(review.disclaimer)}</p>
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-app-meta text-[var(--text-tertiary)]">{label}</dt><dd className="mt-1 text-app-body">{value}</dd></div>;
}

function ReceiptSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-app-section">{title}</h2>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => <li key={item} className="text-app-body text-[var(--text-secondary)]"><span className="mr-2 font-mono text-app-meta">{index + 1}</span>{item}</li>)}
      </ol>
    </section>
  );
}

function MetricRow({ label, metrics }: { label: string; metrics: Record<string, unknown> }) {
  return (
    <tr>
      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4 font-medium">{label}</td>
      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4">{String(metrics.caseCount ?? "—")}</td>
      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4">{metrics.quality === undefined ? "—" : `${String(metrics.quality)}%`}</td>
      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4">{metrics.criticalSliceQuality === undefined ? "—" : `${String(metrics.criticalSliceQuality)}%`}</td>
      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4">{metrics.p95LatencySeconds === undefined ? "—" : `${String(metrics.p95LatencySeconds)}s`}</td>
      <td className="border-b border-[var(--border-subtle)] py-2.5">{metrics.estimatedCostDollars === undefined ? "—" : `$${String(metrics.estimatedCostDollars)}`}</td>
    </tr>
  );
}
