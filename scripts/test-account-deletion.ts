/**
 * Live dev-database check for self-service account deletion.
 *
 * An engineer applies to a role, the employer records a decision, a private
 * note and a requirement review; then the engineer deletes their account.
 * The engineer's content must be gone and sign-in disabled, while every
 * employer-owned record survives. Everything it creates is deleted.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-account-deletion.ts
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { saveProject } from "@/lib/passport/store";
import { ANALYSIS_VERSION, type ExtractionResult } from "@/lib/passport/github/types";
import { parseApplicationInput, parseRoleInput } from "@/lib/hiring/role-contract";
import { createRole, transitionRole } from "@/lib/hiring/roles";
import { submitApplication } from "@/lib/hiring/applications";
import { confirmPhraseMatches, deleteEngineerAccount } from "@/lib/account/delete";
import { parsePresentationInput } from "@/lib/passport/presentation";
import { IMAGE_BUCKET, createManualProject, setPresentationImage } from "@/lib/passport/presentation-store";

const PNG = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
);

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

function extraction(name: string): ExtractionResult {
  const sha = "e".repeat(40);
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: "complete",
    repository: { id: 9_200_001, fullName: name, htmlUrl: `https://github.com/${name}`, defaultBranch: "main", fork: false, archived: false, primaryLanguage: "Go", sizeKb: 50 },
    commitSha: sha,
    revisionRef: "main",
    manifest: [],
    coverage: { totalFiles: 3, analyzedFiles: 3, analyzedBytes: 500, languages: ["Go"], treeTruncated: false, skipped: [] },
    findings: [
      {
        id: "del-f1",
        detector: "test",
        category: "testing",
        finding: "A table test covers the parser",
        basis: "repository_observation",
        path: "parse_test.go",
        startLine: 1,
        endLine: 4,
        excerpt: ["func TestParse(t *testing.T) {}"],
        sourceUrl: `https://github.com/${name}/blob/${sha}/parse_test.go#L1-L4`,
        attribution: "unverified",
        limitations: ["Tests were read, not run."],
      },
    ],
    rejectedFindings: 0,
    roleSuggestions: [],
    notices: [],
    error: null,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run: not the development project.");
  const admin = createAdminSupabaseClient();
  const tag = randomUUID().slice(0, 8);
  const password = `T-${randomUUID()}`;
  const mkUser = async (prefix: string) => {
    const { data, error } = await admin.auth.admin.createUser({ email: `${prefix}+${tag}@example.com`, password, email_confirm: true });
    if (error || !data.user) throw new Error("Could not create a test user.");
    return { id: data.user.id, email: data.user.email ?? "" };
  };
  const engineer = await mkUser("del-eng");
  const reviewer = await mkUser("del-rev");
  const orgId = randomUUID();

  try {
    console.log("setup");
    await admin.from("organizations").insert({ id: orgId, name: `Deletion test ${tag}`, status: "active", pilot_stage: "setup" });
    await admin.from("organization_members").insert({ organization_id: orgId, user_id: reviewer.id, role: "reviewer", status: "active", joined_at: new Date().toISOString() });
    const repo = `delete-test/${tag}`;
    await saveProject({ id: engineer.id, displayName: "Delete Test" }, null, extraction(repo), "");
    await admin.from("engineer_profiles").upsert({ owner_id: engineer.id, display_name: "Delete Test", headline: "Backend" }, { onConflict: "owner_id" });
    await admin.from("user_notifications").insert({ user_id: engineer.id, kind: "invitation_received", title: "Test notice" });

    const input = parseRoleInput({ title: "Backend engineer", description: "Own the retry service and its tests end to end.", required: "Handles failures", contactEmail: "hiring@example.com" });
    if (!input.ok) throw new Error(input.error);
    const role = await createRole(orgId, reviewer.id, input.value);
    const published = await transitionRole(orgId, role.id, reviewer.id, "publish", true);
    const app = parseApplicationInput({ contactName: "Delete Test", repos: [repo], confirmShare: true });
    if (!app.ok) throw new Error(app.error);
    const submitted = await submitApplication(engineer, published.slug as string, app.value);
    if (!submitted.ok) throw new Error(submitted.error);

    const { data: appRow } = await admin.from("role_applications").select("share_id,review_id").eq("id", submitted.id).single();
    const { share_id: shareId, review_id: reviewId } = appRow as { share_id: string; review_id: string };
    await admin.from("employer_passport_reviews").update({ decision: "advance", private_note: "Strong retry tests.", decided_by: reviewer.id, decided_at: new Date().toISOString() }).eq("id", reviewId);
    const { data: proj } = await admin.from("passport_projects").select("id").eq("repo_full_name", repo).single();
    const { data: mapping } = await admin
      .from("requirement_evidence_mappings")
      .insert({ organization_id: orgId, role_id: role.id, share_id: shareId, requirement_text: "Handles failures", requirement_index: 0, evidence_project_id: (proj as { id: string }).id, evidence_id: "del-f1", status: "accepted", reviewer_note: "Covered." })
      .select("id")
      .single();
    const { data: passportRow } = await admin.from("passports").select("id").eq("owner_id", engineer.id).single();
    const passportId = (passportRow as { id: string }).id;

    const presentationInput = parsePresentationInput({ title: "Ledger sync", summary: "Keeps two ledgers in step." });
    if (!presentationInput.ok) throw new Error(presentationInput.error);
    const manual = await createManualProject({ id: engineer.id, displayName: "Delete Test" }, presentationInput.value, `req-${randomUUID()}`, false);
    if (!manual.ok) throw new Error(manual.error);
    const withImage = await setPresentationImage(engineer.id, manual.value.projectKey, PNG, "Ledger screenshot");
    if (!withImage.ok) throw new Error(withImage.error);
    const { data: imageRow } = await admin.from("passport_project_presentations").select("id,image_path").eq("passport_id", passportId).single();
    const { id: presentationId, image_path: imagePath } = imageRow as { id: string; image_path: string };
    const orphanPath = `${engineer.id}/${presentationId}/orphan-${tag}.png`;
    await admin.storage.from(IMAGE_BUCKET).upload(orphanPath, PNG, { contentType: "image/png" });

    console.log("guards");
    check("confirmation phrase is required", !confirmPhraseMatches("delete") && confirmPhraseMatches("  Delete My Account "));
    const refused = await deleteEngineerAccount(reviewer.id);
    check("hiring-team members are refused", refused.ok === false && refused.status === 409);

    console.log("deletion");
    const result = await deleteEngineerAccount(engineer.id);
    check("deletion succeeds", result.ok, result.ok ? "" : result.error);

    const count = async (table: string, column: string, value: string) => {
      const { count: n } = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
      return n ?? 0;
    };
    check("projects and findings are erased", (await count("passport_projects", "passport_id", passportId)) === 0);
    check("project presentations are erased", (await count("passport_project_presentations", "passport_id", passportId)) === 0);
    const gone = async (path: string) => (await admin.storage.from(IMAGE_BUCKET).download(path)).error !== null;
    check("project image files are erased, including unreferenced ones", (await gone(imagePath)) && (await gone(orphanPath)));
    check("profile is erased", (await count("engineer_profiles", "owner_id", engineer.id)) === 0);
    check("notifications are erased", (await count("user_notifications", "user_id", engineer.id)) === 0);
    const { data: tomb } = await admin.from("passports").select("display_name,github_login").eq("id", passportId).single();
    check("passport keeps no identifying details", (tomb as { display_name: string }).display_name === "Deleted account" && (tomb as { github_login: string | null }).github_login === null);
    const { data: share } = await admin.from("passport_shares").select("revoked_at").eq("id", shareId).single();
    check("share link is revoked", !!(share as { revoked_at: string | null }).revoked_at);

    console.log("employer records survive");
    const { data: appAfter } = await admin.from("role_applications").select("status").eq("id", submitted.id).maybeSingle();
    check("application row stays, marked withdrawn", (appAfter as { status: string } | null)?.status === "withdrawn");
    const { data: reviewAfter } = await admin.from("employer_passport_reviews").select("decision,private_note").eq("id", reviewId).maybeSingle();
    const r = reviewAfter as { decision: string; private_note: string } | null;
    check("decision and private note stay", r?.decision === "advance" && r.private_note === "Strong retry tests.");
    const { data: mapAfter } = await admin.from("requirement_evidence_mappings").select("reviewer_note,evidence_project_id").eq("id", (mapping as { id: string }).id).maybeSingle();
    const m = mapAfter as { reviewer_note: string; evidence_project_id: string | null } | null;
    check("requirement review stays, detached from the erased project", m?.reviewer_note === "Covered." && m.evidence_project_id === null);

    console.log("sign-in");
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", { auth: { persistSession: false } });
    const { error: signInError } = await anon.auth.signInWithPassword({ email: engineer.email, password });
    check("the old password no longer signs in", !!signInError);
    const { data: authAfter } = await admin.auth.admin.getUserById(engineer.id);
    const leftEmail = authAfter?.user?.email ?? "";
    check("the sign-in record no longer holds their email", leftEmail.toLowerCase() !== engineer.email.toLowerCase(), leftEmail ? `now ${leftEmail.replace(/^[^@]{0,6}/, "…")}` : "empty");
    const { error: reErr, data: again } = await admin.auth.admin.createUser({ email: engineer.email, password, email_confirm: true });
    check("they can sign up again with the same email", !reErr);
    if (again?.user) await admin.auth.admin.deleteUser(again.user.id);
    const { data: dsr } = await admin.from("data_subject_requests").select("status,checklist").eq("requester_user_id", engineer.id).maybeSingle();
    const d = dsr as { status: string; checklist: string[] } | null;
    check("deletion is recorded as fulfilled", d?.status === "fulfilled" && d.checklist.includes("sign-in disabled"));
  } finally {
    const { data: folders } = await admin.storage.from(IMAGE_BUCKET).list(engineer.id);
    for (const folder of folders ?? []) {
      const { data: files } = await admin.storage.from(IMAGE_BUCKET).list(`${engineer.id}/${folder.name}`);
      if (files?.length) await admin.storage.from(IMAGE_BUCKET).remove(files.map((f) => `${engineer.id}/${folder.name}/${f.name}`));
    }
    await admin.from("role_applications").delete().eq("organization_id", orgId);
    await admin.from("organizations").delete().eq("id", orgId);
    await admin.from("passports").delete().eq("owner_id", engineer.id);
    await admin.from("engineer_profiles").delete().eq("owner_id", engineer.id);
    await admin.from("user_notifications").delete().in("user_id", [engineer.id, reviewer.id]);
    await admin.from("data_subject_requests").delete().eq("requester_user_id", engineer.id);
    await admin.auth.admin.deleteUser(engineer.id).catch(() => undefined);
    await admin.auth.admin.deleteUser(reviewer.id);
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll account deletion checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
