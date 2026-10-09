import "server-only";
import type { Admin, EngMember } from "./context";
import { isOrgRole, type OrgRole } from "./permissions";
import { writeAudit } from "@/lib/ops/platform-roles";
import { assertInboxVerified } from "@/lib/security/email-verification";

export interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  status: "invited" | "active" | "suspended" | "removed";
  email: string | null;
  joined_at: string | null;
}

async function emailsFor(db: Admin, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (userIds.length === 0) return out;
  const { data } = await db.from("profiles").select("id, email").in("id", userIds);
  for (const row of data ?? []) if (row.email) out.set(row.id as string, row.email as string);
  for (const id of userIds) {
    if (out.has(id)) continue;
    const { data: user } = await db.auth.admin.getUserById(id);
    if (user?.user?.email) out.set(id, user.user.email);
  }
  return out;
}

export async function listMembers(db: Admin, organizationId: string): Promise<MemberRow[]> {
  const { data } = await db
    .from("organization_members")
    .select("id, user_id, role, status, joined_at")
    .eq("organization_id", organizationId)
    .in("status", ["invited", "active", "suspended"])
    .order("joined_at", { ascending: true, nullsFirst: false });
  const rows = (data ?? []).filter((r) => isOrgRole(r.role));
  const emails = await emailsFor(db, rows.map((r) => r.user_id as string));
  return rows.map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    role: r.role as OrgRole,
    status: r.status as MemberRow["status"],
    email: emails.get(r.user_id as string) ?? null,
    joined_at: (r.joined_at as string) ?? null,
  }));
}

async function findUserIdByEmail(db: Admin, email: string): Promise<string | null> {
  const { data } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (data?.id) return data.id as string;
  for (let page = 1; page <= 10; page++) {
    const { data: listed } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const users = listed?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match) return match.id;
    if (users.length < 200) break;
  }
  return null;
}

async function activeOwnerCount(db: Admin, organizationId: string): Promise<number> {
  const { count } = await db
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .eq("status", "active");
  return count ?? 0;
}

/**
 * Adds an existing Fydell account as an invited member. Membership becomes
 * active only when that person accepts it; nobody joins silently.
 */
export async function inviteMember(db: Admin, actor: EngMember, emailRaw: string, role: OrgRole): Promise<{ status: "invited" | "already_member" }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (role === "owner" && actor.role !== "owner") throw new Error("Only an owner can add another owner.");
  const userId = await findUserIdByEmail(db, email);
  if (!userId) throw new Error("No Fydell account uses that email yet. Ask them to sign up first, then add them here.");
  const { data: existing } = await db
    .from("organization_members")
    .select("id, status")
    .eq("organization_id", actor.organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.status === "active") return { status: "already_member" };
  if (existing) {
    const { error } = await db.from("organization_members").update({ role, status: "invited", invited_by: actor.userId, invited_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw new Error(`Could not invite: ${error.message}`);
  } else {
    const { error } = await db.from("organization_members").insert({
      organization_id: actor.organizationId,
      user_id: userId,
      role,
      status: "invited",
      invited_by: actor.userId,
      invited_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Could not invite: ${error.message}`);
  }
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "organization_member_invited",
    entityType: "organization_members",
    organizationId: actor.organizationId,
    after: { email, role },
  });
  return { status: "invited" };
}

export async function changeMemberRole(db: Admin, actor: EngMember, memberId: string, role: OrgRole): Promise<void> {
  const { data: target } = await db
    .from("organization_members")
    .select("id, user_id, role, status")
    .eq("id", memberId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (!target) throw new Error("Member not found.");
  if ((target.role === "owner" || role === "owner") && actor.role !== "owner") throw new Error("Only an owner can change owner roles.");
  if (target.role === "owner" && role !== "owner" && (await activeOwnerCount(db, actor.organizationId)) <= 1) {
    throw new Error("A workspace needs at least one owner.");
  }
  const { error } = await db.from("organization_members").update({ role }).eq("id", memberId).eq("organization_id", actor.organizationId);
  if (error) throw new Error(`Could not change the role: ${error.message}`);
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "organization_member_role_changed",
    entityType: "organization_members",
    entityId: memberId,
    organizationId: actor.organizationId,
    before: { role: target.role },
    after: { role },
  });
}

/** Removal is immediate: every engineering route re-reads active membership per request. */
export async function removeMember(db: Admin, actor: EngMember, memberId: string): Promise<void> {
  const { data: target } = await db
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (!target) throw new Error("Member not found.");
  if (target.role === "owner" && actor.role !== "owner") throw new Error("Only an owner can remove an owner.");
  if (target.role === "owner" && (await activeOwnerCount(db, actor.organizationId)) <= 1) throw new Error("A workspace needs at least one owner.");
  const { error } = await db.from("organization_members").update({ status: "removed" }).eq("id", memberId).eq("organization_id", actor.organizationId);
  if (error) throw new Error(`Could not remove the member: ${error.message}`);
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "organization_member_removed",
    entityType: "organization_members",
    entityId: memberId,
    organizationId: actor.organizationId,
    before: { role: target.role, userId: target.user_id },
  });
}

export async function pendingMemberships(db: Admin, userId: string) {
  const { data } = await db
    .from("organization_members")
    .select("id, role, organization_id, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "invited");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    role: r.role as OrgRole,
    organizationId: r.organization_id as string,
    organizationName: ((r.organizations as { name?: string } | null)?.name) ?? "A workspace",
  }));
}

/** Invites resolve an email to an account, so joining needs proof of that inbox. */
export async function acceptMembership(db: Admin, user: { id: string; email: string }, membershipId: string): Promise<string> {
  await assertInboxVerified(user);
  const { data, error } = await db
    .from("organization_members")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("user_id", user.id)
    .eq("status", "invited")
    .select("organization_id")
    .maybeSingle();
  if (error || !data) throw new Error("That invitation is no longer available.");
  return data.organization_id as string;
}
