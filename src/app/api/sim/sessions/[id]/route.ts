import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getSessionState,
  getTemplateById,
  getVersionContent,
  insertMessage,
  listEvents,
  listMessages,
  recordEvent,
} from "@/lib/simulations/db";
import {
  buildScenarioPackage,
  scenarioIdForTemplateSlug,
  type ScenarioPackage,
} from "@/lib/simulations/scenario-package";
import { toMicroCandidateView } from "@/lib/simulations/candidate-view";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { microToV2, toV2CandidateView } from "@/lib/simulations/v2";
import { buildSessionChatContext, toChatEvents } from "@/lib/simulations/chat-context";
import { deliverDueProactiveMessages } from "@/lib/simulations/proactive";
import { AI_USE_POLICY_TEXT } from "@/lib/simulations/ai-use-policy";
import { DISCLOSED_EVENT_TAXONOMY, TELEMETRY_DISCLOSURE } from "@/lib/simulations/observed-events";
import { HANDOFF_FIELDS } from "@/lib/simulations/handoff";
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

    // Deliver proactive teammate messages due right now (session welcome,
    // elapsed-time nudges). Best-effort and idempotent — re-running this
    // route never duplicates a message.
    let messagesForView = messages;
    if (session.status === "active") {
      try {
        const events = await listEvents(id);
        const chatCtx = buildSessionChatContext({
          startedAt: session.started_at,
          curveballPresentedAt: session.curveball_presented_at,
          deliverable: (state.deliverable || {}) as Record<string, unknown>,
          workspace: (state.workspace || {}) as Record<string, unknown>,
          completedTaskIds: state.completed_task_ids || [],
          events: toChatEvents(events),
        });
        const delivered = await deliverDueProactiveMessages({
          sessionId: id,
          content,
          ctx: chatCtx,
          insertMessage: async (input) => {
            const r = await insertMessage(input);
            return { duplicate: r.duplicate };
          },
          recordEvent: async (input) =>
            recordEvent(id, {
              eventType: input.eventType,
              actor: input.actor,
              payload: input.payload,
              clientEventId: input.clientEventId,
            }),
        });
        if (delivered > 0) messagesForView = await listMessages(id);
      } catch (err) {
        console.error(`[sim] proactive delivery failed for session ${id}:`, err);
      }
    }

    // W3: versioned, candidate-safe file package for scenario-backed sessions.
    // Convention: template slug == scenario directory name. Null when the
    // template has no on-disk scenario or the package fails to build — the
    // failure is logged server-side and the client falls back to
    // `state.workspace.files`. A broken package must never break this route
    // for web candidates.
    let filePackage: ScenarioPackage | null = null;
    try {
      const template = await getTemplateById(session.template_id);
      const scenarioId = scenarioIdForTemplateSlug(template.slug);
      if (scenarioId) filePackage = buildScenarioPackage(scenarioId);
    } catch (err) {
      console.error(`[sim] file package build failed for session ${id}:`, err);
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
      filePackage,
      gate: {
        consentPolicyVersion: CONSENT_POLICY_VERSION,
        consentAccepted: Boolean(consent),
        preflightOk: Boolean(
          preflight?.desktop_suitable && preflight?.network_ok && preflight?.browser_ok
        ),
        preflightLimitations: preflight?.limitations || [],
        desktopRequired: true,
      },
      // Candidate-visible policy disclosures: AI-use provenance rules, what
      // telemetry is (and is not) recorded, the disclosed event taxonomy,
      // and the required handoff fields for a complete submission.
      policies: {
        aiUse: AI_USE_POLICY_TEXT,
        telemetry: TELEMETRY_DISCLOSURE,
        eventTaxonomy: DISCLOSED_EVENT_TAXONOMY.map((e) => ({
          type: e.type,
          actor: e.actor,
          captures: e.captures,
        })),
        handoffFields: HANDOFF_FIELDS.map((f) => ({
          key: f.key,
          label: f.label,
          helpText: f.helpText,
          required: f.required,
        })),
      },
      state: {
        revision: state.revision,
        currentTaskId: state.current_task_id,
        notes: state.notes,
        deliverable: state.deliverable,
        workspace: state.workspace,
        completedTaskIds: state.completed_task_ids,
      },
      messages: messagesForView.map((m) => ({
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
