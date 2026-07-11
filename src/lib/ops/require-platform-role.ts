import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import {
  ensureBootstrapRole,
  listActiveRolesForEmail,
  type PlatformAdminContext,
  type PlatformRole,
} from "@/lib/ops/platform-roles";

async function resolveAdminContext(
  allowedRoles: PlatformRole[]
): Promise<PlatformAdminContext | null> {
  const session = await getAdminSession();
  if (!session?.email) return null;

  let roles = await listActiveRolesForEmail(session.email);
  if (roles.length === 0) {
    roles = await ensureBootstrapRole(session.email);
  }

  const permitted = roles.some((role) => allowedRoles.includes(role));
  if (!permitted) return null;

  return {
    email: session.email,
    userId: null,
    roles,
    source: roles.includes("super_admin") ? "bootstrap_env" : "platform_role",
  };
}

export async function requirePlatformRole(
  allowedRoles: PlatformRole[] = ["super_admin", "admin", "operator"]
): Promise<PlatformAdminContext> {
  const ctx = await resolveAdminContext(allowedRoles);
  if (!ctx) {
    const session = await getAdminSession();
    if (!session) redirect("/login?next=admin");
    redirect("/admin/forbidden");
  }
  return ctx;
}

export async function requirePlatformRoleApi(
  allowedRoles: PlatformRole[] = ["super_admin", "admin", "operator"]
): Promise<PlatformAdminContext | { error: Response }> {
  const session = await getAdminSession();
  if (!session?.email) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }
  const ctx = await resolveAdminContext(allowedRoles);
  if (!ctx) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) };
  }
  return ctx;
}
