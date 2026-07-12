import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requirePlatformRoleApi(["super_admin", "admin", "support", "operator"]);
  if ("error" in gate) return gate.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = await req.json();
  const admin = createAdminSupabaseClient();
  const actor = gate;

  async function audit(action: string, entityType: string, entityId: string, metadata: object) {
    await admin.from("audit_logs").insert({
      actor_user_id: null,
      actor_email: actor.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }

  try {
    switch (body.action) {
      case "approve_organization": {
        const orgId = String(body.organizationId);
        await admin.from("organizations").update({ status: "active" }).eq("id", orgId);
        await admin
          .from("employer_onboarding")
          .update({ approval_status: "approved" })
          .eq("organization_id", orgId);
        await admin
          .from("hiring_roles")
          .update({ invites_enabled: true })
          .eq("organization_id", orgId);
        await audit("admin.org.approved", "organization", orgId, {});
        return NextResponse.json({ ok: true });
      }
      case "connect_user_to_org": {
        const { userId, organizationId, role } = body;
        await admin.from("organization_members").upsert({
          user_id: userId,
          organization_id: organizationId,
          role: role || "hiring_manager",
          status: "active",
          joined_at: new Date().toISOString(),
        });
        await audit("admin.user.connected", "organization_members", organizationId, {
          userId,
        });
        return NextResponse.json({ ok: true });
      }
      case "extend_invitation": {
        const invitationId = String(body.invitationId);
        const days = Number(body.days || 7);
        const expires = new Date(Date.now() + days * 86400000).toISOString();
        await admin
          .from("candidate_invitations")
          .update({ expires_at: expires, status: "sent" })
          .eq("id", invitationId);
        await audit("admin.invitation.extended", "candidate_invitation", invitationId, {
          days,
        });
        return NextResponse.json({ ok: true });
      }
      case "revoke_invitation": {
        const invitationId = String(body.invitationId);
        await admin
          .from("candidate_invitations")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("id", invitationId);
        await admin
          .from("simulation_assignments")
          .update({ status: "cancelled" })
          .eq("invitation_id", invitationId);
        await audit("admin.invitation.revoked", "candidate_invitation", invitationId, {});
        return NextResponse.json({ ok: true });
      }
      case "cancel_session": {
        const sessionId = String(body.sessionId);
        const reason = String(body.reason || "admin_cancel");
        await admin
          .from("pilot_simulation_sessions")
          .update({ status: "cancelled", locked_at: new Date().toISOString() })
          .eq("id", sessionId)
          .neq("status", "submitted");
        await audit("admin.session.cancelled", "pilot_simulation_session", sessionId, {
          reason,
        });
        return NextResponse.json({ ok: true });
      }
      case "retry_email": {
        const outboxId = String(body.outboxId);
        await admin
          .from("email_outbox")
          .update({ status: "pending", last_error: null, scheduled_for: new Date().toISOString() })
          .eq("id", outboxId);
        await audit("admin.email.retry", "email_outbox", outboxId, {});
        return NextResponse.json({ ok: true });
      }
      case "requeue_report": {
        const reportId = String(body.reportId);
        await admin
          .from("evidence_reports_v2")
          .update({ status: "awaiting_human_review" })
          .eq("id", reportId);
        await audit("admin.report.requeued", "evidence_reports_v2", reportId, {});
        return NextResponse.json({ ok: true });
      }
      case "explain_setup_required": {
        const userId = String(body.userId);
        const { data: membership } = await admin
          .from("organization_members")
          .select("*")
          .eq("user_id", userId);
        const { data: onboarding } = await admin
          .from("employer_onboarding")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        const { data: candidate } = await admin
          .from("pilot_candidates")
          .select("id")
          .eq("auth_user_id", userId);
        return NextResponse.json({
          memberships: membership || [],
          onboarding,
          candidateLinks: candidate || [],
        });
      }
      default:
        return NextResponse.json({ error: "Unknown repair action" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Repair failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
