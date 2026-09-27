import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import ReviewWorkspace from "@/components/eng/ReviewWorkspace";
import { RequeueButton } from "@/components/eng/ReviewerControls";
import { engAdmin } from "@/lib/eng/context";
import { isUuid } from "@/lib/eng/http";
import { reviewerAttemptView } from "@/lib/eng/reviewer-view";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { requirePlatformRole } from "@/lib/ops/require-platform-role";
import type { AttemptRow } from "@/lib/eng/types";

export const metadata = { title: "Review engineering attempt" };
export const dynamic = "force-dynamic";

export default async function ReviewAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const reviewer = await requirePlatformRole(["super_admin", "admin", "reviewer"]);
  const { attemptId } = await params;
  if (!isUuid(attemptId)) notFound();
  const db = engAdmin();
  const { data } = await db.from("eng_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!data) notFound();
  const attempt = data as AttemptRow;
  const view = await reviewerAttemptView(db, attempt);
  const { definition, row } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const run = view.run;
  const draft = view.reports.find((r) => r.status === "draft") ?? null;
  const released = view.reports.find((r) => r.status === "released") ?? null;
  const reviewable = run && (run.status === "human_review" || run.status === "ready") && run.results && view.submission;

  return (
    <div className="max-w-[1180px]">
      <Link href="/admin/engineering" className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Engineering review
      </Link>
      <PageHeader
        className="mt-3"
        title={`Attempt ${attempt.id.slice(0, 8)}`}
        description={`${view.invitation.role_snapshot.organizationName} · ${view.invitation.role_snapshot.title} · ${definition.title} v${row.version}. The candidate's name and email are hidden here to keep the review about the work.`}
        meta={
          <>
            {run ? <StatusTag tone={run.status === "human_review" ? "changed" : run.status === "ready" ? "good" : run.status === "blocked" ? "risk" : "neutral"}>{run.status.replace(/_/g, " ")}</StatusTag> : null}
            {view.submission?.late ? <StatusTag tone="changed">Late</StatusTag> : null}
            {run?.executor ? <span className="text-app-meta text-[var(--text-secondary)]">Executor {run.executor}{run.environment_version ? ` (${run.environment_version})` : ""}</span> : null}
            <span className="text-app-meta text-[var(--text-secondary)]">Reviewing as {reviewer.email}</span>
          </>
        }
      />

      {view.flags.filter((f) => !f.resolvedAt).length ? (
        <Panel className="mt-6">
          <PanelSection title="Employer flags" description="Check each one. Release a corrected version if a finding is wrong.">
            <ul className="grid gap-2 text-app-meta">
              {view.flags
                .filter((f) => !f.resolvedAt)
                .map((f) => (
                  <li key={f.id}>
                    <span className="font-mono text-[var(--text-tertiary)]">{f.findingId}</span> <span className="text-[var(--text-secondary)]">{f.reason}</span>
                  </li>
                ))}
            </ul>
          </PanelSection>
        </Panel>
      ) : null}

      {!reviewable ? (
        <Panel className="mt-6">
          <PanelSection title="Not ready for review">
            <EmptyState
              title={!view.submission ? "No submission yet" : run ? `Evaluation is ${run.status.replace(/_/g, " ")}` : "Evaluation not queued"}
              description={
                run?.last_error_code
                  ? `Last platform error: ${run.last_error_code}. ${run.last_error_detail ?? ""} This is not a candidate result.`
                  : "Findings can be written once the trusted checks have finished."
              }
              action={run && (run.status === "blocked" || run.status === "retryable_failure") ? <RequeueButton endpoint={`/api/eng/review/runs/${run.id}/requeue`} /> : undefined}
            />
          </PanelSection>
        </Panel>
      ) : (
        <div className="mt-6">
          <ReviewWorkspace
            apiBase={`/api/eng/review/${attempt.id}`}
            scenario={definition}
            suiteVersion={run.suite_version}
            results={run.results!}
            submission={view.submission!}
            files={view.files}
            messages={view.messages}
            draft={draft}
            released={released}
          />
        </div>
      )}
    </div>
  );
}
