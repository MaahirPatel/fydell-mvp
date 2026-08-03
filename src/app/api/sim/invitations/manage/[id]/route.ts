import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { resendInvitation, revokeInvitation } from "@/lib/simulations/db";
import { fydellEmailShell, isResendConfigured, sendResendHtml } from "@/lib/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";

/** POST: { action: "revoke" | "resend" } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (body.action === "revoke") {
      await revokeInvitation(id, org.organizationId);
      return NextResponse.json({ ok: true, status: "revoked" });
    }
    if (body.action === "resend") {
      const { invitation, token } = await resendInvitation(id, org.organizationId);
      const inviteUrl = `${appUrl()}/invite/${token}`;
      let delivery = "not_configured";
      if (isResendConfigured()) {
        const sent = await sendResendHtml({
          to: invitation.candidate_email,
          subject: `Reminder: ${org.organizationName} invited you to a Fydell work simulation`,
          html: fydellEmailShell(
            `<p style="margin:0 0 12px">This is a fresh link for your Fydell work simulation from <strong>${org.organizationName}</strong>. Any earlier link no longer works.</p>
             <p style="margin:0 0 20px"><a href="${inviteUrl}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review the invitation</a></p>`
          ),
        });
        delivery = sent.ok ? "sent" : "failed";
      }
      await createAdminSupabaseClient()
        .from("sim_invitations")
        .update({ email_delivery: delivery })
        .eq("id", id);
      return NextResponse.json({ ok: true, status: "resent", inviteUrl, emailDelivery: delivery });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 400 }
    );
  }
}
