import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { InvitationRow } from "@/lib/eng/types";

export type ProfileSimulation = {
  id: string;
  title: string;
  organization: string;
  kind: "Engineering task" | "Simulation";
  status: string;
  completedAt: string | null;
  receipt: string | null;
  href: string;
};

type SessionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  organizations: { name: string } | null;
  sim_templates: { title: string } | null;
};

/**
 * Finished evaluations for the owner's own profile. Results belong to the
 * inviting company, so this list is never included in a shared profile.
 */
export async function listProfileSimulations(ownerId: string): Promise<ProfileSimulation[]> {
  const db = createAdminSupabaseClient();
  const [{ data: attempts }, { data: sessions }, { data: credentials }] = await Promise.all([
    db.from("eng_attempts").select("id, invitation_id, status, submitted_at").eq("candidate_user_id", ownerId).eq("status", "submitted").eq("is_preview", false),
    db
      .from("sim_sessions")
      .select("id, status, submitted_at, organizations(name), sim_templates(title)")
      .eq("candidate_user_id", ownerId)
      .not("submitted_at", "is", null),
    db.from("sim_credentials").select("session_id, credential_number, status").eq("candidate_user_id", ownerId),
  ]);

  const attemptRows = (attempts ?? []) as { id: string; invitation_id: string; status: string; submitted_at: string | null }[];
  const invitationIds = attemptRows.map((a) => a.invitation_id);
  const { data: invitations } = invitationIds.length
    ? await db.from("eng_invitations").select("id, role_snapshot").in("id", invitationIds)
    : { data: [] };
  const roleByInvite = new Map(
    ((invitations ?? []) as Pick<InvitationRow, "id" | "role_snapshot">[]).map((i) => [i.id, i.role_snapshot]),
  );
  const receiptBySession = new Map(
    ((credentials ?? []) as { session_id: string; credential_number: string; status: string }[])
      .filter((c) => c.status !== "revoked")
      .map((c) => [c.session_id, c.credential_number]),
  );

  const items: ProfileSimulation[] = [
    ...attemptRows.map((a) => {
      const role = roleByInvite.get(a.invitation_id);
      return {
        id: `eng-${a.id}`,
        title: role?.title ?? "Engineering task",
        organization: role?.organizationName ?? "",
        kind: "Engineering task" as const,
        status: "Submitted",
        completedAt: a.submitted_at,
        receipt: null,
        href: `/assess/${a.id}`,
      };
    }),
    ...((sessions ?? []) as unknown as SessionRow[]).map((s) => ({
      id: `sim-${s.id}`,
      title: s.sim_templates?.title ?? "Simulation",
      organization: s.organizations?.name ?? "",
      kind: "Simulation" as const,
      status: s.status === "submitted" ? "Being reviewed" : "Completed",
      completedAt: s.submitted_at,
      receipt: receiptBySession.get(s.id) ?? null,
      href: `/sim/${s.id}/result`,
    })),
  ];
  return items.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}
