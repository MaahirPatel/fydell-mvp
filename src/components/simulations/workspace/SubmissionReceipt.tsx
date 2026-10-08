"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { formatBytes } from "@/components/eng/api";
import { LocalTime } from "@/components/eng/LocalTime";
import type { AuthoredCandidateReport, AuthoredCandidateView } from "@/lib/eng/authored/types";
import { AuthoredReport } from "@/components/work-samples/runtime/AuthoredReport";
import { SimHeader, SupportLine } from "./TicketBrief";

const EVALUATION_COPY: Record<AuthoredCandidateView["evaluation"], { title: string; body: string }> = {
  not_submitted: { title: "Not submitted", body: "" },
  pending: { title: "Evaluation pending", body: "Your submission is queued to run against the full test suite. This usually takes a few minutes." },
  delayed: {
    title: "Evaluation pending",
    body: "Evaluation has not been able to run yet. Your submission is sealed and safe; nothing more is needed from you. The team has been told.",
  },
  awaiting_release: { title: "With the hiring team", body: "The tests have run. The hiring team reviews the results before anything is shared with you." },
  released: { title: "Report released", body: "" },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13.5px] text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 break-words text-[14px] text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}

/** The durable receipt after submission, with a way back into the read-only files and thread. */
export function SubmissionReceipt({ view, report, onOpenFiles }: { view: AuthoredCandidateView; report: AuthoredCandidateReport | null; onOpenFiles: (() => void) | null }) {
  const copy = EVALUATION_COPY[view.evaluation];
  const receipt = view.receipt;
  return (
    <div className="min-h-dvh">
      <SimHeader>
        <Link
          href="/app/candidate"
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft aria-hidden size={15} />
          Back to evaluations
        </Link>
      </SimHeader>
      <main className="mx-auto grid max-w-[860px] gap-8 px-6 py-10">
        <header className="grid gap-2">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Submission received</h1>
          <p className="text-[15px] text-[var(--text-secondary)]">
            {view.task.title}, for {view.role.title} at {view.role.organizationName}. Keep this receipt: it identifies exactly what you submitted.
          </p>
        </header>

        <section aria-labelledby="receipt-title" className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-5 py-3">
          <h2 id="receipt-title" className="sr-only">
            Receipt
          </h2>
          {receipt ? (
            <dl className="divide-y divide-[var(--border-subtle)]">
              <Row label="Submitted">
                <LocalTime iso={receipt.submittedAt} withWeekday />
              </Row>
              <Row label="Receipt">
                <span className="font-mono text-[13px]">{receipt.submissionId}</span>
              </Row>
              {view.workspace ? (
                <Row label="Files fingerprint">
                  <span className="font-mono text-[13px]">SHA-256 {view.workspace.filesSha256}</span>
                </Row>
              ) : null}
              <Row label="Sealed archive">
                <span className="font-mono text-[13px]">
                  {formatBytes(receipt.archiveBytes)}, SHA-256 {receipt.archiveSha256}
                </span>
              </Row>
              <Row label="Timing">{receipt.late ? "After the time limit, marked late" : "Within the time limit"}</Row>
            </dl>
          ) : (
            <p className="py-2 text-[14px] text-[var(--text-secondary)]">Your submission is recorded.</p>
          )}
        </section>

        {onOpenFiles ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={onOpenFiles}>
              Open your files and team thread
            </Button>
            <p className="text-[13.5px] text-[var(--text-secondary)]">Read only. Nothing can change after submission.</p>
          </div>
        ) : null}

        {view.evaluation !== "released" ? (
          <section aria-labelledby="evaluation-title" className="grid gap-2">
            <h2 id="evaluation-title" className="text-[17px] font-semibold text-[var(--text-primary)]">
              {copy.title}
            </h2>
            <p className="max-w-[68ch] text-[15px] leading-[1.6] text-[var(--text-body)]">{copy.body}</p>
          </section>
        ) : null}

        {view.evaluation === "released" && report ? (
          <Panel>
            <AuthoredReport report={report} />
          </Panel>
        ) : null}

        <SupportLine />
      </main>
    </div>
  );
}
