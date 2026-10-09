import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/security/request-body";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireAdminPermissionApi } from "@/lib/ops/require-platform-role";
import type { AdminPermission } from "@/lib/ops/admin-permissions";
import { writeAudit } from "@/lib/ops/platform-roles";
import { isOrgRole } from "@/lib/eng/permissions";

export const dynamic = "force-dynamic";

const ACTION_PERMISSION = {
  approve_organization: "commercial.edit",
  connect_user_to_org: "accounts.membership",
  extend_invitation: "invitations.manage",
  revoke_invitation: "invitations.manage",
  cancel_session: "ops.act",
  retry_email: "ops.act",
  requeue_report: "reports.review",
  explain_setup_required: "accounts.view",
} as const satisfies Record<string, AdminPermission>;

type RepairAction = keyof typeof ACTION_PERMISSION;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRepairAction(value: unknown): value is RepairAction {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACTION_PERMISSION, value);
}

function uuidField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && UUID.test(value.trim()) ? value.trim() : null;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const body = await readJsonObject(req);
  if (!isRepairAction(body.action)) return bad("Unknown repair action.");
  const action = body.action;

  const gate = await requireAdminPermissionApi(ACTION_PERMISSION[action]);
  if ("error" in gate) return gate.error;
  if (!isSupabaseConfigured()) return bad("Database not configured.", 503);

  const admin = createAdminSupabaseClient();
  const actor = gate;
  const audit = (
    auditAction: string,
    entityType: string,
    entityId: string,
    extra: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; metadata?: Record<string, unknown> } = {},
  ) =>
    writeAudit({
      actorEmail: actor.email,
      actorUserId: actor.userId,
      action: auditAction,
      entityType,
      entityId,
      before: extra.before ?? null,
      after: extra.after ?? null,
      metadata: { source: actor.source, ...(extra.metadata ?? {}) },
    });

  try {
    switch (action) {
      case "approve_organization": {
        const orgId = uuidField(body, "organizationId");
        if (!orgId) return bad("organizationId must be an organization id.");
        const { data: before } = await admin.from("organizations").select("status").eq("id", orgId).maybeSingle();
        if (!before) return bad("Organization not found.", 404);
        const updated = await admin.from("organizations").update({ status: "active" }).eq("id", orgId);
        if (updated.error) throw updated.error;
        await admin.from("employer_onboarding").update({ approval_status: "approved" }).eq("organization_id", orgId);
        await admin.from("hiring_roles").update({ invites_enabled: true }).eq("organization_id", orgId);
        await audit("admin.org.approved", "organization", orgId, { before, after: { status: "active" } });
        return NextResponse.json({ ok: true });
      }
      case "connect_user_to_org": {
        const userId = uuidField(body, "userId");
        const organizationId = uuidField(body, "organizationId");
        const role = typeof body.role === "string" && body.role ? body.role : "hiring_manager";
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (!userId || !organizationId) return bad("userId and organizationId must be ids.");
        if (!isOrgRole(role)) return bad("role must be owner, admin, hiring_manager, reviewer or viewer.");
        if (reason.length < 10 || reason.length > 500) {
          return bad("Give a reason of at least 10 characters; it is recorded in the audit log.");
        }
        const [{ data: org }, { data: userRow }] = await Promise.all([
          admin.from("organizations").select("id").eq("id", organizationId).maybeSingle(),
          admin.auth.admin.getUserById(userId),
        ]);
        if (!org) return bad("Organization not found.", 404);
        if (!userRow?.user) return bad("User not found.", 404);
        const { data: before } = await admin
          .from("organization_members")
          .select("role, status")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .maybeSingle();
        const write = await admin.from("organization_members").upsert(
          { user_id: userId, organization_id: organizationId, role, status: "active", joined_at: new Date().toISOString() },
          { onConflict: "organization_id,user_id" },
        );
        if (write.error) throw write.error;
        await audit("admin.user.connected", "organization_members", organizationId, {
          before: before ?? null,
          after: { user_id: userId, role, status: "active" },
          metadata: { reason },
        });
        return NextResponse.json({ ok: true });
      }
      case "extend_invitation": {
        const invitationId = uuidField(body, "invitationId");
        const days = Number(body.days ?? 7);
        if (!invitationId) return bad("invitationId must be an invitation id.");
        if (!Number.isInteger(days) || days < 1 || days > 30) return bad("days must be a whole number from 1 to 30.");
        const { data: before } = await admin
          .from("candidate_invitations")
          .select("status, expires_at")
          .eq("id", invitationId)
          .maybeSingle();
        if (!before) return bad("Invitation not found.", 404);
        if (before.status === "revoked" || before.status === "accepted" || before.status === "completed") {
          return bad(`A ${before.status} invitation cannot be extended.`, 409);
        }
        const expires = new Date(Date.now() + days * 86400000).toISOString();
        const write = await admin.from("candidate_invitations").update({ expires_at: expires, status: "sent" }).eq("id", invitationId);
        if (write.error) throw write.error;
        await audit("admin.invitation.extended", "candidate_invitation", invitationId, {
          before,
          after: { status: "sent", expires_at: expires },
          metadata: { days },
        });
        return NextResponse.json({ ok: true });
      }
      case "revoke_invitation": {
        const invitationId = uuidField(body, "invitationId");
        if (!invitationId) return bad("invitationId must be an invitation id.");
        const { data: before } = await admin.from("candidate_invitations").select("status").eq("id", invitationId).maybeSingle();
        if (!before) return bad("Invitation not found.", 404);
        const write = await admin
          .from("candidate_invitations")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("id", invitationId);
        if (write.error) throw write.error;
        await admin
          .from("simulation_assignments")
          .update({ status: "cancelled" })
          .eq("invitation_id", invitationId)
          .neq("status", "submitted");
        await audit("admin.invitation.revoked", "candidate_invitation", invitationId, { before, after: { status: "revoked" } });
        return NextResponse.json({ ok: true });
      }
      case "cancel_session": {
        const sessionId = uuidField(body, "sessionId");
        const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : "admin_cancel";
        if (!sessionId) return bad("sessionId must be a session id.");
        const write = await admin
          .from("pilot_simulation_sessions")
          .update({ status: "cancelled", locked_at: new Date().toISOString() })
          .eq("id", sessionId)
          .not("status", "in", "(submitted,cancelled)")
          .select("id");
        if (write.error) throw write.error;
        const changed = (write.data ?? []).length > 0;
        await audit("admin.session.cancelled", "pilot_simulation_session", sessionId, {
          after: changed ? { status: "cancelled" } : null,
          metadata: { reason, outcome: changed ? "applied" : "noop" },
        });
        return NextResponse.json({ ok: true, changed });
      }
      case "retry_email": {
        const outboxId = uuidField(body, "outboxId");
        if (!outboxId) return bad("outboxId must be an outbox id.");
        const write = await admin
          .from("email_outbox")
          .update({ status: "pending", last_error: null, scheduled_for: new Date().toISOString() })
          .eq("id", outboxId)
          .eq("status", "failed")
          .select("id");
        if (write.error) throw write.error;
        const changed = (write.data ?? []).length > 0;
        await audit("admin.email.retry", "email_outbox", outboxId, { metadata: { outcome: changed ? "applied" : "noop" } });
        if (!changed) return bad("Only a failed email can be retried.", 409);
        return NextResponse.json({ ok: true });
      }
      case "requeue_report": {
        const reportId = uuidField(body, "reportId");
        if (!reportId) return bad("reportId must be a report id.");
        const { data: before } = await admin.from("evidence_reports_v2").select("status").eq("id", reportId).maybeSingle();
        if (!before) return bad("Report not found.", 404);
        const write = await admin.from("evidence_reports_v2").update({ status: "awaiting_human_review" }).eq("id", reportId);
        if (write.error) throw write.error;
        await audit("admin.report.requeued", "evidence_reports_v2", reportId, { before, after: { status: "awaiting_human_review" } });
        return NextResponse.json({ ok: true });
      }
      case "explain_setup_required": {
        const userId = uuidField(body, "userId");
        if (!userId) return bad("userId must be a user id.");
        const [{ data: membership }, { data: onboarding }, { data: candidate }] = await Promise.all([
          admin.from("organization_members").select("organization_id, role, status, joined_at").eq("user_id", userId),
          admin
            .from("employer_onboarding")
            .select("organization_id, approval_status, current_step, completed_at")
            .eq("user_id", userId)
            .maybeSingle(),
          admin.from("pilot_candidates").select("id").eq("auth_user_id", userId),
        ]);
        await audit("admin.user.routing_explained", "user", userId);
        return NextResponse.json({
          memberships: membership || [],
          onboarding,
          candidateLinks: candidate || [],
        });
      }
    }
  } catch (err) {
    console.error("[admin/repair]", action, err);
    return bad("The repair did not complete. Check the record's current state and the audit log before retrying.", 500);
  }
}
