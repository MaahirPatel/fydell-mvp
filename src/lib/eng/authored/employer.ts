import "server-only";
import type { Admin, EngMember } from "../context";
import { AttemptError } from "../attempts";
import { acceptInvitationById, createInvitation } from "../invitations";
import { recordEngEvent } from "../events";
import type { PackageFile } from "../authoring/package";
import type { AttemptRow, InvitationRow, RoleRow, SubmissionRow, UploadRow } from "../types";
import { readSubmittedFiles } from "./evaluation-run";

/** The files exactly as sealed at submission, verified against the recorded hash. Null if the archive cannot be read. */
export async function sealedSubmissionFiles(db: Admin, submission: Pick<SubmissionRow, "upload_id">): Promise<PackageFile[] | null> {
  const { data } = await db.from("eng_uploads").select("storage_path, sha256").eq("id", submission.upload_id).maybeSingle();
  if (!data) return null;
  try {
    return await readSubmittedFiles(db, data as Pick<UploadRow, "storage_path" | "sha256">);
  } catch {
    return null;
  }
}

export type AuthoredVersionOption = { id: string; title: string; version: number; publishedAt: string };

/** Published employer-authored versions this workspace can invite to or preview, newest version of each draft first. */
export async function listAuthoredVersionOptions(db: Admin, organizationId: string): Promise<AuthoredVersionOption[]> {
  const { data } = await db
    .from("eng_scenario_versions")
    .select("id, title, version, published_at, draft_id, archived_at")
    .eq("organization_id", organizationId)
    .eq("origin", "employer_authored")
    .eq("status", "published")
    .eq("purpose", "hiring")
    .order("version", { ascending: false })
    .limit(100);
  const seen = new Set<string>();
  const out: AuthoredVersionOption[] = [];
  for (const r of data ?? []) {
    if (r.archived_at) continue;
    const key = (r.draft_id as string | null) ?? (r.id as string);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: r.id as string, title: r.title as string, version: r.version as number, publishedAt: r.published_at as string });
  }
  return out;
}

/**
 * Starts (or resumes) the employer's own preview attempt of a work sample.
 * Preview invitations and attempts carry is_preview = true, are never
 * emailed, and are excluded from role counts and hiring outcomes.
 */
export async function startPreviewAttempt(db: Admin, member: EngMember, role: RoleRow, scenarioVersionId: string): Promise<AttemptRow> {
  const email = member.email.toLowerCase();
  const { data: active } = await db
    .from("eng_invitations")
    .select("*")
    .eq("role_id", role.id)
    .eq("candidate_email", email)
    .in("status", ["invited", "accepted"])
    .maybeSingle();
  const existing = active as InvitationRow | null;
  if (existing && !existing.is_preview) throw new AttemptError("You already have a candidate invitation for this role under your own email. Withdraw it before previewing.", 409);
  if (existing) {
    const { data: attempt } = await db.from("eng_attempts").select("*").eq("invitation_id", existing.id).maybeSingle();
    const open = attempt && ["accepted", "preflight_passed", "in_progress"].includes(attempt.status as string);
    if (existing.scenario_version_id === scenarioVersionId && (!attempt || open)) {
      return attempt ? (attempt as AttemptRow) : acceptInvitationById(db, existing.id, { id: member.userId, email });
    }
    // A finished or different-version preview is closed so a fresh one can start.
    await db.from("eng_invitations").update({ status: "withdrawn", withdrawn_at: new Date().toISOString(), withdrawn_by: member.userId }).eq("id", existing.id);
    if (attempt && open) {
      await db.from("eng_attempts").update({ status: "withdrawn" }).eq("id", attempt.id as string);
      await recordEngEvent(db, attempt.id as string, { type: "attempt_withdrawn", actor: "employer", actorUserId: member.userId, actorEmail: member.email, payload: { reason: "Replaced by a new preview" } });
    }
  }
  const { invitation } = await createInvitation(db, member, role, { email, name: "Preview" }, { scenarioVersionId, preview: true });
  return acceptInvitationById(db, invitation.id, { id: member.userId, email });
}
