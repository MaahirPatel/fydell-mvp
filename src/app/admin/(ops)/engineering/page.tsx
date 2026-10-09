import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import { RequeueButton, RunWorkerButton } from "@/components/eng/ReviewerControls";
import { engAdmin } from "@/lib/eng/context";
import { selectExecutor } from "@/lib/eng/evaluation/queue";
import { listReviewQueue } from "@/lib/eng/reviewer-view";
import { requireAdminPermission } from "@/lib/ops/require-platform-role";
import type { RunStatus } from "@/lib/eng/types";

export const metadata = { title: "Engineering review" };
export const dynamic = "force-dynamic";

const RUN_STATUS: Record<RunStatus, { label: string; tone: StatusTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "active" },
  human_review: { label: "Needs review", tone: "changed" },
  ready: { label: "Released", tone: "good" },
  retryable_failure: { label: "Retrying (platform)", tone: "changed" },
  blocked: { label: "Blocked (platform)", tone: "risk" },
  canceled: { label: "Cancelled", tone: "neutral" },
};

export default async function EngineeringReviewQueuePage() {
  await requireAdminPermission("reports.review");
  const queue = await listReviewQueue(engAdmin());
  const executor = selectExecutor();

  return (
    <div className="max-w-[1180px]">
      <PageHeader
        title="Engineering review"
        description="Submitted engineering tasks. Trusted checks run first; each hiring team reviews and releases its own reports. Fydell staff can also write reports here when a workspace asks for help. Platform failures are retried and never shown to employers as candidate results."
        action={<RunWorkerButton />}
      />
      <p className="mt-3 text-app-meta text-[var(--text-secondary)]">
        Executor:{" "}
        {executor.ok === false ? (
          <span className="text-[var(--fydell-risk)]">not configured: {executor.detail}</span>
        ) : (
          <span className="text-[var(--text-primary)]">{executor.executor.name === "local-dev" ? "local-dev (not isolated; development only)" : "Vercel Sandbox (isolated)"}</span>
        )}
      </p>
      <Panel className="mt-6">
        <PanelSection title="Evaluation runs" />
        {queue.length === 0 ? (
          <div className="px-5 pb-5 lg:px-6">
            <EmptyState title="Nothing submitted yet" description="Runs appear here when a candidate submits." />
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Candidate</TH>
              <TH>Workspace and role</TH>
              <TH>Run</TH>
              <TH>Report</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {queue.map((row) => (
                <TR key={row.runId}>
                  <TDPrimary>
                    <Link href={`/admin/engineering/${row.attemptId}`} className="hover:underline">
                      {row.candidateEmail || row.attemptId}
                    </Link>
                    {row.submittedAt ? <span className="block text-app-meta font-normal text-[var(--text-tertiary)]">Submitted {new Date(row.submittedAt).toLocaleString("en-US")}</span> : null}
                  </TDPrimary>
                  <TD>
                    {row.organizationName}
                    <span className="block text-app-meta text-[var(--text-tertiary)]">{row.roleTitle}</span>
                  </TD>
                  <TD>
                    <StatusTag tone={RUN_STATUS[row.status].tone}>{RUN_STATUS[row.status].label}</StatusTag>
                    {row.lastError ? (
                      <span className="block text-app-meta text-[var(--text-tertiary)]">
                        {row.lastError} · try {row.attemptCount}/{row.maxAttempts}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="capitalize">{row.reportStatus === "none" ? "" : row.reportStatus}</TD>
                  <TD align="right">{row.status === "blocked" || row.status === "retryable_failure" ? <RequeueButton endpoint={`/api/eng/review/runs/${row.runId}/requeue`} /> : null}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
