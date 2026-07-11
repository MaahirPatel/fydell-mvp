import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { writeAudit } from "@/lib/ops/platform-roles";
import { enqueueEmail } from "@/lib/ops/email-outbox";
import { processEmailOutbox } from "@/lib/ops/process-outbox";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformRoleApi(["super_admin", "admin", "operator", "support"]);
  if ("error" in auth) return auth.error;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required" }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = getSupabaseAdmin();

  const { data: invitation, error } = await admin
    .from("invitations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  try {
    if (action === "revoke") {
      await admin
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", id);
      await writeAudit({
        actorEmail: auth.email,
        action: "invitation_revoked",
        entityType: "invitation",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "resend") {
      const sendCount = (invitation.send_count || 0) + 1;
      const invited = await admin.auth.admin.inviteUserByEmail(invitation.email, {
        redirectTo: `${appUrl()}/login`,
      });
      await admin
        .from("invitations")
        .update({
          status: invited.error ? "failed" : "sent",
          send_count: sendCount,
          last_sent_at: new Date().toISOString(),
          supabase_user_id: invited.data.user?.id || invitation.supabase_user_id,
        })
        .eq("id", id);

      await enqueueEmail({
        eventType: "invitation_resent",
        templateKey:
          invitation.invitation_type === "candidate"
            ? "candidate_work_trial_invite"
            : "organization_member_invite",
        recipientEmail: invitation.email,
        payload: {
          fullName: invitation.email,
          companyName: "your organization",
          siteUrl: appUrl(),
          actionUrl: `${appUrl()}/login`,
        },
        relatedEntityType: "invitation",
        relatedEntityId: id,
        idempotencyKey: `organization-invite:${id}:${sendCount}`,
      });

      await writeAudit({
        actorEmail: auth.email,
        action: "invitation_resent",
        entityType: "invitation",
        entityId: id,
        after: { send_count: sendCount },
      });

      try {
        await processEmailOutbox(5);
      } catch {
        // ignore
      }

      return NextResponse.json({
        ok: true,
        inviteError: invited.error?.message || null,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
