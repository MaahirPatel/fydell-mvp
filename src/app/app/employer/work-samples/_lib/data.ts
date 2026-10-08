import "server-only";
import type { Admin } from "@/lib/eng/context";

export type InvitationItem = {
  id: string;
  roleId: string;
  roleTitle: string;
  candidate: string;
  status: "invited" | "accepted";
  workSample: string;
  expiresAt: string;
};

export type SubmissionItem = {
  attemptId: string;
  roleTitle: string;
  candidate: string;
  workSample: string;
  submittedAt: string | null;
};

type InvitationRow = {
  id: string;
  role_id: string;
  scenario_version_id: string;
  candidate_email: string;
  candidate_handle: string | null;
  candidate_name: string | null;
  status: "invited" | "accepted";
  expires_at: string;
};

type AttemptRow = { id: string; invitation_id: string; role_id: string; scenario_version_id: string; submitted_at: string | null };

async function labels(db: Admin, roleIds: string[], versionIds: string[]) {
  const [{ data: roles }, { data: versions }] = await Promise.all([
    roleIds.length ? db.from("eng_roles").select("id, title").in("id", roleIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    versionIds.length ? db.from("eng_scenario_versions").select("id, title, version").in("id", versionIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string; version: number }> }),
  ]);
  const role = new Map((roles ?? []).map((r) => [r.id as string, r.title as string]));
  const version = new Map((versions ?? []).map((v) => [v.id as string, `${v.title as string}, version ${v.version as number}`]));
  return { role, version };
}

const who = (i: Pick<InvitationRow, "candidate_handle" | "candidate_name" | "candidate_email">) => (i.candidate_handle ? `@${i.candidate_handle}` : i.candidate_name || i.candidate_email);

/** Open invitations across the workspace's engineering roles. Preview invitations are excluded. */
export async function listActiveInvitations(db: Admin, organizationId: string): Promise<InvitationItem[]> {
  const { data } = await db
    .from("eng_invitations")
    .select("id, role_id, scenario_version_id, candidate_email, candidate_handle, candidate_name, status, expires_at")
    .eq("organization_id", organizationId)
    .eq("is_preview", false)
    .in("status", ["invited", "accepted"])
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as InvitationRow[];
  const { role, version } = await labels(db, [...new Set(rows.map((r) => r.role_id))], [...new Set(rows.map((r) => r.scenario_version_id))]);
  return rows.map((r) => ({
    id: r.id,
    roleId: r.role_id,
    roleTitle: role.get(r.role_id) ?? "Role",
    candidate: who(r),
    status: r.status,
    workSample: version.get(r.scenario_version_id) ?? "Work sample",
    expiresAt: r.expires_at,
  }));
}

/** Submitted attempts, newest first. Each links to the existing attempt review page. */
export async function listSubmissions(db: Admin, organizationId: string): Promise<SubmissionItem[]> {
  const { data } = await db
    .from("eng_attempts")
    .select("id, invitation_id, role_id, scenario_version_id, submitted_at")
    .eq("organization_id", organizationId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as AttemptRow[];
  if (rows.length === 0) return [];
  const [{ data: invs }, names] = await Promise.all([
    db.from("eng_invitations").select("id, candidate_email, candidate_handle, candidate_name").in("id", [...new Set(rows.map((r) => r.invitation_id))]),
    labels(db, [...new Set(rows.map((r) => r.role_id))], [...new Set(rows.map((r) => r.scenario_version_id))]),
  ]);
  const inv = new Map(((invs ?? []) as Array<Pick<InvitationRow, "id" | "candidate_email" | "candidate_handle" | "candidate_name">>).map((i) => [i.id, who(i)]));
  return rows.map((r) => ({
    attemptId: r.id,
    roleTitle: names.role.get(r.role_id) ?? "Role",
    candidate: inv.get(r.invitation_id) ?? "Candidate",
    workSample: names.version.get(r.scenario_version_id) ?? "Work sample",
    submittedAt: r.submitted_at,
  }));
}
