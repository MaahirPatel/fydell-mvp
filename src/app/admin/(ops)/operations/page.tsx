import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricStrip } from "@/components/ui/MetricStrip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import { canAct, OPS_VIEW_ROLES } from "@/lib/ops/ops-actions";
import { requirePlatformRole } from "@/lib/ops/require-platform-role";
import { loadOpsSnapshot, OPS_SECTION_LIMIT, stuckTotal, type OpsSnapshot } from "@/lib/ops/stuck-work";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { OpsActionButton } from "./OpsActionButton";

export const metadata = { title: "Stuck work" };
export const dynamic = "force-dynamic";

const RUN_TONE: Record<string, StatusTone> = {
  queued: "neutral",
  running: "active",
  retryable_failure: "changed",
  blocked: "risk",
};

const IMPORT_PROBLEM: Record<string, { label: string; tone: StatusTone }> = {
  overdue: { label: "Overdue, unclaimed", tone: "changed" },
  worker_lost: { label: "Worker lost", tone: "risk" },
  failed: { label: "Failed", tone: "risk" },
};

function age(iso: string | null, now: number): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

const short = (id: string) => id.slice(0, 8);
const count = (n: number) => (n >= OPS_SECTION_LIMIT ? `${OPS_SECTION_LIMIT}+` : String(n));

function Id({ id, href }: { id: string; href?: string }) {
  const text = <span className="font-mono text-app-meta" title={id}>{short(id)}</span>;
  return href ? (
    <Link href={href} className="hover:underline">
      {text}
    </Link>
  ) : (
    text
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-5 pb-5 lg:px-6">
      <EmptyState title={text} />
    </div>
  );
}

export default async function StuckWorkPage() {
  const admin = await requirePlatformRole(OPS_VIEW_ROLES);
  const actor = canAct(admin.roles);

  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-[1180px]">
        <PageHeader title="Stuck work" />
        <EmptyState className="mt-6" title="Database not configured" description="Connect Supabase to see stuck work." />
      </div>
    );
  }

  const s: OpsSnapshot = await loadOpsSnapshot(createAdminSupabaseClient());
  const now = Date.parse(s.generatedAt);
  const t = s.thresholds;
  const stuckRuns = s.runs.filter((r) => r.pastThreshold).length;

  return (
    <div className="max-w-[1180px]">
      <PageHeader
        title="Stuck work"
        description="Engineering evaluations, uploads, Passport imports, unreleased reports and open candidate responses that have waited longer than expected. Ids, states and times only; candidate code, hidden tests and notes are never shown here. Every retry or cancel asks for a reason and is recorded."
        meta={
          <span className="text-app-meta text-[var(--text-tertiary)]">
            Generated {when(s.generatedAt)} · {stuckTotal(s)} items need attention{actor ? "" : " · read-only for your role"}
          </span>
        }
      />

      {s.errors.length > 0 ? (
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-band)] px-4 py-3 text-app-meta text-[var(--fydell-risk)]">
          Some sections could not load: {s.errors.join("; ")}
        </div>
      ) : null}

      <MetricStrip
        className="mt-6"
        items={[
          { label: "Evaluations over threshold", value: count(stuckRuns), hint: `Submitted > ${t.evaluationStuckMinutes} min ago` },
          { label: "Runs blocked", value: count(s.runs.filter((r) => r.status === "blocked").length), hint: "Retries used up" },
          { label: "Uploads validating", value: count(s.uploads.length), hint: `> ${t.uploadValidatingMinutes} min` },
          { label: "Imports stuck or failed", value: count(s.imports.length), hint: `Failed in last ${t.importFailedLookbackDays}d` },
          { label: "Reports waiting", value: count(s.reports.length), hint: `> ${t.reportDraftHours}h` },
          { label: "Open responses", value: count(s.responses.length), hint: `> ${t.responseOpenDays}d old` },
        ]}
      />

      <Panel className="mt-6">
        <PanelSection
          title="Evaluation runs"
          description={`Queued, retrying and blocked runs, plus running ones whose worker lease expired or that are over ${t.evaluationStuckMinutes} minutes since submission. Retry gives a blocked run a fresh budget; cancel is final for that submission.`}
        />
        {s.runs.length === 0 ? (
          <Empty text="No evaluation runs waiting." />
        ) : (
          <Table>
            <THead>
              <TH>Attempt</TH>
              <TH>Run</TH>
              <TH>State</TH>
              <TH>Tries</TH>
              <TH>Error code</TH>
              <TH>Waiting</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {s.runs.map((r) => (
                <TR key={r.runId}>
                  <TDPrimary>
                    <Id id={r.attemptId} href={`/admin/engineering/${r.attemptId}`} />
                  </TDPrimary>
                  <TD>
                    <Id id={r.runId} />
                  </TD>
                  <TD>
                    <StatusTag tone={r.leaseExpired ? "risk" : RUN_TONE[r.status] ?? "neutral"}>{r.leaseExpired ? "running, lease expired" : r.status.replace("_", " ")}</StatusTag>
                    {r.pastThreshold ? <span className="ml-2 text-app-meta text-[var(--fydell-risk)]">over threshold</span> : null}
                  </TD>
                  <TD className="tabular-nums">
                    {r.tries}/{r.maxTries}
                  </TD>
                  <TD className="font-mono text-app-meta">{r.errorCode ?? ""}</TD>
                  <TD className="tabular-nums" title={when(r.submittedAt ?? r.createdAt)}>
                    {age(r.submittedAt ?? r.createdAt, now)}
                    {r.nextRetryAt ? <span className="block text-app-meta text-[var(--text-tertiary)]">next try {when(r.nextRetryAt)}</span> : null}
                  </TD>
                  <TD align="right">
                    {actor ? (
                      <span className="inline-flex gap-2">
                        {r.actions.includes("requeue") ? (
                          <OpsActionButton action="eng_run.requeue" targetId={r.runId} label="Retry" title="Retry evaluation run" description="Puts the run back in the queue with a fresh retry budget. Recorded results are never changed." />
                        ) : null}
                        {r.actions.includes("cancel") ? (
                          <OpsActionButton action="eng_run.cancel" targetId={r.runId} label="Cancel" destructive title="Cancel evaluation run" description="Final. The submission will not be evaluated by the app again; use only for withdrawn, duplicate or test attempts." />
                        ) : null}
                      </span>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <PanelSection title="Submitted without an evaluation run" description={`Accepted submissions older than ${t.submissionWithoutRunMinutes} minutes that never got a run (the queue insert failed after the submit).`} />
        {s.submissionsWithoutRun.length === 0 ? (
          <Empty text="Every submission has a run." />
        ) : (
          <Table>
            <THead>
              <TH>Attempt</TH>
              <TH>Submission</TH>
              <TH>Submitted</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {s.submissionsWithoutRun.map((r) => (
                <TR key={r.submissionId}>
                  <TDPrimary>
                    <Id id={r.attemptId} href={`/admin/engineering/${r.attemptId}`} />
                  </TDPrimary>
                  <TD>
                    <Id id={r.submissionId} />
                  </TD>
                  <TD title={when(r.submittedAt)}>{age(r.submittedAt, now)} ago</TD>
                  <TD align="right">
                    {actor ? (
                      <OpsActionButton action="eng_attempt.enqueue_evaluation" targetId={r.attemptId} label="Queue evaluation" title="Queue evaluation" description="Creates the missing evaluation run for this submission with the attempt's pinned scenario version." />
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelSection title="Uploads stuck validating" description={`Uploads whose archive check started but never finished, created over ${t.uploadValidatingMinutes} minutes ago. Reset marks the upload failed so the candidate's next submit re-runs the check.`} />
        {s.uploads.length === 0 ? (
          <Empty text="No uploads stuck validating." />
        ) : (
          <Table>
            <THead>
              <TH>Attempt</TH>
              <TH>Upload</TH>
              <TH>Created</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {s.uploads.map((u) => (
                <TR key={u.uploadId}>
                  <TDPrimary>
                    <Id id={u.attemptId} href={`/admin/engineering/${u.attemptId}`} />
                  </TDPrimary>
                  <TD>
                    <Id id={u.uploadId} />
                  </TD>
                  <TD title={when(u.createdAt)}>{age(u.createdAt, now)} ago</TD>
                  <TD align="right">
                    {actor ? <OpsActionButton action="eng_upload.reset" targetId={u.uploadId} label="Reset" title="Reset stuck upload" description="Marks the upload failed (validation_interrupted). The stored file is kept; the candidate submits again to re-run the check." /> : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelSection title="Passport imports" description={`Imports unclaimed more than ${t.importOverdueMinutes} minutes after they were due, imports whose worker stopped sending heartbeats, and failed imports from the last ${t.importFailedLookbackDays} days.`} />
        {s.imports.length === 0 ? (
          <Empty text="No stuck or failed imports." />
        ) : (
          <Table>
            <THead>
              <TH>Job</TH>
              <TH>Owner</TH>
              <TH>Problem</TH>
              <TH>Stage</TH>
              <TH>Tries</TH>
              <TH>Error code</TH>
              <TH>Created</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </THead>
            <TBody>
              {s.imports.map((j) => (
                <TR key={j.jobId}>
                  <TDPrimary>
                    <Id id={j.jobId} />
                  </TDPrimary>
                  <TD>
                    <Id id={j.ownerId} />
                  </TD>
                  <TD>
                    <StatusTag tone={IMPORT_PROBLEM[j.problem].tone}>{IMPORT_PROBLEM[j.problem].label}</StatusTag>
                    {j.cancelRequested ? <span className="ml-2 text-app-meta text-[var(--text-tertiary)]">cancel requested</span> : null}
                  </TD>
                  <TD>{j.stage ?? ""}</TD>
                  <TD className="tabular-nums">
                    {j.tries}/{j.maxTries}
                  </TD>
                  <TD className="font-mono text-app-meta">
                    {j.errorCode ?? ""}
                    {j.problem === "failed" ? <span className="block font-sans text-[var(--text-tertiary)]">{j.retryable ? "platform, retryable" : "repository, not retryable"}</span> : null}
                  </TD>
                  <TD title={when(j.createdAt)}>{age(j.createdAt, now)} ago</TD>
                  <TD align="right">
                    {actor ? (
                      <span className="inline-flex gap-2">
                        {j.actions.includes("requeue") ? (
                          <OpsActionButton action="import_job.retry" targetId={j.jobId} label="Retry" title="Retry import" description="Failed retryable imports get a fresh attempt budget; stuck ones are handed to a worker. One job per repository revision is kept." />
                        ) : null}
                        {j.actions.includes("cancel") ? (
                          <OpsActionButton action="import_job.cancel" targetId={j.jobId} label="Cancel" destructive title="Cancel import" description="Stops the import before it saves. An import already saving completes. The owner can start it again." />
                        ) : null}
                      </span>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelSection
          title="Reports waiting on a reviewer"
          description={`Draft reports untouched for ${t.reportDraftHours} hours, and evaluated runs with no draft ${t.awaitingReviewHours} hours after the checks finished. Release is the reviewer's decision; follow up with the workspace or the Fydell reviewer.`}
        />
        {s.reports.length === 0 ? (
          <Empty text="No reports waiting longer than expected." />
        ) : (
          <Table>
            <THead>
              <TH>Attempt</TH>
              <TH>Waiting on</TH>
              <TH>Report or run</TH>
              <TH>Since</TH>
            </THead>
            <TBody>
              {s.reports.map((r) => (
                <TR key={`${r.kind}-${r.reportId ?? r.runId}`}>
                  <TDPrimary>
                    <Id id={r.attemptId} href={`/admin/engineering/${r.attemptId}`} />
                  </TDPrimary>
                  <TD>
                    <StatusTag tone="changed">{r.kind === "draft_unreleased" ? `Draft v${r.version ?? ""} unreleased` : "No draft started"}</StatusTag>
                  </TD>
                  <TD>{r.reportId ? <Id id={r.reportId} /> : r.runId ? <Id id={r.runId} /> : null}</TD>
                  <TD title={when(r.since)}>{age(r.since, now)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelSection
          title="Open candidate responses"
          description={`Context notes and flagged errors on released reports, open for more than ${t.responseOpenDays} days. The hiring team resolves them from the attempt page; corrections are released as a new report version. Response text is not shown here.`}
        />
        {s.responses.length === 0 ? (
          <Empty text="No old open responses." />
        ) : (
          <Table>
            <THead>
              <TH>Attempt</TH>
              <TH>Workspace</TH>
              <TH>Kind</TH>
              <TH>On</TH>
              <TH>Opened</TH>
            </THead>
            <TBody>
              {s.responses.map((r) => (
                <TR key={r.responseId}>
                  <TDPrimary>
                    <Id id={r.attemptId} href={`/admin/engineering/${r.attemptId}`} />
                  </TDPrimary>
                  <TD>
                    <Id id={r.organizationId} />
                  </TD>
                  <TD>
                    <StatusTag tone={r.kind === "inaccurate" ? "risk" : "neutral"}>{r.kind === "inaccurate" ? "Flagged as inaccurate" : "Added context"}</StatusTag>
                  </TD>
                  <TD>
                    {r.targetKind} · report v{r.reportVersion}
                  </TD>
                  <TD title={when(r.createdAt)}>{age(r.createdAt, now)} ago</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel className="mt-6">
        <PanelSection title="Recent operator actions" description="Append-only. Each row records who acted, on what, why, and what actually happened." />
        {s.recentActions.length === 0 ? (
          <Empty text="No operator actions yet." />
        ) : (
          <Table>
            <THead>
              <TH>When</TH>
              <TH>Operator</TH>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>Outcome</TH>
              <TH>Reason</TH>
            </THead>
            <TBody>
              {s.recentActions.map((a) => (
                <TR key={a.id}>
                  <TD className="tabular-nums">{when(a.createdAt)}</TD>
                  <TD>{a.actorEmail}</TD>
                  <TD className="font-mono text-app-meta">{a.action}</TD>
                  <TD>
                    <Id id={a.targetId} />
                  </TD>
                  <TD>
                    <StatusTag tone={a.outcome === "applied" ? "good" : a.outcome === "noop" ? "neutral" : a.outcome === "pending" ? "active" : "risk"}>{a.outcome}</StatusTag>
                    {a.beforeState || a.afterState ? (
                      <span className="block text-app-meta text-[var(--text-tertiary)]">
                        {a.beforeState ?? "?"} → {a.afterState ?? "?"}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="max-w-[280px] truncate" title={a.reason}>
                    {a.reason}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
