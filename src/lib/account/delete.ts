import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireOrgMember } from "@/lib/simulations/auth";
import { IMAGE_BUCKET } from "@/lib/passport/presentation-store";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

/** Every file under `<userId>/<presentationId>/`, including any no row points to. */
async function storedImagePaths(admin: AdminClient, userId: string): Promise<string[]> {
  const bucket = admin.storage.from(IMAGE_BUCKET);
  const { data: folders } = await bucket.list(userId, { limit: 1000 });
  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    for (const file of files ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  return paths;
}

export type DeletionResult = { ok: true } | { ok: false; status: number; error: string };

const CONFIRM_PHRASE = "delete my account";

export function confirmPhraseMatches(input: unknown): boolean {
  return typeof input === "string" && input.trim().toLowerCase() === CONFIRM_PHRASE;
}

/**
 * Deletes an engineer's account.
 *
 * The engineer's own content is erased: projects, project presentations and
 * their images, findings, notes, contribution context, profile, connected
 * accounts, editor imports, notifications and import jobs. Share links are revoked and open applications withdrawn, so employers
 * lose access to the evidence.
 *
 * Employer-owned records stay: decisions, private notes, requirement reviews and
 * the application rows. Hard-deleting the auth user or the passport would cascade
 * into those tables, so the passport row is kept as an empty tombstone and the
 * auth user is soft-deleted, which disables sign-in and clears its identity.
 */
export async function deleteEngineerAccount(userId: string): Promise<DeletionResult> {
  if (await requireOrgMember(userId)) {
    return { ok: false, status: 409, error: "You're a member of a hiring team. Ask an admin to remove you from the team first, then delete your account." };
  }
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const done: string[] = [];
  const step = async (label: string, run: () => PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await run();
    if (error) throw new Error(`${label}: ${error.message}`);
    done.push(label);
  };

  const { data: passport } = await admin.from("passports").select("id").eq("owner_id", userId).maybeSingle();
  const passportId = (passport as { id: string } | null)?.id ?? null;

  try {
    await step("applications withdrawn", () =>
      admin.from("role_applications").update({ status: "withdrawn", withdrawn_at: now, updated_at: now }).eq("applicant_user_id", userId).eq("status", "submitted"),
    );

    if (passportId) {
      await step("share links revoked", () => admin.from("passport_shares").update({ revoked_at: now }).eq("passport_id", passportId).is("revoked_at", null));
      const { data: projects } = await admin.from("passport_projects").select("id").eq("passport_id", passportId);
      const projectIds = ((projects ?? []) as { id: string }[]).map((p) => p.id);
      if (projectIds.length) {
        await step("review links detached", () => admin.from("requirement_evidence_mappings").update({ evidence_project_id: null }).in("evidence_project_id", projectIds));
      }
      const { data: imageRows } = await admin.from("passport_project_presentations").select("image_path").eq("passport_id", passportId).not("image_path", "is", null);
      const imagePaths = new Set(((imageRows ?? []) as { image_path: string }[]).map((r) => r.image_path));
      for (const path of await storedImagePaths(admin, userId)) imagePaths.add(path);
      if (imagePaths.size) {
        await step("project images deleted", () => admin.storage.from(IMAGE_BUCKET).remove([...imagePaths]));
      }
      for (const table of ["passport_project_presentations", "passport_corrections", "passport_contribution_revisions", "passport_contributions", "passport_decisions", "passport_projects"] as const) {
        await step(`${table} deleted`, () => admin.from(table).delete().eq("passport_id", passportId));
      }
      await step("passport cleared", () =>
        admin
          .from("passports")
          .update({ display_name: "Deleted account", headline: "", github_login: null, capability_summary: {}, role_suggestions: [], updated_at: now })
          .eq("id", passportId),
      );
    }

    for (const table of ["profile_editor_evidence", "profile_connected_accounts", "engineer_profiles", "user_notifications"] as const) {
      await step(`${table} deleted`, () => admin.from(table).delete().eq(table === "user_notifications" ? "user_id" : "owner_id", userId));
    }
    await step("import jobs deleted", () => admin.from("durable_jobs").delete().eq("owner_id", userId).eq("job_type", "passport_import"));

    const { error: scrubError } = await admin.auth.admin.updateUserById(userId, {
      email: `deleted+${userId}@deleted.invalid`,
      email_confirm: true,
      user_metadata: {},
    });
    if (scrubError) throw new Error(`sign-in identity cleared: ${scrubError.message}`);
    done.push("sign-in identity cleared");
    const { error: authError } = await admin.auth.admin.deleteUser(userId, true);
    if (authError) throw new Error(`sign-in disabled: ${authError.message}`);
    done.push("sign-in disabled");
  } catch {
    await admin.from("data_subject_requests").insert({
      requester_user_id: userId,
      request_type: "deletion",
      status: "fulfilling",
      details: { source: "self_service", interrupted: true },
      checklist: done,
    });
    return { ok: false, status: 500, error: "Your account was only partly deleted. Fydell has recorded the request and will finish it; you can also try again." };
  }

  await admin.from("data_subject_requests").insert({
    requester_user_id: userId,
    request_type: "deletion",
    status: "fulfilled",
    details: { source: "self_service" },
    checklist: done,
    fulfilled_at: now,
    fulfilled_by: "self_service",
  });
  return { ok: true };
}
