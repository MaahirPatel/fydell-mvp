import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  listMessages,
} from "@/lib/simulations/db";
import { toMicroCandidateView } from "@/lib/simulations/candidate-view";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { microToV2, toV2CandidateView } from "@/lib/simulations/v2";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { CONSENT_POLICY_VERSION } from "@/lib/pilot/consent";

export const runtime = "nodejs";

/**
 * GET: the full candidate payload - session, sanitized content, working
 * state, messages. Micro sessions also include a candidate-safe v2 workbench view.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    const content = await getVersionContent(session.template_version_id);
    if (!isMicroContent(content)) {
      return NextResponse.json(
        { error: "This simulation format is retired." },
        { status: 410 }
      );
    }

    const [state, messages] = await Promise.all([getSessionState(id), listMessages(id)]);
    const admin = createAdminSupabaseClient();
    const [{ data: consent }, { data: preflight }] = await Promise.all([
      admin
        .from("candidate_consents")
        .select("id, policy_version, accepted_at")
        .eq("invitation_id", session.invitation_id)
        .maybeSingle(),
      admin
        .from("preflight_checks")
        .select("desktop_suitable, network_ok, browser_ok, limitations, created_at")
        .eq("invitation_id", session.invitation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const workbench = toV2CandidateView(microToV2(content));
    const curveballPresented = Boolean(session.curveball_presented_at);
    if (!curveballPresented) {
      workbench.modules = workbench.modules.filter((m) => m.kind !== "curveball");
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        durationMinutes: session.duration_minutes,
        startedAt: session.started_at,
        endsAt: session.ends_at,
        submittedAt: session.submitted_at,
        curveballPresentedAt: session.curveball_presented_at,
        curveballAcknowledgedAt: session.curveball_acknowledged_at,
      },
      content: toMicroCandidateView(content),
      workbench,
      gate: {
        consentPolicyVersion: CONSENT_POLICY_VERSION,
        consentAccepted: Boolean(consent),
        preflightOk: Boolean(
          preflight?.desktop_suitable && preflight?.network_ok && preflight?.browser_ok
        ),
        preflightLimitations: preflight?.limitations || [],
        desktopRequired: true,
      },
      state: {
        revision: state.revision,
        currentTaskId: state.current_task_id,
        notes: state.notes,
        deliverable: state.deliverable,
        workspace: state.workspace,
        completedTaskIds: state.completed_task_ids,
      },
      messages: messages.map((m) => ({
        id: m.id,
        thread: m.thread,
        stakeholderId: m.stakeholder_id,
        sender: m.sender,
        body: m.body,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 404 });
  }
}
