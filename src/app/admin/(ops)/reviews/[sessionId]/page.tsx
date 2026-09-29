import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { engineeringReportFor } from "@/lib/engineering/submission-eval";
import { getVersionContent } from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { EngineeringResults } from "@/components/sim/EngineeringResults";
import ReportReviewActions from "./ReportReviewActions";

export const dynamic = "force-dynamic";

export default async function ReportReviewDetail({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, status, template_id, template_version_id, submitted_at, curveball_presented_at, sim_invitations(candidate_email), organizations(name)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();

  const report = await engineeringReportFor(sessionId, session.template_id as string);
  if (!report) notFound();

  const [{ data: submission }, { data: history }, content] = await Promise.all([
    admin.from("sim_submissions").select("snapshot, external_ai_disclosed").eq("session_id", sessionId).maybeSingle(),
    admin
      .from("sim_report_review_events")
      .select("id, action, from_status, to_status, actor_email, notes, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    getVersionContent(session.template_version_id as string).catch(() => null),
  ]);

  const answers = ((submission?.snapshot as { deliverable?: Record<string, unknown> } | null)?.deliverable ?? {}) as Record<string, unknown>;
  const questions = isMicroContent(content) ? content.questions : [];
  // PostgREST returns embedded rows as an object or a one-item array.
  const one = <T,>(v: unknown): T | null => ((Array.isArray(v) ? v[0] : v) ?? null) as T | null;
  const invitation = one<{ candidate_email?: string }>(session.sim_invitations);
  const org = one<{ name?: string }>(session.organizations);

  return (
    <div className="max-w-[980px] space-y-7 px-6 py-8">
      <header>
        <Link href="/admin/reviews" className="text-app-meta text-[var(--text-secondary)] underline-offset-2 hover:underline">
          All report reviews
        </Link>
        <h1 className="mt-2 text-app-page font-medium">{invitation?.candidate_email ?? sessionId}</h1>
        <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
          {org?.name ?? "Unknown workspace"} · submitted{" "}
          {session.submitted_at ? new Date(session.submitted_at as string).toLocaleString() : "not recorded"} ·
          requirement update {session.curveball_presented_at ? "presented" : "never presented"} · external AI{" "}
          {submission?.external_ai_disclosed ? "disclosed" : "not disclosed"}
        </p>
      </header>

      <ReportReviewActions
        sessionId={sessionId}
        status={report.review.status}
        evaluationState={report.evaluation.state === "finished" ? report.evaluation.result.status : report.evaluation.state}
      />

      <EngineeringResults data={report} />

      <section className="space-y-2">
        <h2 className="text-app-section font-medium">Handoff</h2>
        {questions.length === 0 ? (
          <p className="text-app-meta text-[var(--text-secondary)]">No handoff fields for this assessment.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
              <p className="text-app-meta font-medium text-[var(--text-secondary)]">{q.prompt}</p>
              <p className="mt-1.5 whitespace-pre-line text-app-body text-[var(--text-primary)]">
                {String(answers[q.id] ?? "").trim() || <span className="text-[var(--text-tertiary)]">Left empty</span>}
              </p>
            </div>
          ))
        )}
      </section>

      <section>
        <h2 className="text-app-section font-medium">Review history</h2>
        {(history ?? []).length === 0 ? (
          <p className="mt-2 text-app-meta text-[var(--text-secondary)]">No decisions yet.</p>
        ) : (
          <ol className="mt-2 space-y-1.5 text-app-meta text-[var(--text-secondary)]">
            {(history ?? []).map((h) => (
              <li key={h.id as string}>
                {new Date(h.created_at as string).toLocaleString()} · {h.actor_email as string} ·{" "}
                {(h.action as string).replace(/_/g, " ")} ({h.from_status as string} → {h.to_status as string})
                {h.notes ? <>: &ldquo;{h.notes as string}&rdquo;</> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
