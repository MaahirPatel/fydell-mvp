import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForOrgMember, getVersionContent, listEvents, listMessages } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BAND_LABELS, type EvidenceBand } from "@/lib/simulations/scoring";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { isV2PersistedResult } from "@/lib/simulations/v2/scoring";
import { isPreviewMode, previewReport } from "@/lib/dev/preview";
import { DA01_CONTENT_VERSION, DA01_SLUG } from "@/lib/contracts/da01";

export const runtime = "nodejs";

/** GET: the employer evidence report for a submitted + analyzed session. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isPreviewMode()) {
    const fixture = previewReport(id);
    return fixture
      ? NextResponse.json(fixture)
      : NextResponse.json({ error: "No report for that session" }, { status: 404 });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getSessionForOrgMember(id, user.id);
    const admin = createAdminSupabaseClient();

    const { data: run } = await admin
      .from("sim_analysis_runs")
      .select("*")
      .eq("session_id", id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!run) {
      const { data: failed } = await admin
        .from("sim_analysis_runs")
        .select("id, error, engine_version")
        .eq("session_id", id)
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (failed) {
        return NextResponse.json({
          ready: false,
          failed: true,
          sessionStatus: session.status,
          reviewState: "failed",
          engineVersion: failed.engine_version || "v2",
          message:
            "Analysis failed. This evaluation was not scored by keyword fallback. Retry analysis or mark the attempt for review.",
        });
      }
      return NextResponse.json({
        ready: false,
        failed: false,
        sessionStatus: session.status,
        reviewState: "processing",
        message:
          session.status === "submitted"
            ? "Analysis is still running. This page refreshes on its own."
            : "This session has not been submitted yet.",
      });
    }

    const [{ data: competencies }, { data: evidence }, { data: submission }, { data: decisions }] =
      await Promise.all([
        admin
          .from("sim_competency_results")
          .select("*")
          .eq("analysis_run_id", run.id)
          .order("adjusted_score", { ascending: false }),
        admin
          .from("sim_evidence_items")
          .select("*")
          .eq("analysis_run_id", run.id)
          .order("weight", { ascending: false }),
        admin.from("sim_submissions").select("snapshot, external_ai_disclosed, submitted_at").eq("session_id", id).maybeSingle(),
        admin
          .from("sim_employer_decisions")
          .select("id, decision, notes, decided_by, created_at")
          .eq("session_id", id)
          .order("created_at", { ascending: false }),
      ]);

    const content = await getVersionContent(session.template_version_id);
    const events = await listEvents(id);
    const messages = await listMessages(id);
    const { data: invitation } = await admin
      .from("sim_invitations")
      .select("candidate_email, candidate_name")
      .eq("id", session.invitation_id)
      .maybeSingle();
    const { data: credential } = await admin
      .from("sim_credentials")
      .select("credential_number, status, issued_at")
      .eq("session_id", id)
      .maybeSingle();

    const deliverableFields = isMicroContent(content)
      ? content.questions.map((q) => ({ key: q.id, label: q.prompt }))
      : Array.isArray((content as { deliverableFields?: { key: string; label: string }[] }).deliverableFields)
        ? (content as { deliverableFields: { key: string; label: string }[] }).deliverableFields.map(
            (f) => ({ key: f.key, label: f.label })
          )
        : [];

    const resultJson = run.result;
    const v2 = isV2PersistedResult(resultJson);

    return NextResponse.json({
      ready: true,
      failed: false,
      reviewState: "ready",
      candidate: {
        email: invitation?.candidate_email,
        name: invitation?.candidate_name,
      },
      simulation: {
        title: content.title,
        roleKey: content.roleKey,
        slug: isMicroContent(content) ? content.slug : null,
        version:
          isMicroContent(content) && content.slug === DA01_SLUG
            ? DA01_CONTENT_VERSION
            : isMicroContent(content)
              ? `${content.slug}@${content.schemaVersion ?? 1}`
              : null,
        durationMinutes: content.durationMinutes,
        deliverableFields,
      },
      session: {
        startedAt: session.started_at,
        submittedAt: session.submitted_at,
        curveballPresentedAt: session.curveball_presented_at,
        curveballAcknowledgedAt: session.curveball_acknowledged_at,
      },
      analysis: {
        recommendation: run.recommendation,
        cappedByCritical: run.capped_by_critical,
        aiUse: run.ai_use_summary || {
          promptCount: 0,
          insertedCount: 0,
          editedAfterInsertCount: 0,
          externalAiDisclosed: Boolean(submission?.external_ai_disclosed),
          trackingNote: "",
        },
        interviewQuestions: run.interview_questions || [],
        completedAt: run.completed_at,
        engineVersion: run.engine_version,
        result: resultJson,
        ...(v2
          ? {
              performance: resultJson.performance,
              coverage: resultJson.coverage,
              confidence: resultJson.confidence,
              band: resultJson.band,
              bandLabel: resultJson.bandLabel,
              citations: resultJson.citations,
            }
          : {}),
        competencies: (competencies || []).map((c) => ({
          key: c.competency_key,
          label: c.label,
          band: c.band,
          bandLabel: BAND_LABELS[c.band as EvidenceBand],
          confidence: Number(c.confidence),
          coverage: Number(c.coverage),
          critical: c.critical,
          summary: c.summary,
        })),
        evidence: (evidence || []).map((e) => ({
          competencyKey: e.competency_key,
          indicator: e.indicator,
          source: e.source,
          quality: Number(e.quality),
          excerpts: e.excerpts,
          counterevidence: e.counterevidence,
          explanation: e.explanation,
        })),
      },
      submission: submission
        ? {
            snapshot: submission.snapshot,
            externalAiDisclosed: submission.external_ai_disclosed,
            submittedAt: submission.submitted_at,
          }
        : null,
      timeline: events.map((e) => ({
        type: e.event_type,
        actor: e.actor,
        resourceId: e.resource_id,
        at: e.created_at,
      })),
      messages: messages.map((m) => ({
        thread: m.thread,
        stakeholderId: m.stakeholder_id,
        sender: m.sender,
        body: m.body,
        at: m.created_at,
      })),
      decisions: decisions || [],
      credential: credential || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load report";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 404 });
  }
}
