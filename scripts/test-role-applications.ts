/**
 * Live dev-database check for role pages and applications.
 *
 * Creates a throwaway organization with a member, an engineer with two
 * analysed projects, and a role; then walks publish -> apply -> review ->
 * requirement change -> withdraw -> re-apply -> pause/close, and checks
 * tenancy and row-level security. Everything it creates is deleted.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-role-applications.ts
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { projectRemovalImpact, removeProject, saveProject } from "@/lib/passport/store";
import { ANALYSIS_VERSION, type ExtractionResult } from "@/lib/passport/github/types";
import { parseApplicationInput, parseRoleInput } from "@/lib/hiring/role-contract";
import { createRole, getPublicRole, getRole, listRoles, RoleError, transitionRole, updateRole } from "@/lib/hiring/roles";
import {
  applicationForReview,
  getMyApplication,
  listApplicationsForRole,
  listMyApplications,
  setApplicationStage,
  submitApplication,
  withdrawApplication,
} from "@/lib/hiring/applications";
import { authorizeReviewScope } from "@/lib/employer/review";
import { listNotifications } from "@/lib/notifications/store";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

function extraction(repoId: number, name: string, sha: string): ExtractionResult {
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: "complete",
    repository: { id: repoId, fullName: name, htmlUrl: `https://github.com/${name}`, defaultBranch: "main", fork: false, archived: false, primaryLanguage: "Go", sizeKb: 50 },
    commitSha: sha,
    revisionRef: "main",
    manifest: [],
    coverage: { totalFiles: 5, analyzedFiles: 5, analyzedBytes: 900, languages: ["Go"], treeTruncated: false, skipped: [] },
    findings: [
      {
        id: `${name.replace(/\W/g, "-")}-f1`,
        detector: "test",
        category: "testing",
        finding: `A table test covers the parser in ${name}`,
        basis: "repository_observation",
        path: "parse_test.go",
        startLine: 3,
        endLine: 9,
        excerpt: ["func TestParse(t *testing.T) {}"],
        sourceUrl: `https://github.com/${name}/blob/${sha}/parse_test.go#L3-L9`,
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

async function expectRoleError(fn: () => Promise<unknown>, status: number): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (err) {
    return err instanceof RoleError && err.status === status;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run: not the development project.");
  const admin = createAdminSupabaseClient();
  const tag = randomUUID().slice(0, 8);
  const mkUser = async (prefix: string) => {
    const { data, error } = await admin.auth.admin.createUser({ email: `${prefix}+${tag}@example.com`, password: `T-${randomUUID()}`, email_confirm: true });
    if (error || !data.user) throw new Error("Could not create a test user.");
    return { id: data.user.id, email: data.user.email ?? "" };
  };
  const engineer = await mkUser("apply-eng");
  const reviewer = await mkUser("apply-rev");
  const orgId = randomUUID();
  const otherOrgId = randomUUID();

  try {
    console.log("setup");
    await admin.from("organizations").insert([
      { id: orgId, name: `Applications test ${tag}`, status: "active", pilot_stage: "setup" },
      { id: otherOrgId, name: `Other org ${tag}`, status: "active", pilot_stage: "setup" },
    ]);
    await admin.from("organization_members").insert({ organization_id: orgId, user_id: reviewer.id, role: "reviewer", status: "active", joined_at: new Date().toISOString() });
    const repoA = `apply-test/${tag}-a`;
    const repoB = `apply-test/${tag}-b`;
    await saveProject({ id: engineer.id, displayName: "Apply Test" }, null, extraction(9_100_001, repoA, "c".repeat(40)), "");
    await saveProject({ id: engineer.id, displayName: "Apply Test" }, null, extraction(9_100_002, repoB, "d".repeat(40)), "");

    console.log("role lifecycle");
    const input = parseRoleInput({
      title: "Backend engineer, payments",
      description: "You will own the webhook delivery service: retries, idempotency and the on-call runbook for it.",
      required: "Handles failures in external calls\nWrites tests for failure paths",
      preferred: "Postgres experience",
      hiringSteps: "Application review\nOne technical conversation",
      remotePolicy: "remote",
      contactEmail: "Hiring@Example.com",
    });
    if (!input.ok) throw new Error(input.error);
    check("role input normalizes lists and email", input.value.required.length === 2 && input.value.contactEmail === "hiring@example.com");
    check("bad deadline is rejected", !parseRoleInput({ title: "Role", applicationDeadline: "soon" }).ok);
    const role = await createRole(orgId, reviewer.id, input.value);
    check("new role is a draft without a page", role.state === "draft" && role.slug === null);
    check("publishing without confirming a genuine opening fails", await expectRoleError(() => transitionRole(orgId, role.id, reviewer.id, "publish", false), 400));
    check("another organization can't publish it", await expectRoleError(() => transitionRole(otherOrgId, role.id, reviewer.id, "publish", true), 404));
    const published = await transitionRole(orgId, role.id, reviewer.id, "publish", true);
    check("published role is open with a slug", published.state === "open" && !!published.slug);
    const slug = published.slug as string;
    const page = await getPublicRole(slug);
    check("public page resolves and accepts applications", !!page && page.accepting && page.organizationName.startsWith("Applications test"));
    check("public page omits internal fields", !!page && !("organizationId" in page) && !("genuineConfirmedAt" in page));
    check("garbage slug does not resolve", (await getPublicRole("not-a-real-role-zzz")) === null);
    check("another organization can't read the role", (await getRole(otherOrgId, role.id)) === null);

    console.log("application");
    const app = parseApplicationInput({ contactName: "Apply Test", repos: [repoA], links: ["https://example.com/writeup"], note: "Built the parser.", confirmShare: true });
    if (!app.ok) throw new Error(app.error);
    check("unconfirmed sharing is rejected", !parseApplicationInput({ contactName: "x", note: "y" }).ok);
    check("non-http link is rejected", !parseApplicationInput({ contactName: "x", links: ["javascript:alert(1)"], confirmShare: true }).ok);
    const submitted = await submitApplication(engineer, slug, app.value);
    if (!submitted.ok) throw new Error(submitted.error);
    const dup = await submitApplication(engineer, slug, app.value);
    check("second active application is refused with a pointer to the first", !dup.ok && dup.status === 409 && dup.existingId === submitted.id);
    const mine = await getMyApplication(engineer.id, submitted.id);
    check("receipt shows role, org and shared project", !!mine && mine.roleTitle === published.title && mine.sharedProjects.length === 1 && mine.sharedProjects[0] === repoA && mine.shareActive);
    check("another user can't read the receipt", (await getMyApplication(reviewer.id, submitted.id)) === null);

    const { data: appRow } = await admin.from("role_applications").select("share_id,review_id").eq("id", submitted.id).single();
    const shareId = (appRow as { share_id: string }).share_id;
    const reviewId = (appRow as { review_id: string }).review_id;
    const { data: shareRow } = await admin.from("passport_shares").select("version_policy,project_repos,pinned_project_ids").eq("id", shareId).single();
    const s = shareRow as { version_policy: string; project_repos: string[]; pinned_project_ids: string[] };
    check("application share is pinned to the selected project", s.version_policy === "pinned" && s.project_repos.length === 1 && s.pinned_project_ids.length === 1);

    const list = await listApplicationsForRole(orgId, role.id);
    check("employer sees the application with evidence", list.length === 1 && list[0].evidenceAvailable && list[0].projects === 1 && list[0].nextAction === "Review submission");
    check("another organization sees nothing", (await listApplicationsForRole(otherOrgId, role.id)).length === 0);
    check("role list counts it as new", (await listRoles(orgId)).find((r) => r.id === role.id)?.newApplications === 1);
    const linked = await applicationForReview(orgId, reviewId);
    check("review links back to the application and its role", linked?.roleId === role.id);
    const scope = await authorizeReviewScope(orgId, role.id, shareId);
    check("requirement review opens against the role", !!scope && scope.requirements.length === 2);
    const notes = await listNotifications(reviewer.id);
    check("team member is notified", notes.items.some((n) => n.kind === "application_received" && n.href === `/app/employer/openings/${role.id}`));
    check("stage moves to in review", (await setApplicationStage(orgId, submitted.id, "in_review", "new")).kind === "changed");
    check("another org can't move the stage", (await setApplicationStage(otherOrgId, submitted.id, "closed")).kind === "not_found");
    const stale = await setApplicationStage(orgId, submitted.id, "closed", "new");
    check("a stage change based on a stale stage is a conflict, not an overwrite", stale.kind === "conflict" && stale.current === "in_review");
    const [first, second] = await Promise.all([
      setApplicationStage(orgId, submitted.id, "awaiting_candidate", "in_review"),
      setApplicationStage(orgId, submitted.id, "closed", "in_review"),
    ]);
    check("two reviewers moving the stage at once: exactly one wins", [first, second].filter((r) => r.kind === "changed").length === 1 && [first, second].some((r) => r.kind === "conflict"));
    check("stage moves back to in review", (await setApplicationStage(orgId, submitted.id, "in_review")).kind === "changed");

    console.log("requirement versions");
    const edited = parseRoleInput({ ...input.value, required: [...input.value.required, "Owns incidents"] });
    if (!edited.ok) throw new Error(edited.error);
    const bumped = await updateRole(orgId, role.id, edited.value);
    check("changing requirements on a published role bumps the version", bumped.requirementsVersion === 2);
    const after = await listApplicationsForRole(orgId, role.id);
    check("existing application keeps the version it saw", after[0].requirementsVersion === 1);

    console.log("withdraw and re-apply");
    check("applicant withdraws", await withdrawApplication(engineer.id, submitted.id));
    const { data: revoked } = await admin.from("passport_shares").select("revoked_at").eq("id", shareId).single();
    check("withdrawal revokes the shared evidence", !!(revoked as { revoked_at: string | null }).revoked_at && (await authorizeReviewScope(orgId, role.id, shareId)) === null);
    check("withdrawn application leaves the active list", (await listApplicationsForRole(orgId, role.id)).length === 0);
    check("withdrawn application stays visible to the applicant", (await listMyApplications(engineer.id))[0]?.status === "withdrawn");
    const reapply = await submitApplication(engineer, slug, { ...app.value, repos: [repoB] });
    check("re-applying after withdrawal works", reapply.ok);
    if (!reapply.ok) throw new Error(reapply.error);

    console.log("project removal");
    const impactB = await projectRemovalImpact(engineer.id, repoB);
    check("removal warns about the open application", impactB.applications.length === 1 && impactB.applications[0].roleTitle === published.title);
    const impactA = await projectRemovalImpact(engineer.id, repoA);
    check("withdrawn application is not listed", impactA.applications.length === 0);
    const { data: reRow } = await admin.from("role_applications").select("share_id").eq("id", reapply.id).single();
    const reShareId = (reRow as { share_id: string }).share_id;
    const { data: projRow } = await admin.from("passport_projects").select("id").eq("repo_full_name", repoB).single();
    const { data: mapping } = await admin
      .from("requirement_evidence_mappings")
      .insert({ organization_id: orgId, role_id: role.id, share_id: reShareId, requirement_text: "Handles failures in external calls", requirement_index: 0, evidence_project_id: (projRow as { id: string }).id, evidence_id: "x", status: "accepted", reviewer_note: "Solid retry handling." })
      .select("id")
      .single();
    await removeProject(engineer.id, repoB);
    const { data: kept } = await admin.from("requirement_evidence_mappings").select("evidence_project_id,reviewer_note").eq("id", (mapping as { id: string }).id).maybeSingle();
    const k = kept as { evidence_project_id: string | null; reviewer_note: string } | null;
    check("employer's review note survives project removal", !!k && k.evidence_project_id === null && k.reviewer_note === "Solid retry handling.");
    check("removed project is gone", (await projectRemovalImpact(engineer.id, repoB)).applications.length === 0);

    console.log("closing");
    await transitionRole(orgId, role.id, reviewer.id, "pause", false);
    const paused = await getPublicRole(slug);
    check("paused role explains itself and stops applications", !!paused && !paused.accepting && !!paused.closedReason);
    const blocked = await submitApplication(reviewer, slug, app.value);
    check("paused role refuses new applications", !blocked.ok && blocked.status === 409);
    await transitionRole(orgId, role.id, reviewer.id, "close", false);
    check("closed role can't be edited", await expectRoleError(() => updateRole(orgId, role.id, edited.value), 409));
    check("closed role keeps its applications", (await listApplicationsForRole(orgId, role.id)).length === 1);

    console.log("row-level security");
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", { auth: { persistSession: false } });
    const { data: leaked } = await anon.from("role_applications").select("id").limit(1);
    check("signed-out client reads no applications", (leaked ?? []).length === 0);
    const { error: writeErr } = await anon.from("role_applications").insert({ organization_id: orgId });
    check("signed-out client can't insert", !!writeErr);
  } finally {
    await admin.from("role_applications").delete().eq("organization_id", orgId);
    await admin.from("organizations").delete().in("id", [orgId, otherOrgId]);
    await admin.from("passports").delete().eq("owner_id", engineer.id);
    await admin.from("user_notifications").delete().in("user_id", [engineer.id, reviewer.id]);
    await admin.auth.admin.deleteUser(engineer.id);
    await admin.auth.admin.deleteUser(reviewer.id);
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll role page and application checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
