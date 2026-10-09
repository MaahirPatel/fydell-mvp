import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase";
import { requireUser } from "@/lib/simulations/auth";
import {
  ensureBootstrapRole,
  listActiveRolesForEmail,
  listActiveRolesForUserId,
  type PlatformAdminContext,
  type PlatformRole,
} from "@/lib/ops/platform-roles";
import { hasPermission, rolesFor, type AdminPermission } from "@/lib/ops/admin-permissions";

/**
 * The caller's admin identity, from either a normal Supabase session whose user
 * holds active platform_user_roles, or the transitional env-credential cookie.
 * Roles are re-read on every request, so revocation takes effect immediately.
 */
export async function resolveAdminIdentity(): Promise<PlatformAdminContext | null> {
  return (await resolveCaller()).admin;
}

/** `signedIn` separates "who are you" (401, sign in) from "not an admin" (403). */
async function resolveCaller(): Promise<{ admin: PlatformAdminContext | null; signedIn: boolean }> {
  let signedIn = false;
  if (isSupabaseAuthConfigured()) {
    const user = await requireUser();
    if (user) {
      signedIn = true;
      const roles = await listActiveRolesForUserId(user.id);
      if (roles.length > 0) {
        let mfaVerified = false;
        try {
          const supabase = await createServerSupabaseClient();
          const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          mfaVerified = data?.currentLevel === "aal2";
        } catch {
          mfaVerified = false;
        }
        return {
          admin: { email: user.email.toLowerCase(), userId: user.id, roles, source: "supabase_session", mfaVerified },
          signedIn,
        };
      }
    }
  }

  const session = await getAdminSession();
  if (!session?.email) return { admin: null, signedIn };
  let roles = await listActiveRolesForEmail(session.email);
  if (roles.length === 0) roles = await ensureBootstrapRole(session.email);
  if (roles.length === 0) return { admin: null, signedIn: true };
  return { admin: { email: session.email, userId: null, roles, source: "env_cookie", mfaVerified: false }, signedIn: true };
}

async function loginRedirectPath(): Promise<string> {
  const requested = (await headers()).get("x-pathname") || "";
  const next = requested.startsWith("/admin/") ? requested : "/admin/overview";
  return `/login?next=${encodeURIComponent(next)}`;
}

function permitted(ctx: PlatformAdminContext, allowed: readonly PlatformRole[]): boolean {
  return ctx.roles.some((role) => allowed.includes(role));
}

export async function requirePlatformRole(
  allowedRoles: readonly PlatformRole[] = ["super_admin", "admin", "operator"]
): Promise<PlatformAdminContext> {
  const { admin: ctx, signedIn } = await resolveCaller();
  if (!ctx) redirect(signedIn ? "/admin/forbidden" : await loginRedirectPath());
  if (!permitted(ctx, allowedRoles)) redirect("/admin/forbidden");
  return ctx;
}

export async function requirePlatformRoleApi(
  allowedRoles: readonly PlatformRole[] = ["super_admin", "admin", "operator"]
): Promise<PlatformAdminContext | { error: Response }> {
  const { admin: ctx, signedIn } = await resolveCaller();
  if (!ctx) {
    return signedIn
      ? { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
      : { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!permitted(ctx, allowedRoles)) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return ctx;
}

/** Page guard by capability. */
export async function requireAdminPermission(permission: AdminPermission): Promise<PlatformAdminContext> {
  return requirePlatformRole(rolesFor(permission));
}

/** API guard by capability. */
export async function requireAdminPermissionApi(
  permission: AdminPermission
): Promise<PlatformAdminContext | { error: Response }> {
  return requirePlatformRoleApi(rolesFor(permission));
}

export function adminCan(ctx: PlatformAdminContext, permission: AdminPermission): boolean {
  return hasPermission(ctx.roles, permission);
}
