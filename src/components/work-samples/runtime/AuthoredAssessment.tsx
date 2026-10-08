"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { AuthoredCandidateReport, AuthoredCandidateView } from "@/lib/eng/authored/types";
import { SimThemeRoot } from "@/components/simulations/workspace/SimThemeRoot";
import { SimulationWorkspace } from "@/components/simulations/workspace/SimulationWorkspace";
import { SubmissionReceipt } from "@/components/simulations/workspace/SubmissionReceipt";
import { SimHeader, SupportLine, TicketBrief } from "@/components/simulations/workspace/TicketBrief";

function ClosedScreen({ status }: { status: "withdrawn" | "expired" }) {
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
      <main className="mx-auto grid max-w-[640px] gap-4 px-6 py-16">
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)]">{status === "withdrawn" ? "This task was withdrawn" : "This task has expired"}</h1>
        <p className="text-[15px] leading-[1.6] text-[var(--text-body)]">Nothing more is needed from you. Contact the employer if you think this is a mistake.</p>
        <SupportLine />
      </main>
    </div>
  );
}

/**
 * The candidate side of an employer-authored task, from consent to receipt,
 * in the simulation theme. Everything shown comes from the server view;
 * tests run on the server's runner and nothing here grades work.
 */
export function AuthoredAssessment({ initialView, report }: { initialView: AuthoredCandidateView; report: AuthoredCandidateReport | null }) {
  const [view, setView] = useState(initialView);
  const [showFiles, setShowFiles] = useState(false);
  const base = `/api/eng/attempts/${view.attempt.id}/authored`;
  const status = view.attempt.status;
  const inWorkspace = status === "in_progress" || (status === "submitted" && showFiles && view.workspace !== null);

  let body: React.ReactNode;
  if (status === "withdrawn" || status === "expired") {
    body = <ClosedScreen status={status} />;
  } else if (status === "accepted" || status === "preflight_passed") {
    body = <TicketBrief view={view} base={base} onView={setView} />;
  } else if (status === "in_progress") {
    body = (
      <SimulationWorkspace
        view={view}
        base={base}
        mode="working"
        onSubmitted={(next) => {
          setShowFiles(false);
          setView(next);
        }}
      />
    );
  } else if (inWorkspace) {
    body = <SimulationWorkspace view={view} base={base} mode="submitted" onSubmitted={setView} onShowReceipt={() => setShowFiles(false)} />;
  } else {
    body = <SubmissionReceipt view={view} report={report} onOpenFiles={view.workspace ? () => setShowFiles(true) : null} />;
  }

  return <SimThemeRoot className={inWorkspace ? "h-dvh overflow-hidden" : "min-h-dvh"}>{body}</SimThemeRoot>;
}
