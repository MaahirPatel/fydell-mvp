import { engAdmin, jsonError, requireCandidate } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import type { AttemptRow, InvitationRow } from "@/lib/eng/types";

/**
 * The signed-in candidate's own engineering tasks: attempts they accepted and
 * invitations addressed to their email that are still waiting. Only display
 * fields are returned; tokens, employer notes and other candidates' rows are
 * never read into the response.
 */
export async function GET() {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate.response;
  const user = gate.value;
  const db = engAdmin();

  const [{ data: attemptRows, error: attemptError }, { data: inviteRows, error: inviteError }] = await Promise.all([
    db
      .from("eng_attempts")
      .select("id, invitation_id, status, allowed_minutes, extension_minutes, started_at, due_at, submitted_at, created_at")
      .eq("candidate_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("eng_invitations")
      .select("id, status, expires_at, role_snapshot, allowed_minutes, created_at")
      .eq("candidate_email", user.email.toLowerCase())
      .in("status", ["invited", "accepted"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (attemptError || inviteError) {
    console.error("[eng:candidate-attempts] list failed", attemptError ?? inviteError);
    return jsonError(500, "Could not load your engineering tasks. Try again.");
  }

  type AttemptPick = Pick<
    AttemptRow,
    "id" | "invitation_id" | "status" | "allowed_minutes" | "extension_minutes" | "started_at" | "due_at" | "submitted_at" | "created_at"
  >;
  type InvitePick = Pick<InvitationRow, "id" | "status" | "expires_at" | "role_snapshot" | "allowed_minutes" | "created_at">;
  const attempts = (attemptRows ?? []) as AttemptPick[];
  const invites = (inviteRows ?? []) as InvitePick[];

  const attemptInviteIds = attempts.map((a) => a.invitation_id);
  const snapshots = new Map(invites.map((inv) => [inv.id, inv.role_snapshot]));
  const missing = attemptInviteIds.filter((id) => !snapshots.has(id));
  if (missing.length > 0) {
    const { data } = await db.from("eng_invitations").select("id, role_snapshot").in("id", missing);
    for (const row of (data ?? []) as Pick<InvitationRow, "id" | "role_snapshot">[]) snapshots.set(row.id, row.role_snapshot);
  }

  const attempted = new Set(attemptInviteIds);
  return ok({
    attempts: attempts.map((a) => {
      const snap = snapshots.get(a.invitation_id);
      return {
        id: a.id,
        status: a.status,
        roleTitle: snap?.title ?? "Engineering task",
        organizationName: snap?.organizationName ?? "",
        allowedMinutes: a.allowed_minutes + a.extension_minutes,
        startedAt: a.started_at,
        dueAt: a.due_at,
        submittedAt: a.submitted_at,
        createdAt: a.created_at,
      };
    }),
    invitations: invites
      .filter((inv) => inv.status === "invited" && !attempted.has(inv.id))
      .map((inv) => ({
        id: inv.id,
        roleTitle: inv.role_snapshot.title,
        organizationName: inv.role_snapshot.organizationName,
        allowedMinutes: inv.allowed_minutes,
        expiresAt: inv.expires_at,
      })),
  });
}
