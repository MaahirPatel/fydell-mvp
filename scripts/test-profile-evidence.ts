/**
 * Engineer profile evidence: pure contract checks, then a live walk of the
 * demo flow on the development database.
 *
 * Flow: add a project -> review the draft -> confirm the contribution ->
 * correct a finding -> publish -> re-analyze (edits survive) -> apply with a
 * chosen order -> employer reads pinned versions and asks a targeted question
 * without a share -> applicant answers -> reuse the project in a second
 * application -> revoke one project -> private role and withdrawal checks.
 * Everything it creates is deleted at the end; data is synthetic.
 *
 * Run: npm run test:profile-evidence
 */
import { randomUUID } from "node:crypto";
import {
  buildCapabilities,
  buildEvidenceContent,
  buildGuide,
  canonicalJson,
  confirmationState,
  draftEditStats,
  employerEvidenceAccess,
  guideGaps,
  parseEvidenceContent,
  parseEvidenceSelection,
  parseFeedbackInput,
  parseQuestionInput,
  sanitizeEventPayload,
  type EvidenceSources,
  type SnapshotFinding,
} from "@/lib/profile-evidence/contract";
import { contentHash } from "@/lib/profile-evidence/hash";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

const finding = (id: string, category: string): SnapshotFinding => ({
  id,
  finding: `Finding ${id}`,
  category,
  basis: "repository_observation",
  path: "src/retry.go",
  startLine: 1,
  endLine: 9,
  excerpt: ["func retry() {}"],
  sourceUrl: "https://example.com/src/retry.go#L1-L9",
  limitations: ["Tests were read, not run."],
});

function baseSources(): EvidenceSources {
  return {
    projectKey: "example/webhooks",
    sourceKind: "github",
    presentation: {
      title: "Webhook delivery",
      summary: "Drafted summary",
      purpose: "Drafted purpose",
      contribution: "",
      outcomes: "",
      technologies: ["Go"],
      links: [],
      period: "",
      teamContext: "",
      projectState: "",
      fieldSources: { title: "generated", summary: "generated", purpose: "generated" },
      version: 0,
      saved: false,
    },
    contribution: null,
    decisions: [],
    snapshot: { id: randomUUID(), commitSha: "a".repeat(40), analyzedAt: "2026-09-01T00:00:00.000Z", analysisVersion: "1", importerVersion: null, coverage: "5 of 5 files", findings: [finding("ev_0000000000000001", "testing")] },
    notes: [],
    simulations: [],
    feedback: [],
    confirmation: null,
  };
}

function pureChecks() {
  console.log("contract");
  const s = baseSources();
  const draftGuide = buildGuide(s);
  check("guide has the six sections in order", draftGuide.map((g) => g.key).join(",") === "problem,contribution,constraints,decisions,checks,outcomes");
  check("unsaved presentation text is marked as a draft", draftGuide[0].origin === "generated" && draftGuide[0].text === "Drafted purpose");
  check("missing sections are gaps, not inferred", guideGaps(draftGuide).includes("contribution") && guideGaps(draftGuide).includes("checks"));

  const withContribution: EvidenceSources = {
    ...s,
    contribution: { problem: "Deliveries were lost", workedOn: "Retry loop", inherited: "", collaborationLabel: "Built alone", collaborationNote: "", constraintsFaced: "Rate limits", checkedHow: "Table tests", results: "No lost deliveries", version: 1 },
  };
  const guide = buildGuide(withContribution);
  check("the engineer's statement wins over drafted text", guide[0].text === "Deliveries were lost" && guide[0].origin === "engineer");

  const caps = buildCapabilities(s.snapshot?.findings ?? [], true);
  const testing = caps.find((c) => c.key === "testing");
  check("an area with findings is linked to them", testing?.state === "supported" && testing.findingIds.length === 1);
  check("a supported area states what it does not establish", (testing?.doesNotEstablish ?? []).some((l) => l.includes("not who wrote it")));
  check("areas without evidence are Not assessed", caps.filter((c) => c.state === "not_assessed").length === caps.length - 1);
  check("no analyzed source says so", buildCapabilities([], false).every((c) => c.state === "not_assessed" && c.supports.includes("No analyzed source")));

  check("no confirmation is unconfirmed", confirmationState(null, { presentationVersion: 1, contributionVersion: 1 }) === "unconfirmed");
  const record = { presentationVersion: 1, contributionVersion: 2, createdAt: "2026-09-01T00:00:00.000Z" };
  check("matching versions are confirmed", confirmationState(record, { presentationVersion: 1, contributionVersion: 2 }) === "confirmed");
  check("a later edit needs a fresh confirmation", confirmationState(record, { presentationVersion: 1, contributionVersion: 3 }) === "changed_since_confirmed");

  const a = buildEvidenceContent(withContribution);
  const reverseKeys = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(reverseKeys) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reverseKeys(x)])) : v;
  const reordered = reverseKeys(a);
  check("canonical JSON ignores key order", canonicalJson(a) === canonicalJson(reordered));
  check("equal content hashes equally", contentHash(a) === contentHash(buildEvidenceContent(withContribution)));
  check("changed content hashes differently", contentHash(a) !== contentHash(buildEvidenceContent({ ...withContribution, notes: [{ findingId: "ev_0000000000000001", kind: "context", text: "Context", proposedInterpretation: "", createdAt: "2026-09-02T00:00:00.000Z" }] })));
  check("unconfirmed content says so", a.confirmation.confirmed === false);
  check("stored content round-trips", parseEvidenceContent(JSON.parse(JSON.stringify(a))) !== null && parseEvidenceContent({ schema: "other" }) === null);

  const sel = parseEvidenceSelection(["b/x", "a/y", "B/X"]);
  check("selection keeps order and drops duplicates", Array.isArray(sel) && sel.join(",") === "b/x,a/y");
  check("selection rejects junk", !Array.isArray(parseEvidenceSelection([1])) && !Array.isArray(parseEvidenceSelection(["<script>"])) && !Array.isArray(parseEvidenceSelection("a/b")));
  check("selection is capped", !Array.isArray(parseEvidenceSelection(Array.from({ length: 11 }, (_, i) => `r/${i}`))));

  check("same org, live, unrevoked is visible", employerEvidenceAccess({ sameOrganization: true, applicationStatus: "submitted", revokedAt: null }) === "visible");
  check("revoked is hidden", employerEvidenceAccess({ sameOrganization: true, applicationStatus: "submitted", revokedAt: "2026-09-01" }) === "revoked");
  check("withdrawn is hidden", employerEvidenceAccess({ sameOrganization: true, applicationStatus: "withdrawn", revokedAt: null }) === "withdrawn");
  check("another org is forbidden", employerEvidenceAccess({ sameOrganization: false, applicationStatus: "submitted", revokedAt: null }) === "forbidden");

  const now = Date.parse("2026-10-01T00:00:00.000Z");
  check("question needs text", "error" in parseQuestionInput({ question: " " }, now));
  check("finding question needs its project", "error" in parseQuestionInput({ question: "Why?", findingId: "ev_0000000000000001" }, now));
  check("due date over 60 days is refused", "error" in parseQuestionInput({ question: "Why?", dueAt: "2027-03-01T00:00:00.000Z" }, now));
  const q = parseQuestionInput({ question: "Why retry 429?", evidenceVersionId: randomUUID(), findingId: "ev_0000000000000001", clientRequestId: "abcdefgh12" }, now);
  check("valid question parses", !("error" in q) && q.findingId === "ev_0000000000000001");

  check("feedback must say whether they saw the work", "error" in parseFeedbackInput({ authorName: "Sam Example", relationship: "peer", statement: "Solid." }));
  check("feedback relationship must be known", "error" in parseFeedbackInput({ authorName: "Sam Example", relationship: "boss", directlyObserved: true, statement: "Solid." }));

  const stats = draftEditStats({ summary: "Cited findings cover testing.", title: "Webhooks" }, { summary: "I rebuilt delivery retries.", title: "Webhooks" });
  check("draft edit stats count changed fields", stats.fieldsCompared === 2 && stats.fieldsChanged === 1 && stats.charChangeRatio > 0);

  const clean = sanitizeEventPayload({
    application_id: randomUUID(),
    count: 3,
    ok: true,
    step: "stage_in_review",
    code: "func main() { os.Getenv(\"SECRET\") }",
    token: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    lower_key: "sk_live_4ec39hqla92kq0fdsq8wn3x7",
    gaps: ["checks", "outcomes"],
    mixed: ["checks", "Some Free Text"],
    nested: { a: 1 },
  });
  check("events keep counts, flags, ids and tokens", typeof clean.count === "number" && clean.ok === true && clean.step === "stage_in_review" && typeof clean.application_id === "string");
  check("events keep lists of enum tokens", JSON.stringify(clean.gaps) === JSON.stringify(["checks", "outcomes"]));
  check("events drop code, credentials and free text", !("code" in clean) && !("token" in clean) && !("lower_key" in clean) && !("nested" in clean) && !("mixed" in clean));
}

async function flowChecks() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) {
    console.log("\nflow: skipped (no database configured)");
    return;
  }
  if (!url.includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run the flow: not the development project.");

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { saveProject, flagFinding, getOwnerPassport } = await import("@/lib/passport/store");
  const { ANALYSIS_VERSION } = await import("@/lib/passport/github/types");
  type ExtractionResult = import("@/lib/passport/github/types").ExtractionResult;
  const { saveContribution } = await import("@/lib/passport/context-store");
  const { savePresentation } = await import("@/lib/passport/presentation-store");
  const { parseApplicationInput, parseRoleInput } = await import("@/lib/hiring/role-contract");
  const { createRole, getPublicRole, transitionRole } = await import("@/lib/hiring/roles");
  const { submitApplication, withdrawApplication } = await import("@/lib/hiring/applications");
  const store = await import("@/lib/profile-evidence/store");
  const apps = await import("@/lib/profile-evidence/applications");
  const { addFeedback } = await import("@/lib/profile-evidence/feedback");

  const admin = createAdminSupabaseClient();
  const startedAt = new Date().toISOString();
  const tag = randomUUID().slice(0, 8);
  const mkUser = async (prefix: string) => {
    const { data, error } = await admin.auth.admin.createUser({ email: `${prefix}+${tag}@example.com`, password: `T-${randomUUID()}`, email_confirm: true });
    if (error || !data.user) throw new Error("Could not create a test user.");
    return { id: data.user.id, email: data.user.email ?? "" };
  };
  const extraction = (repoId: number, name: string, sha: string, extra = false): ExtractionResult => ({
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
        finding: `A table test covers retries in ${name}`,
        basis: "repository_observation",
        path: "retry_test.go",
        startLine: 3,
        endLine: 9,
        excerpt: ["func TestRetry(t *testing.T) {}"],
        sourceUrl: `https://github.com/${name}/blob/${sha}/retry_test.go#L3-L9`,
        attribution: "unverified",
        limitations: ["Tests were read, not run."],
      },
      ...(extra
        ? [
            {
              id: `${name.replace(/\W/g, "-")}-f2`,
              detector: "test",
              category: "reliability",
              finding: `Retries back off in ${name}`,
              basis: "repository_observation" as const,
              path: "retry.go",
              startLine: 10,
              endLine: 30,
              excerpt: ["for attempt := 0; attempt < max; attempt++ {"],
              sourceUrl: `https://github.com/${name}/blob/${sha}/retry.go#L10-L30`,
              attribution: "unverified" as const,
              limitations: [],
            },
          ]
        : []),
    ],
    rejectedFindings: 0,
    roleSuggestions: [],
    notices: [],
    error: null,
  });

  const engineer = await mkUser("evidence-eng");
  const reviewer = await mkUser("evidence-rev");
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const appIds: string[] = [];

  try {
    console.log("\nsetup");
    await admin.from("organizations").insert([
      { id: orgId, name: `Evidence test ${tag}`, status: "active", pilot_stage: "setup" },
      { id: otherOrgId, name: `Other org ${tag}`, status: "active", pilot_stage: "setup" },
    ]);
    await admin.from("organization_members").insert({ organization_id: orgId, user_id: reviewer.id, role: "reviewer", status: "active", joined_at: new Date().toISOString() });
    const owner = { id: engineer.id, displayName: "Evidence Test" };
    const repoA = `evidence-test/${tag}-a`;
    const repoB = `evidence-test/${tag}-b`;

    console.log("add a project and review the draft");
    await saveProject(owner, null, extraction(9_200_001, repoA, "a".repeat(40)), "");
    await saveProject(owner, null, extraction(9_200_002, repoB, "b".repeat(40)), "");
    const draft = await store.evidenceStatus(engineer.id, repoA);
    check("a new project starts unconfirmed", draft?.confirmation === "unconfirmed");
    check("the draft is marked as drafted, not validated", !!draft && draft.preview.provenance.generatedFields.length > 0 && draft.preview.confirmation.confirmed === false);
    check("gaps show where help is needed", !!draft && draft.gaps.includes("contribution") && draft.gaps.includes("checks"));
    check("areas without findings are Not assessed", !!draft && draft.preview.capabilities.some((c) => c.state === "not_assessed"));
    const blocked = await store.publishEvidenceVersion(engineer.id, repoA, "publish");
    check("publishing an unconfirmed contribution is refused", blocked.ok === false && blocked.status === 409);
    const noText = await store.confirmContribution(engineer.id, repoA);
    check("confirming with no contribution written is refused", noText.ok === false);

    console.log("write and confirm the contribution");
    const pres = await savePresentation(
      engineer.id,
      repoA,
      {
        title: "Webhook delivery service",
        summary: "Delivers signed webhooks with retries.",
        purpose: "",
        intendedUsers: "",
        contribution: "",
        teamContext: "solo",
        projectState: "shipped",
        outcomes: "",
        technologies: ["Go"],
        links: [],
        startedOn: null,
        endedOn: null,
        featured: false,
        visibility: "shareable",
      },
      0,
    );
    check("presentation saved", pres.ok);
    const contrib = await saveContribution(
      engineer.id,
      repoA,
      {
        problem: "Deliveries were lost when the receiver was briefly down.",
        workedOn: "The retry loop and the deduplication insert.",
        inherited: "HTTP scaffold from a template.",
        collaboration: "solo",
        collaborationNote: "",
        constraintsFaced: "The receiver rate-limits with 429.",
        checkedHow: "Table tests for retries and permanent failures.",
        results: "Retries stopped losing deliveries in the test suite.",
        improvements: "",
        evidenceRefs: [],
      },
      0,
    );
    check("contribution saved", contrib.ok);
    const confirmed = await store.confirmContribution(engineer.id, repoA);
    check("contribution confirmed", confirmed.ok);
    const afterConfirm = await store.evidenceStatus(engineer.id, repoA);
    check("status reads confirmed", afterConfirm?.confirmation === "confirmed");
    const shareKeys = await store.shareableProjectKeys(engineer.id, undefined);
    check("new share links include the confirmed project", shareKeys.includes(repoA));
    check("new share links leave out the unconfirmed draft", !shareKeys.includes(repoB));
    check("an explicit request cannot add the unconfirmed draft", (await store.shareableProjectKeys(engineer.id, [repoB])).length === 0);
    check("guide uses the engineer's words", afterConfirm?.preview.guide.find((g) => g.key === "problem")?.text.startsWith("Deliveries were lost") === true);

    console.log("correct a finding and publish");
    const passport = await getOwnerPassport(engineer.id);
    const findingId = passport?.projects.find((p) => p.repoFullName === repoA)?.evidence[0]?.id ?? "";
    const flagged = await flagFinding(engineer.id, repoA, findingId, "The test covers retries but not the 429 path specifically.", { kind: "context" });
    check("engineer adds context to a finding", "correction" in flagged);
    const v1 = await store.publishEvidenceVersion(engineer.id, repoA, "publish");
    check("version 1 published", v1.ok && v1.version === 1 && !v1.reused);
    check("the note travels with the version", v1.ok && v1.content.notes.length === 1);
    const again = await store.publishEvidenceVersion(engineer.id, repoA, "publish");
    check("publishing again with no change reuses the version", again.ok && again.reused && again.ok && v1.ok && again.versionId === v1.versionId);
    if (!v1.ok) throw new Error("Publishing failed; cannot continue.");
    const { error: mutateErr } = await admin.from("evidence_versions").update({ content_hash: "x" }).eq("id", v1.versionId);
    check("a stored version cannot be edited", !!mutateErr);

    console.log("re-analyze: edits survive");
    await saveProject(owner, null, extraction(9_200_001, repoA, "c".repeat(40), true), "");
    const reanalyzed = await store.evidenceStatus(engineer.id, repoA);
    check("contribution is still the engineer's after re-analysis", reanalyzed?.preview.guide.find((g) => g.key === "contribution")?.text.startsWith("The retry loop") === true);
    check("confirmation still holds (statement unchanged)", reanalyzed?.confirmation === "confirmed");
    check("new commit and findings show up", reanalyzed?.preview.provenance.commitSha === "c".repeat(40) && reanalyzed.preview.findings.length === 2);
    check("the new evidence is not yet a published version", reanalyzed?.currentVersion === null);

    console.log("apply with a chosen order");
    const roleInput = parseRoleInput({ title: "Backend engineer, delivery", description: "Own webhook delivery: retries and idempotency.", required: "Handles failures in external calls", remotePolicy: "remote" });
    if (!roleInput.ok) throw new Error(roleInput.error);
    const role1 = await createRole(orgId, reviewer.id, roleInput.value);
    const pub1 = await transitionRole(orgId, role1.id, reviewer.id, "publish", true);
    const role2 = await createRole(orgId, reviewer.id, { ...roleInput.value, title: "Platform engineer" });
    const pub2 = await transitionRole(orgId, role2.id, reviewer.id, "publish", true);
    const app1Input = parseApplicationInput({ contactName: "Evidence Test", repos: [repoB, repoA], confirmShare: true });
    if (!app1Input.ok) throw new Error(app1Input.error);
    const app1 = await submitApplication(engineer, pub1.slug as string, app1Input.value);
    if (!app1.ok) throw new Error(app1.error);
    appIds.push(app1.id);
    const mine1 = await apps.getApplicationEvidenceForApplicant(engineer.id, app1.id);
    check("application pins one version per project in the chosen order", mine1?.map((p) => p.projectKey).join(",") === `${repoB},${repoA}`);
    const pinnedA = mine1?.find((p) => p.projectKey === repoA);
    check("the pinned version is the re-analyzed evidence (version 2)", pinnedA?.version === 2);

    console.log("employer view");
    const seen = await apps.getApplicationEvidenceForOrg(orgId, app1.id, reviewer.id);
    check("employer sees both projects with content", seen?.items.length === 2 && seen.items.every((i) => i.content !== null));
    check("another organization sees nothing", (await apps.getApplicationEvidenceForOrg(otherOrgId, app1.id)) === null);
    const unconfirmedB = seen?.items.find((i) => i.projectKey === repoB)?.content;
    check("an unconfirmed project is labelled as such to the employer", unconfirmedB?.confirmation.confirmed === false);

    await admin.from("role_applications").update({ share_id: null }).eq("id", app1.id);
    const askInput = parseQuestionInput({ question: "How did you decide which responses to retry?", evidenceVersionId: pinnedA?.versionId, findingId, clientRequestId: `walk${tag}x` });
    if ("error" in askInput) throw new Error(askInput.error);
    const asked = await apps.askApplicationQuestion(orgId, app1.id, reviewer.id, askInput);
    check("employer asks a targeted question without a share", asked.ok && asked.created);
    const askedAgain = await apps.askApplicationQuestion(orgId, app1.id, reviewer.id, askInput);
    check("a retried question is not duplicated", askedAgain.ok && !askedAgain.created && asked.ok && askedAgain.question.id === asked.question.id);
    const wrongOrg = await apps.askApplicationQuestion(otherOrgId, app1.id, reviewer.id, { ...askInput, clientRequestId: null });
    check("another organization cannot ask", wrongOrg.ok === false);
    const badFinding = await apps.askApplicationQuestion(orgId, app1.id, reviewer.id, { ...askInput, findingId: "ev_ffffffffffffffff", clientRequestId: null });
    check("a question about a finding not in the pinned version is refused", badFinding.ok === false);
    if (!asked.ok) throw new Error("Asking failed; cannot continue.");
    const inbox = await apps.listApplicationQuestionsForApplicant(engineer.id, app1.id);
    check("applicant sees the question", inbox.length === 1);
    const { data: notes } = await admin.from("user_notifications").select("kind,href").eq("user_id", engineer.id);
    check("applicant is notified in Fydell", ((notes ?? []) as Array<{ kind: string; href: string }>).some((n) => n.kind === "question_received" && n.href.endsWith(app1.id)));
    const answered = await apps.answerApplicationQuestion(engineer.id, asked.question.id, "Only 429 and 5xx; other 4xx responses fail fast.");
    check("applicant answers", answered.ok && answered.question.status === "answered");
    check("someone else cannot answer", (await apps.answerApplicationQuestion(reviewer.id, asked.question.id, "x")).ok === false);
    const read = await apps.updateApplicationQuestion(orgId, asked.question.id, "reviewed");
    check("employer marks the answer read", !!read?.reviewedAt);

    const reqQuestion = (requirementId: string, id: string) =>
      parseQuestionInput({ question: "Tell us about a failure you handled in an external call.", requirementId, clientRequestId: id });
    const unknownReq = reqQuestion("r_doesnotexist0000", `req${tag}a`);
    if ("error" in unknownReq) throw new Error(unknownReq.error);
    check("a question about a requirement not on the role is refused", (await apps.askApplicationQuestion(orgId, app1.id, reviewer.id, unknownReq)).ok === false);
    const realReq = role1.intake.requirements.find((r) => r.kind === "required" && r.confirmed);
    const knownReq = reqQuestion(realReq?.id ?? "", `req${tag}b`);
    if ("error" in knownReq) throw new Error(knownReq.error);
    const aboutReq = await apps.askApplicationQuestion(orgId, app1.id, reviewer.id, knownReq);
    check("a requirement question stores the requirement text as asked", aboutReq.ok && aboutReq.question.requirement?.text === realReq?.text);
    const reqInbox = await apps.listApplicationQuestionsForApplicant(engineer.id, app1.id);
    check("the applicant sees which requirement it is about", reqInbox.some((x) => x.requirement?.id === realReq?.id));
    if (aboutReq.ok) await apps.updateApplicationQuestion(orgId, aboutReq.question.id, "close");

    console.log("collaborator feedback");
    const fb = await addFeedback(engineer.id, repoA, { authorName: "Sam Example", relationship: "peer", relationshipNote: "", directlyObserved: true, statement: "Reviewed the retry change with them." });
    check("feedback is stored unverified", fb.ok && fb.feedback.verification === "none");
    const withFeedback = await store.evidenceStatus(engineer.id, repoA);
    check("feedback appears in the next version, attributed", withFeedback?.preview.feedback[0]?.authorName === "Sam Example" && withFeedback.preview.feedback[0].directlyObserved);
    const stillPinned = await apps.getApplicationEvidenceForOrg(orgId, app1.id);
    check("the sent version does not change after later edits", stillPinned?.items.find((i) => i.versionId === pinnedA?.versionId)?.content?.feedback.length === 0);

    console.log("reuse in another application");
    const app2Input = parseApplicationInput({ contactName: "Evidence Test", repos: [repoA], confirmShare: true });
    if (!app2Input.ok) throw new Error(app2Input.error);
    await admin.from("collaborator_feedback").update({ withdrawn_at: new Date().toISOString() }).eq("created_by", engineer.id);
    const app2 = await submitApplication(engineer, pub2.slug as string, app2Input.value);
    if (!app2.ok) throw new Error(app2.error);
    appIds.push(app2.id);
    const mine2 = await apps.getApplicationEvidenceForApplicant(engineer.id, app2.id);
    check("unchanged evidence reuses the same version", mine2?.[0]?.versionId === pinnedA?.versionId);
    const versions = await store.listVersions(engineer.id, repoA);
    check("the version lists both applications", versions.find((v) => v.id === pinnedA?.versionId)?.applications.length === 2);

    console.log("revoke and withdraw");
    const revoked = await apps.revokeApplicationEvidence(engineer.id, app1.id, pinnedA?.versionId ?? "");
    check("applicant stops sharing one project", revoked.ok);
    const afterRevoke = await apps.getApplicationEvidenceForOrg(orgId, app1.id);
    const gone = afterRevoke?.items.find((i) => i.versionId === pinnedA?.versionId);
    check("employer no longer receives its content", !!gone && gone.content === null && gone.projectKey === "");
    check("the other project is still shared", afterRevoke?.items.some((i) => i.content !== null) === true);
    check("the other application is unaffected", (await apps.getApplicationEvidenceForOrg(orgId, app2.id))?.items[0]?.content !== null);
    check("revoking twice is refused", (await apps.revokeApplicationEvidence(engineer.id, app1.id, pinnedA?.versionId ?? "")).ok === false);
    check("someone else cannot revoke", (await apps.revokeApplicationEvidence(reviewer.id, app2.id, pinnedA?.versionId ?? "")).ok === false);
    await withdrawApplication(engineer.id, app2.id);
    const withdrawn = await apps.getApplicationEvidenceForOrg(orgId, app2.id);
    check("withdrawal hides every pinned project", withdrawn?.access === "withdrawn" && withdrawn.items.every((i) => i.content === null));

    console.log("private roles");
    await admin.from("hiring_roles").update({ visibility: "private" }).eq("id", role1.id);
    check("a private role page is hidden from the public", (await getPublicRole(pub1.slug as string)) === null);
    check("a private role page is hidden from other signed-in users", (await getPublicRole(pub1.slug as string, engineer.id)) === null);
    const memberView = await getPublicRole(pub1.slug as string, reviewer.id);
    check("workspace members can preview it, but it does not accept applications", !!memberView && !memberView.accepting);
    const privateApply = await submitApplication(reviewer, pub1.slug as string, app2Input.value);
    check("applying to a private role is refused", !privateApply.ok && privateApply.status === 404);

    console.log("measurement");
    const { data: events } = await admin.from("proof_product_events").select("name,payload").like("name", "profile_evidence.%").gte("created_at", startedAt);
    const names = new Set(((events ?? []) as Array<{ name: string }>).map((e) => e.name));
    for (const n of ["draft_edited", "contribution_confirmed", "publish_blocked", "version_published", "application_pinned", "employer_evidence_viewed", "employer_question_asked", "employer_next_step", "question_answered", "application_evidence_revoked"]) {
      check(`event recorded: ${n}`, names.has(`profile_evidence.${n}`));
    }
    const payloads = JSON.stringify(((events ?? []) as Array<{ payload: unknown }>).map((e) => e.payload));
    check("events never contain source text or contribution text", !payloads.includes("TestRetry") && !payloads.includes("retry loop") && !payloads.includes("rate-limits"));
  } finally {
    if (appIds.length > 0) {
      await admin.from("proof_product_events").delete().like("name", "profile_evidence.%").in("payload->>application_id", appIds);
    }
    await admin.from("proof_product_events").delete().in("organization_id", [orgId, otherOrgId]);
    await admin
      .from("proof_product_events")
      .delete()
      .in("name", ["profile_evidence.draft_edited", "profile_evidence.contribution_confirmed", "profile_evidence.publish_blocked", "profile_evidence.version_published"])
      .is("organization_id", null)
      .gte("created_at", startedAt);
    await admin.from("role_applications").delete().eq("organization_id", orgId);
    await admin.from("organizations").delete().in("id", [orgId, otherOrgId]);
    await admin.from("passports").delete().eq("owner_id", engineer.id);
    await admin.from("user_notifications").delete().in("user_id", [engineer.id, reviewer.id]);
    await admin.auth.admin.deleteUser(engineer.id);
    await admin.auth.admin.deleteUser(reviewer.id);
  }
}

async function main() {
  pureChecks();
  await flowChecks();
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll profile evidence checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
