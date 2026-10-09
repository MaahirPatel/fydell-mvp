import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/simulations/auth";
import { isOrgRole, roleCan, type EngAction, type OrgRole } from "./permissions";

export { ACTIVE_ORG_COOKIE };

export interface EngMember {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: OrgRole;
}

export type Admin = ReturnType<typeof createAdminSupabaseClient>;

export function engAdmin(): Admin {
  return createAdminSupabaseClient();
}

/**
 * Resolve the caller's active membership. A person in several workspaces uses
 * the one named by the active-org cookie; otherwise the earliest joined. The
 * membership is re-read on every request, so removal takes effect immediately.
 */
export async function resolveMembership(userId: string, email: string): Promise<EngMember | null> {
  const db = engAdmin();
  const { data } = await db
    .from("organization_members")
    .select("organization_id, role, joined_at, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true, nullsFirst: false });
  const rows = (data ?? []).filter((row) => isOrgRole(row.role));
  if (rows.length === 0) return null;
  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const row = rows.find((r) => r.organization_id === preferred) ?? rows[0];
  const org = row.organizations as { name?: string } | null;
  return {
    userId,
    email,
    organizationId: row.organization_id as string,
    organizationName: org?.name || "Your workspace",
    role: row.role as OrgRole,
  };
}

export type Gate<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

export function jsonError(status: number, error: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function requireEngAction(action: EngAction): Promise<Gate<EngMember>> {
  const user = await requireUser();
  if (!user) return { ok: false, response: jsonError(401, "Sign in to continue.") };
  const member = await resolveMembership(user.id, user.email);
  if (!member) return { ok: false, response: jsonError(403, "You are not an active member of a workspace.") };
  if (!roleCan(member.role, action)) {
    return { ok: false, response: jsonError(403, "Your role in this workspace does not allow this action.") };
  }
  return { ok: true, value: member };
}

export async function requireCandidate(): Promise<Gate<{ id: string; email: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, response: jsonError(401, "Sign in to continue.") };
  return { ok: true, value: user };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
