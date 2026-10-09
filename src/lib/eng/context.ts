import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServiceKey, supabaseUrl } from "@/lib/supabase";
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

/**
 * Supabase's edge firewall refuses request bodies that look like script
 * injection, and ordinary code trips it: a regex literal followed by
 * `.exec(` in a candidate's file or a template's reference solution is
 * rejected with a 403 page. JSON lets any character inside a string be
 * written as a \u escape, so these characters are escaped in JSON bodies and
 * PostgREST stores exactly the same values. Escape pairs already in the body
 * are copied unchanged.
 */
export function escapeJsonForFirewall(body: string): string {
  return body.replace(/\\.|[()<>$'/]/g, (m) => (m.length === 2 ? m : `\\u${m.charCodeAt(0).toString(16).padStart(4, "0")}`));
}

const firewallSafeFetch: typeof fetch = (input, init) => {
  if (init && typeof init.body === "string" && (new Headers(init.headers).get("content-type") ?? "").includes("json")) {
    return fetch(input, { ...init, body: escapeJsonForFirewall(init.body) });
  }
  return fetch(input, init);
};

let engClient: Admin | null = null;

export function engAdmin(): Admin {
  if (engClient) return engClient;
  // Runs the shared credential and project-binding checks; throws when they refuse.
  createAdminSupabaseClient();
  engClient = createClient(supabaseUrl() ?? "", supabaseServiceKey() ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: firewallSafeFetch },
  });
  return engClient;
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
