import "server-only";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, engAdmin } from "@/lib/eng/context";
import { isOrgRole } from "@/lib/eng/permissions";
import { listShares } from "@/lib/passport/store";
import type { WorkspaceContexts, WorkspaceOrganization } from "./account";

export async function listOrganizations(userId: string): Promise<WorkspaceOrganization[]> {
  const { data } = await engAdmin()
    .from("organization_members")
    .select("organization_id, role, joined_at, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true, nullsFirst: false });
  return (data ?? []).flatMap((row) => {
    if (!isOrgRole(row.role)) return [];
    const org = row.organizations as { name?: string } | null;
    return [{ id: row.organization_id as string, name: org?.name || "Workspace", role: row.role }];
  });
}

async function hasLiveShare(userId: string): Promise<boolean> {
  const now = Date.now();
  const shares = await listShares(userId);
  return shares.some((s) => !s.revokedAt && (!s.expiresAt || Date.parse(s.expiresAt) > now));
}

export async function loadWorkspaceContexts(userId: string): Promise<WorkspaceContexts> {
  const [organizations, hasPublicProfile, jar] = await Promise.all([
    listOrganizations(userId),
    hasLiveShare(userId).catch(() => false),
    cookies(),
  ]);
  const preferred = jar.get(ACTIVE_ORG_COOKIE)?.value;
  const active = organizations.find((o) => o.id === preferred) ?? organizations[0] ?? null;
  return { organizations, activeOrganizationId: active?.id ?? null, hasPublicProfile };
}
