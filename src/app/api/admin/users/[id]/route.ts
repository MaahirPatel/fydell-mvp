import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { writeAudit, type PlatformRole } from "@/lib/ops/platform-roles";
import { requireAal2ForSensitiveAction } from "@/lib/ops/mfa";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";

const ROLES: PlatformRole[] = ["super_admin", "admin", "operator", "reviewer", "support"];

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformRoleApi(["super_admin", "admin", "support"]);
  if ("error" in auth) return auth.error;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required" }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = getSupabaseAdmin();

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(id);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const targetEmail = userData.user.email || "";

  try {
    if (action === "send-reset") {
      // Never return recovery tokens to the admin UI.
      const { error } = await admin.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${appUrl()}/auth/update-password`,
      });
      if (error) throw error;
      await writeAudit({
        actorEmail: auth.email,
        action: "password_reset_sent",
        entityType: "user",
        entityId: id,
        after: { email: targetEmail },
      });
      return NextResponse.json({ ok: true, message: "Reset email requested" });
    }

    if (action === "suspend" || action === "reactivate") {
      const status = action === "suspend" ? "suspended" : "active";
      await admin.from("profiles").upsert({
        id,
        email: targetEmail,
        account_status: status,
      });
      await writeAudit({
        actorEmail: auth.email,
        action: action === "suspend" ? "user_suspended" : "user_reactivated",
        entityType: "user",
        entityId: id,
        after: { account_status: status },
      });
      return NextResponse.json({ ok: true, message: `User ${status}` });
    }

    if (action === "grant-role" || action === "revoke-role") {
      if (!auth.roles.includes("super_admin")) {
        return NextResponse.json(
          { error: "Only super_admin can change platform roles." },
          { status: 403 }
        );
      }
      const mfa = requireAal2ForSensitiveAction(auth);
      if (mfa.ok === false && process.env.ADMIN_MFA_REQUIRED === "true") {
        return NextResponse.json({ error: mfa.error }, { status: 403 });
      }

      const role = String(body.role || "") as PlatformRole;
      if (!ROLES.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      if (action === "grant-role") {
        const { error } = await admin.from("platform_user_roles").insert({
          user_id: id,
          role,
          is_active: true,
        });
        if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
        await writeAudit({
          actorEmail: auth.email,
          action: "platform_role_granted",
          entityType: "platform_user_roles",
          entityId: id,
          after: { role },
        });
        return NextResponse.json({ ok: true, message: `Granted ${role}` });
      }

      const { error } = await admin
        .from("platform_user_roles")
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq("user_id", id)
        .eq("role", role)
        .eq("is_active", true);
      if (error) throw error;
      await writeAudit({
        actorEmail: auth.email,
        action: "platform_role_revoked",
        entityType: "platform_user_roles",
        entityId: id,
        after: { role },
      });
      return NextResponse.json({ ok: true, message: `Revoked ${role}` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
