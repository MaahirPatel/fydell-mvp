import "server-only";
import { createHash, randomUUID } from "crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type PlatformRole = "super_admin" | "admin" | "operator" | "reviewer" | "support";

export type PlatformAdminContext = {
  email: string;
  userId: string | null;
  roles: PlatformRole[];
  source: "platform_role" | "bootstrap_env";
};

const OPS_ROLES: PlatformRole[] = ["super_admin", "admin", "operator", "reviewer", "support"];

export function bootstrapAdminEmail(): string {
  return (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@fydell.com")
    .trim()
    .toLowerCase();
}

export function adminNotificationEmail(): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    bootstrapAdminEmail()
  )
    .trim()
    .toLowerCase();
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.NEXTAUTH_SECRET || "fydell";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function listActiveRolesForEmail(email: string): Promise<PlatformRole[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (usersError) throw usersError;

  const users = (usersData?.users || []) as Array<{ id: string; email?: string | null }>;
  const user = users.find((u) => (u.email || "").toLowerCase() === normalized);
  if (!user) return [];

  const { data, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) throw error;
  return (data || [])
    .map((row) => row.role as PlatformRole)
    .filter((role) => OPS_ROLES.includes(role));
}

export async function ensureBootstrapRole(email: string): Promise<PlatformRole[]> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== bootstrapAdminEmail()) {
    return listActiveRolesForEmail(normalized);
  }

  if (!isSupabaseConfigured()) {
    return ["super_admin"];
  }

  const existing = await listActiveRolesForEmail(normalized);
  if (existing.length > 0) return existing;

  const admin = getSupabaseAdmin();
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const listedUsers = (listed?.users || []) as Array<{ id: string; email?: string | null }>;
  let user = listedUsers.find((u) => (u.email || "").toLowerCase() === normalized);

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: { full_name: "Fydell Admin" },
    });
    if (created.error || !created.data.user) {
      throw created.error || new Error("Could not create bootstrap admin user");
    }
    user = created.data.user as { id: string; email?: string | null };
  }

  const { error } = await admin.from("platform_user_roles").upsert(
    {
      user_id: user.id,
      role: "super_admin",
      is_active: true,
      granted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,role", ignoreDuplicates: false }
  );

  // Unique partial index may not map to onConflict; fall back to insert-ignore
  if (error) {
    const { error: insertError } = await admin.from("platform_user_roles").insert({
      id: randomUUID(),
      user_id: user.id,
      role: "super_admin",
      is_active: true,
    });
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      throw insertError;
    }
  }

  await writeAudit({
    actorEmail: normalized,
    actorUserId: user.id,
    action: "platform_role_granted",
    entityType: "platform_user_roles",
    entityId: user.id,
    after: { role: "super_admin" },
    metadata: { source: "bootstrap" },
  });

  return ["super_admin"];
}

export async function writeAudit(input: {
  actorEmail?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgent?: string | null;
}) {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  await admin.from("audit_logs").insert({
    actor_user_id: input.actorUserId || null,
    actor_email: input.actorEmail || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    organization_id: input.organizationId || null,
    before_data: input.before || null,
    after_data: input.after || null,
    metadata: input.metadata || {},
    ip_hash: input.ipHash || null,
    user_agent: input.userAgent || null,
  });
}
