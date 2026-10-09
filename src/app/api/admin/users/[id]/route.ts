import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/security/request-body";
import { requireAdminPermissionApi, requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { listActiveRolesForUserId, writeAudit, type PlatformRole } from "@/lib/ops/platform-roles";
import { ADMIN_SHELL_ROLES, hasPermission, type AdminPermission } from "@/lib/ops/admin-permissions";
import { requireAal2ForSensitiveAction } from "@/lib/ops/mfa";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";

const ROLES: PlatformRole[] = ["super_admin", "admin", "operator", "reviewer", "support"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Supabase Auth has no permanent ban; a century is effectively one, and "none" lifts it. */
const SUSPEND_BAN_DURATION = "876000h";

const ACTION_PERMISSION: Record<string, AdminPermission> = {
  "send-reset": "accounts.support",
  suspend: "accounts.suspend",
  reactivate: "accounts.suspend",
  "grant-role": "roles.manage",
  "revoke-role": "roles.manage",
};

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const shell = await requirePlatformRoleApi(ADMIN_SHELL_ROLES);
  if ("error" in shell) return shell.error;
  const body = await readJsonObject(req);
  const action = typeof body.action === "string" ? body.action : "";
  const permission = ACTION_PERMISSION[action];
  if (!permission) return fail("Unknown action", 400);
  const auth = await requireAdminPermissionApi(permission);
  if ("error" in auth) return auth.error;
  if (!isSupabaseConfigured()) return fail("Supabase required", 503);

  const { id } = await context.params;
  if (!UUID.test(id)) return fail("User not found", 404);
  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(id);
  if (userError || !userData.user) return fail("User not found", 404);
  const targetEmail = userData.user.email || "";
  const isSelf = auth.userId === id || auth.email.toLowerCase() === targetEmail.toLowerCase();

  try {
    if (action === "send-reset") {
      // Never return recovery tokens to the admin UI.
      const { error } = await admin.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${appUrl()}/auth/update-password`,
      });
      if (error) throw error;
      await writeAudit({
        actorEmail: auth.email,
        actorUserId: auth.userId,
        action: "password_reset_sent",
        entityType: "user",
        entityId: id,
      });
      return NextResponse.json({ ok: true, message: "Reset email requested" });
    }

    if (action === "suspend" || action === "reactivate") {
      const suspend = action === "suspend";
      if (suspend && isSelf) return fail("You cannot suspend your own account.", 409);
      const targetRoles = await listActiveRolesForUserId(id);
      if (targetRoles.length > 0 && !hasPermission(auth.roles, "roles.manage")) {
        return fail("Only a super admin can suspend or reactivate a platform admin.", 403);
      }
      const { data: before } = await admin.from("profiles").select("account_status").eq("id", id).maybeSingle();
      // The ban stops sign-in and token refresh; requireUser also rejects a
      // banned user's still-valid access token, so suspension is immediate.
      const { error: banError } = await admin.auth.admin.updateUserById(id, {
        ban_duration: suspend ? SUSPEND_BAN_DURATION : "none",
      });
      if (banError) throw banError;
      const status = suspend ? "suspended" : "active";
      const { error: profileError } = await admin.from("profiles").update({ account_status: status }).eq("id", id);
      if (profileError) throw profileError;
      await writeAudit({
        actorEmail: auth.email,
        actorUserId: auth.userId,
        action: suspend ? "user_suspended" : "user_reactivated",
        entityType: "user",
        entityId: id,
        before: { account_status: (before?.account_status as string | undefined) ?? null },
        after: { account_status: status, auth_banned: suspend },
      });
      return NextResponse.json({ ok: true, message: `User ${status}` });
    }

    const mfa = requireAal2ForSensitiveAction(auth);
    if (mfa.ok === false) return fail(mfa.error, 403);
    const role = typeof body.role === "string" ? (body.role as PlatformRole) : null;
    if (!role || !ROLES.includes(role)) return fail("Invalid role", 400);
    if (action === "revoke-role" && isSelf && role === "super_admin") {
      return fail("Ask another super admin to remove your super admin role.", 409);
    }

    if (action === "grant-role") {
      const { error } = await admin.from("platform_user_roles").insert({ user_id: id, role, is_active: true });
      if (error && error.code !== "23505") throw error;
      if (!error) {
        await writeAudit({
          actorEmail: auth.email,
          actorUserId: auth.userId,
          action: "platform_role_granted",
          entityType: "platform_user_roles",
          entityId: id,
          after: { role },
        });
      }
      return NextResponse.json({ ok: true, message: error ? `${role} was already active` : `Granted ${role}` });
    }

    const { data: revoked, error } = await admin
      .from("platform_user_roles")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("user_id", id)
      .eq("role", role)
      .eq("is_active", true)
      .select("id");
    if (error) throw error;
    if ((revoked ?? []).length > 0) {
      await writeAudit({
        actorEmail: auth.email,
        actorUserId: auth.userId,
        action: "platform_role_revoked",
        entityType: "platform_user_roles",
        entityId: id,
        before: { role },
      });
    }
    return NextResponse.json({ ok: true, message: (revoked ?? []).length > 0 ? `Revoked ${role}` : `${role} was not active` });
  } catch (err) {
    console.error("[admin/users]", action, err);
    return fail("The action did not complete. Check the account's current state before retrying.", 500);
  }
}
