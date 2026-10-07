/**
 * Live dev-database check for the engineer -> hiring team exchange.
 *
 * Creates a throwaway engineer with two analysed projects and a throwaway
 * organization, then verifies: project-scoped pinned shares, recipient
 * preview matches the public projection, contribution context only for
 * included projects, question notifications both ways, the decision brief
 * never carries the private note, and revocation ends review access.
 * Everything it creates is deleted at the end.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-share-brief.ts
 */
import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  addReview,
  createShare,
  listShares,
  previewShare,
  recordDecision,
  resolveShare,
  revokeShare,
  saveProject,
} from "@/lib/passport/store";
import { saveContribution } from "@/lib/passport/context-store";
import { ANALYSIS_VERSION, type ExtractionResult } from "@/lib/passport/github/types";
import {
  answerQuestion,
  askQuestion,
  authorizeReviewScope,
  notifyQuestionAnswered,
  notifyQuestionAsked,
  listQuestionsForCandidate,
  questionsAwaitingReview,
  updateQuestionState,
  upsertMapping,
  validateDueDate,
} from "@/lib/employer/review";
import { briefToMarkdown, buildDecisionBrief } from "@/lib/employer/brief";
import { listNotifications } from "@/lib/notifications/store";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

function extraction(repoId: number, name: string, sha: string, findingId: string): ExtractionResult {
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: "complete",
    repository: {
      id: repoId,
      fullName: name,
      htmlUrl: `https://github.com/${name}`,
      defaultBranch: "main",
      fork: false,
      archived: false,
      primaryLanguage: "TypeScript",
      sizeKb: 120,
    },
    commitSha: sha,
    revisionRef: "main",
    manifest: [],
    coverage: { totalFiles: 10, analyzedFiles: 8, analyzedBytes: 4000, languages: ["TypeScript"], treeTruncated: false, skipped: [] },
    findings: [
      {
        id: findingId,
        detector: "test",
        category: "testing",
        finding: `Tests cover the retry path in ${name}`,
        basis: "repository_observation",
        path: "src/retry.test.ts",
        startLine: 4,
        endLine: 18,
        excerpt: ["it('retries', () => {});"],
        sourceUrl: `https://github.com/${name}/blob/${sha}/src/retry.test.ts#L4-L18`,
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
  const sha = (c: string) => c.repeat(40);

  const { data: eng, error: engErr } = await admin.auth.admin.createUser({
    email: `share-test+${tag}@example.com`,
    password: `T-${randomUUID()}`,
    email_confirm: true,
  });
  const { data: rev, error: revErr } = await admin.auth.admin.createUser({
    email: `review-test+${tag}@example.com`,
    password: `T-${randomUUID()}`,
    email_confirm: true,
  });
  if (engErr || revErr || !eng.user || !rev.user) throw new Error("Could not create test users.");
  const engineerId = eng.user.id;
  const reviewerId = rev.user.id;
  const organizationId = randomUUID();

  try {
    console.log("setup");
    const repoA = `share-test/${tag}-alpha`;
    const repoB = `share-test/${tag}-beta`;
    const findingA = `test-${tag}-a`;
    const findingB = `test-${tag}-b`;
    await saveProject({ id: engineerId, displayName: "Share Test" }, null, extraction(9_000_001, repoA, sha("a"), findingA), "Built the retry layer");
    const passport = await saveProject({ id: engineerId, displayName: "Share Test" }, null, extraction(9_000_002, repoB, sha("b"), findingB), "Side project");
    check("passport has two projects", passport.projects.length === 2);

    const contribA = await saveContribution(engineerId, repoA, {
      workedOn: "Retry layer and its tests",
      inherited: "HTTP client",
      collaboration: "solo",
      collaborationNote: "",
      constraintsFaced: "",
      results: "",
      improvements: "",
      evidenceRefs: [],
    }, 0);
    const contribB = await saveContribution(engineerId, repoB, {
      workedOn: "Everything in beta",
      inherited: "",
      collaboration: "solo",
      collaborationNote: "",
      constraintsFaced: "",
      results: "",
      improvements: "",
      evidenceRefs: [],
    }, 0);
    check("contributions saved", contribA.ok && contribB.ok);
    const { data: revisions } = await admin.from("passport_contribution_revisions").select("repo_full_name").eq("repo_full_name", repoA);
    check("contribution revision recorded", (revisions ?? []).length === 1);

    console.log("share scope");
    const badExpiry = await createShare(engineerId, "x", ["projects"], { expiresAt: "not-a-date" });
    check("invalid expiry is rejected", "error" in badExpiry);
    const noRepos = await createShare(engineerId, "x", ["projects"], { repos: ["someone/else"] });
    check("unknown repos only is rejected", "error" in noRepos);
    const created = await createShare(engineerId, "Acme review", ["projects", "evidence", "contribution"], { repos: [repoA], versionPolicy: "pinned" });
    if (!("token" in created)) throw new Error(`share failed: ${created.error}`);
    const shares = await listShares(engineerId);
    const share = shares[0];
    check("share lists pinned policy and repo scope", share.versionPolicy === "pinned" && share.repos?.length === 1 && share.repos[0] === repoA);
    check("pinned share stores snapshot ids", (share.pinnedProjectIds ?? []).length === 1);

    const resolved = await resolveShare(created.token);
    if (resolved.status !== "ok") throw new Error("share did not resolve");
    const shared = resolved.passport;
    check("shared view has only the included project", shared.projects.length === 1 && shared.projects[0].repoFullName === repoA);
    check("contribution context only for included project", (shared.contributions ?? []).every((c) => c.repoFullName === repoA) && (shared.contributions ?? []).length === 1);
    check("excluded project's finding is absent", !JSON.stringify(shared).includes(findingB));

    const preview = await previewShare(engineerId, ["projects", "evidence", "contribution"], { repos: [repoA], versionPolicy: "pinned", label: "Acme review" });
    const strip = (p: unknown) => JSON.stringify(p, (k, v) => (k === "id" && typeof v === "string" && v.length === 36 ? undefined : v));
    check("recipient preview matches the public projection", !!preview && strip(preview.projects) === strip(shared.projects) && strip(preview.contributions) === strip(shared.contributions));

    console.log("review and questions");
    await admin.from("organizations").insert({ id: organizationId, name: `Share test ${tag}`, status: "active", pilot_stage: "setup" });
    const { data: role, error: roleErr } = await admin
      .from("hiring_roles")
      .insert({ organization_id: organizationId, title: "Backend engineer", evaluation_criteria: ["Writes tests for failure paths", "Owns production incidents"] })
      .select("id")
      .single();
    if (roleErr || !role) throw new Error(`role insert failed: ${roleErr?.message}`);
    const roleId = (role as { id: string }).id;
    const added = await addReview(organizationId, reviewerId, `http://localhost:3000/p/${created.token}`, "Backend engineer");
    if (!("id" in added)) throw new Error("review not added");
    const reviewId = added.id;

    const scope = await authorizeReviewScope(organizationId, roleId, share.id);
    check("active share authorizes review", !!scope && scope.requirements.length === 2);
    const other = await authorizeReviewScope(randomUUID(), roleId, share.id);
    check("another organization cannot open the review", other === null);
    if (!scope) throw new Error("no scope");

    const projectId = shared.projects[0].id ?? null;
    await upsertMapping({ organizationId, roleId, shareId: share.id, requirementText: scope.requirements[0], requirementIndex: 0, evidenceProjectId: projectId, evidenceId: findingA, status: "accepted", reviewerNote: "Clear retry tests", createdBy: reviewerId });

    const requestId = `req-${tag}-0001`;
    const due = validateDueDate(new Date(Date.now() + 3 * 86_400_000).toISOString());
    check("a due date three days out is accepted", due.ok);
    check("a past due date is refused", !validateDueDate(new Date(Date.now() - 1000).toISOString()).ok);
    const asked = await askQuestion({ organizationId, roleId, shareId: share.id, question: "Who handled incidents on alpha?", askedBy: reviewerId, dueAt: due.ok ? due.dueAt : null, clientRequestId: requestId });
    const retried = await askQuestion({ organizationId, roleId, shareId: share.id, question: "Who handled incidents on alpha?", askedBy: reviewerId, clientRequestId: requestId });
    check("a retried send returns the same question instead of a second one", asked.created && !retried.created && retried.question.id === asked.question.id);
    const q = asked.question;
    check("the due date is stored", !!q.dueAt);
    await notifyQuestionAsked(scope);
    const engNotes = await listNotifications(engineerId);
    check("engineer is notified of the question", engNotes.items.some((n) => n.kind === "question_received" && n.href === "/app/candidate/work-record"));
    const engineerView = await listQuestionsForCandidate(engineerId);
    check("the engineer sees the question with its due date", engineerView.some((x) => x.id === q.id && x.status === "open" && !!x.dueAt && x.shareActive));
    const answered = await answerQuestion(q.id, organizationId, "Me, on call for six months.");
    await notifyQuestionAnswered(answered);
    const revNotes = await listNotifications(reviewerId);
    check("reviewer is notified of the answer", revNotes.items.some((n) => n.kind === "question_answered" && n.href === `/app/employer/passports/${reviewId}`));
    const awaiting = await questionsAwaitingReview(organizationId);
    check("the answer counts as needing the employer's action", awaiting.some((a) => a.shareId === share.id && a.count === 1));
    const scopeIds = { organizationId, roleId, shareId: share.id };
    await updateQuestionState(scopeIds, q.id, "reviewed");
    check("once read, it no longer needs action", !(await questionsAwaitingReview(organizationId)).some((a) => a.shareId === share.id));
    const afterAnswer = await listQuestionsForCandidate(engineerId);
    check("the answered question stays in the engineer's history", afterAnswer.some((x) => x.id === q.id && x.status === "answered" && x.response.startsWith("Me,")));
    const wrongScope = await updateQuestionState({ ...scopeIds, roleId: randomUUID() }, q.id, "close");
    check("a question can't be closed through another role's scope", wrongScope === null);
    await updateQuestionState(scopeIds, q.id, "close");
    let closedError = "";
    try {
      await answerQuestion(q.id, organizationId, "Changing my answer");
    } catch (e) {
      closedError = e instanceof Error ? e.message : "";
    }
    check("a closed question can't be answered", closedError.includes("closed"));

    console.log("decision brief");
    const secret = `PRIVATE-${tag}-do-not-share`;
    await recordDecision(organizationId, reviewId, reviewerId, "advance", secret);
    const brief = await buildDecisionBrief(organizationId, reviewId, roleId);
    if (brief.status !== "ok") throw new Error(`brief ${brief.status}`);
    const b = brief.brief;
    check("requirement with accepted evidence is supported", b.requirements[0].outcome === "supported");
    check("requirement without mapping is no evidence", b.requirements[1].outcome === "no_evidence");
    check("decision attributed to reviewer", b.decision.value === "advance" && b.decision.decidedBy === rev.user.email);
    check("answered question included", b.answered.length === 1 && b.openQuestions.length === 0);
    check("brief only covers shared project", b.projects.length === 1 && b.projects[0].repo === repoA);
    const md = briefToMarkdown(b);
    check("private note absent from brief data", !JSON.stringify(b).includes(secret));
    check("private note absent from Markdown export", !md.includes(secret));
    check("excluded project's contribution absent from export", !md.includes("Everything in beta"));

    console.log("revocation");
    check("owner revokes share", await revokeShare(engineerId, share.id));
    check("public link stops resolving", (await resolveShare(created.token)).status === "revoked");
    check("review scope closes", (await authorizeReviewScope(organizationId, roleId, share.id)) === null);
    check("brief reports revoked", (await buildDecisionBrief(organizationId, reviewId, roleId)).status === "revoked");
  } finally {
    await admin.from("organizations").delete().eq("id", organizationId);
    await admin.from("passports").delete().eq("owner_id", engineerId);
    await admin.from("user_notifications").delete().in("user_id", [engineerId, reviewerId]);
    await admin.auth.admin.deleteUser(engineerId);
    await admin.auth.admin.deleteUser(reviewerId);
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll share and brief checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
