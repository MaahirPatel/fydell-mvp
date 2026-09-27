/**
 * Live Milestone 1 loop against fydell-dev only.
 *
 * Creates two disposable workspaces and three disposable accounts, runs one
 * engineering attempt end to end through the real service layer, checks
 * tenant isolation through anon-key clients signed in as each person, then
 * deletes only what it created. No email is sent (Resend is unset here).
 *
 * Run: npx tsx --env-file=.env.local --conditions react-server scripts/test-eng-staging.ts
 * Optional: FYDELL_EVAL_EXECUTOR=local-dev also runs the hidden tests locally;
 * ENG_STAGING_HOSTED=1 runs them in the Vercel Sandbox snapshot instead
 * (needs FYDELL_EXECUTION_SNAPSHOT_ID and a current VERCEL_OIDC_TOKEN).
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unzipSync, zipSync } from "fflate";
import postgres from "postgres";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const devUrl = process.env.FYDELL_DEV_SUPABASE_URL;
const devServiceKey = process.env.FYDELL_DEV_SERVICE_ROLE_KEY;
const devDbUrl = process.env.FYDELL_DEV_DB_URL;

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

if (!devUrl || !devServiceKey) {
  console.log("SKIP eng staging loop: FYDELL_DEV_SUPABASE_URL and FYDELL_DEV_SERVICE_ROLE_KEY are not configured.");
  process.exit(0);
}
if (hostOf(devUrl) !== `${PROJECT_REF}.supabase.co`) throw new Error(`Refusing: FYDELL_DEV_SUPABASE_URL must target ${PROJECT_REF}.`);
const anonKey = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL) === `${PROJECT_REF}.supabase.co` ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : process.env.FYDELL_DEV_ANON_KEY;
if (!anonKey) throw new Error("Refusing: no anon key known to belong to fydell-dev (set FYDELL_DEV_ANON_KEY).");

process.env.NEXT_PUBLIC_SUPABASE_URL = devUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = devServiceKey;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.RESEND_API_KEY;
const hostedSnapshot = process.env.ENG_STAGING_HOSTED === "1" ? process.env.FYDELL_EXECUTION_SNAPSHOT_ID : undefined;
const localExecutor = process.env.FYDELL_EVAL_EXECUTOR === "local-dev";
delete process.env.FYDELL_EVAL_EXECUTOR;
delete process.env.FYDELL_EXECUTION_SNAPSHOT_ID;

let passed = 0;
function pass(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}

async function signedIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(devUrl!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for a disposable account: ${error.message}`);
  return client;
}

async function visibleCount(client: SupabaseClient, table: string, column: string, value: string): Promise<number> {
  const { data, error } = await client.from(table).select("*").eq(column, value);
  if (error) return 0;
  return data?.length ?? 0;
}

function submissionArchive(starter: Uint8Array): Uint8Array {
  const files = unzipSync(starter);
  const reference = readFileSync(path.join(process.cwd(), "scenarios", "backend-webhook-retry", "fixtures", "reference", "webhooks", "dispatcher.py"));
  const key = Object.keys(files).find((k) => k.endsWith("webhooks/dispatcher.py"));
  assert.ok(key, "starter contains webhooks/dispatcher.py");
  files[key] = new Uint8Array(reference);
  return zipSync(files);
}

async function main() {
  const { engAdmin } = await import("../src/lib/eng/context");
  const roles = await import("../src/lib/eng/roles");
  const invitations = await import("../src/lib/eng/invitations");
  const attempts = await import("../src/lib/eng/attempts");
  const uploads = await import("../src/lib/eng/uploads");
  const submissions = await import("../src/lib/eng/submissions");
  const queue = await import("../src/lib/eng/evaluation/queue");
  const reports = await import("../src/lib/eng/reports");
  const employer = await import("../src/lib/eng/employer");
  const { CURRENT_SCENARIO, expectedSetupCodes } = await import("../src/lib/eng/scenarios");
  const { buildStarterArchive } = await import("../src/lib/eng/starter");
  type EngMember = import("../src/lib/eng/context").EngMember;

  const db = engAdmin();
  const tag = randomBytes(4).toString("hex");
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  const emails = {
    employerA: `eng-staging-${tag}-a@example.com`,
    employerB: `eng-staging-${tag}-b@example.com`,
    candidate: `eng-staging-${tag}-c@example.com`,
    intruder: `eng-staging-${tag}-x@example.com`,
  };
  const userIds: string[] = [];
  const orgIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    const ids: Record<keyof typeof emails, string> = { employerA: "", employerB: "", candidate: "", intruder: "" };
    for (const [key, email] of Object.entries(emails) as [keyof typeof emails, string][]) {
      const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create disposable user: ${error?.message}`);
      ids[key] = data.user.id;
      userIds.push(data.user.id);
    }
    const members: EngMember[] = [];
    for (const [label, owner, email] of [
      ["A", ids.employerA, emails.employerA],
      ["B", ids.employerB, emails.employerB],
    ] as const) {
      const { data: org, error } = await db
        .from("organizations")
        .insert({ name: `Staging test ${tag} ${label}`, owner_id: owner, owner_email: email, created_by: owner })
        .select("id, name")
        .single();
      if (error || !org) throw new Error(`could not create disposable organization: ${error?.message}`);
      orgIds.push(org.id);
      const { error: memberError } = await db
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: owner, role: "owner", status: "active", joined_at: new Date().toISOString() });
      if (memberError) throw new Error(`could not add member: ${memberError.message}`);
      members.push({ userId: owner, email, organizationId: org.id, organizationName: org.name, role: "owner" });
    }
    const [memberA, memberB] = members;
    pass("disposable workspaces and accounts created");

    const draft = await roles.createRole(db, memberA, {
      title: "Backend engineer (staging test)",
      stack: ["Python"],
      responsibilities: "Own webhook delivery.",
      evaluationFocus: ["correctness", "engineering_judgment"],
      companyContext: "Disposable staging workspace.",
    });
    await assert.rejects(() => invitations.createInvitation(db, memberA, draft, { email: emails.candidate, name: null }), /Publish the role/);
    const role = await roles.setRoleStatus(db, draft, "published");
    await assert.rejects(async () => {
      const { error } = await db.from("eng_roles").update({ title: "changed" }).eq("id", role.id);
      if (error) throw new Error(error.message);
    }, /frozen/);
    pass("role draft, publish, and database freeze after publish");

    const { invitation, url } = await invitations.createInvitation(db, memberA, role, { email: emails.candidate, name: "Staging Candidate" });
    assert.equal(invitation.email_delivery, "not_configured");
    await assert.rejects(() => invitations.createInvitation(db, memberA, role, { email: emails.candidate, name: null }), /already has an active invitation/);
    const token = url.split("/assess/invite/")[1];
    await assert.rejects(() => invitations.acceptInvitation(db, token, { id: ids.intruder, email: emails.intruder }), /was sent to/);
    const attempt0 = await invitations.acceptInvitation(db, token, { id: ids.candidate, email: emails.candidate });
    const again = await invitations.acceptInvitation(db, token, { id: ids.candidate, email: emails.candidate });
    assert.equal(again.id, attempt0.id);
    await assert.rejects(() => invitations.acceptInvitation(db, token, { id: ids.intruder, email: emails.intruder }), /another account/);
    pass("invitation: no email sent, duplicate blocked, wrong account refused, accept idempotent");

    await assert.rejects(() => attempts.getAttemptForCandidate(db, attempt0.id, ids.intruder), /not found/);
    await assert.rejects(() => attempts.getAttemptForOrg(db, attempt0.id, memberB.organizationId), /not found/);
    pass("service layer hides the attempt from other accounts and workspaces");

    const scenario = CURRENT_SCENARIO;
    let attempt = await attempts.recordConsent(db, attempt0, ids.candidate);
    await assert.rejects(() => attempts.submitSetupCode(db, attempt, scenario, "HWR-00000000", ids.candidate), /does not match/);
    const code = [...expectedSetupCodes(scenario).keys()][0];
    attempt = await attempts.submitSetupCode(db, attempt, scenario, code, ids.candidate);
    attempt = await attempts.startAttempt(db, attempt, ids.candidate);
    assert.equal(attempt.status, "in_progress");
    const restarted = await attempts.startAttempt(db, attempt, ids.candidate);
    assert.equal(restarted.started_at, attempt.started_at);
    await assert.rejects(async () => {
      const { error } = await db.from("eng_attempts").update({ started_at: new Date(0).toISOString() }).eq("id", attempt.id);
      if (error) throw new Error(error.message);
    }, /start time cannot change/);
    pass("consent, setup code, start once; the database refuses to move the start time");

    const msgId = `m_${randomUUID().replace(/-/g, "")}`;
    await attempts.sendMessage(db, attempt, scenario, { body: "Should retries stop after a 4xx response?", clientMsgId: msgId });
    const thread = await attempts.sendMessage(db, attempt, scenario, { body: "Should retries stop after a 4xx response?", clientMsgId: msgId });
    assert.equal(thread.filter((m) => m.client_msg_id === msgId).length, 1);
    assert.equal(thread.filter((m) => m.client_msg_id === `reply_${msgId}`).length, 1);
    pass("team thread retry stores exactly one message and one reply");

    const first = await attempts.saveDraft(db, attempt, "what_changed", "Started on the retry policy.", 0);
    assert.equal(first.ok, true);
    const stale = await attempts.saveDraft(db, attempt, "what_changed", "Stale tab edit", 0);
    assert.equal(stale.ok, false);
    pass("draft autosave uses compare-and-swap; a stale tab gets a conflict, not an overwrite");

    const early = await attempts.releaseUpdateIfDue(db, attempt, scenario, new Date(Date.parse(attempt.started_at!) + 60000));
    assert.equal(early.update_released_at, null);
    const later = new Date(Date.parse(attempt.started_at!) + scenario.requirementUpdate.releaseAfterMinutes * 60000 + 1000);
    attempt = await attempts.releaseUpdateIfDue(db, attempt, scenario, later);
    assert.ok(attempt.update_released_at);
    const twice = await attempts.releaseUpdateIfDue(db, attempt, scenario, later);
    assert.equal(twice.update_released_at, attempt.update_released_at);
    attempt = await attempts.acknowledgeUpdate(db, attempt, ids.candidate);
    pass("requirement update releases once, on the server clock, and is acknowledged");

    const interrupted = await uploads.initiateUpload(db, attempt, scenario, { fileName: "lost.zip", byteSize: 1000 });
    storagePaths.push(interrupted.upload.storage_path);
    const lost = await uploads.finalizeUpload(db, attempt, scenario, interrupted.upload.id);
    assert.equal(lost.status, "failed");
    const archive = submissionArchive(buildStarterArchive().bytes);
    const started = await uploads.initiateUpload(db, attempt, scenario, { fileName: "harbor-webhooks.zip", byteSize: archive.length });
    storagePaths.push(started.upload.storage_path);
    const uploadToken = new URL(started.signedUrl).searchParams.get("token");
    assert.ok(uploadToken);
    const candidateClient = await signedIn(emails.candidate, password);
    const put = await candidateClient.storage.from(uploads.SUBMISSION_BUCKET).uploadToSignedUrl(started.upload.storage_path, uploadToken, archive, { contentType: "application/zip" });
    assert.equal(put.error, null, put.error?.message);
    const accepted = await uploads.finalizeUpload(db, attempt, scenario, started.upload.id);
    assert.equal(accepted.status, "accepted", accepted.rejection_detail ?? "");
    await assert.rejects(() => submissions.submitAttempt(db, attempt, scenario, { uploadId: lost.id, handoff: { what_changed: "x", testing: "", risks: "", next_steps: "" }, aiDisclosure: "" }, ids.candidate), /passed the checks/);
    pass("interrupted upload ends failed and cannot be submitted; signed upload is verified from storage");

    const handoff = { what_changed: "Retries now stop on 4xx and back off on 5xx.", testing: "Ran the public tests.", risks: "Clock skew in backoff.", next_steps: "Add jitter." };
    const receipt = await submissions.submitAttempt(db, attempt, scenario, { uploadId: accepted.id, handoff, aiDisclosure: "None." }, ids.candidate);
    const repeat = await submissions.submitAttempt(db, attempt, scenario, { uploadId: accepted.id, handoff, aiDisclosure: "None." }, ids.candidate);
    assert.equal(repeat.submissionId, receipt.submissionId);
    assert.equal(repeat.alreadySubmitted, true);
    assert.equal(receipt.archiveSha256, accepted.sha256);
    attempt = await attempts.getAttemptForCandidate(db, attempt.id, ids.candidate);
    assert.equal(attempt.status, "submitted");
    await assert.rejects(() => attempts.saveDraft(db, attempt, "what_changed", "after submit", 1), /already submitted/);
    pass("submit is idempotent, receipt hash matches the stored archive, drafts lock after submit");

    let run = await reports.currentRun(db, attempt.id);
    assert.ok(run);
    const deadWorker = await queue.claimRun(db, `dead-${tag}`);
    assert.equal(deadWorker?.id, run!.id);
    await db.from("eng_evaluation_runs").update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", run!.id);
    const reclaimed = await queue.claimRun(db, `staging-${tag}`);
    assert.equal(reclaimed?.id, run!.id);
    assert.equal(reclaimed!.attempt_count, 2);
    assert.equal(await queue.processRun(db, deadWorker!), "running");
    run = await reports.currentRun(db, attempt.id);
    assert.equal(run!.status, "running");
    assert.equal(run!.lease_owner, `staging-${tag}`);
    const { data: reclaimEvents } = await db.from("eng_attempt_events").select("event_type").eq("attempt_id", attempt.id).in("event_type", ["evaluation_lease_reclaimed", "evaluation_blocked"]);
    assert.deepEqual((reclaimEvents ?? []).map((e) => e.event_type), ["evaluation_lease_reclaimed"]);
    pass("a dead worker's lease is reclaimed and the stale worker is fenced out without writing results or events");

    assert.equal(await queue.processRun(db, reclaimed!), "blocked");
    run = await reports.currentRun(db, attempt.id);
    assert.equal(run!.status, "blocked");
    assert.equal(run!.last_error_code, "executor_not_configured");
    const view = await submissions.getReceipt(db, attempt.id);
    assert.equal(view?.processing, "blocked");
    pass("without an isolated executor the run is honestly blocked (executor_not_configured), never scored; the receipt still stands");

    if (!localExecutor && !hostedSnapshot) {
      console.log("NOTE hidden tests not executed: rerun with FYDELL_EVAL_EXECUTOR=local-dev, or ENG_STAGING_HOSTED=1 with a snapshot, to cover grading, report and decision.");
    } else {
      if (hostedSnapshot) process.env.FYDELL_EXECUTION_SNAPSHOT_ID = hostedSnapshot;
      else process.env.FYDELL_EVAL_EXECUTOR = "local-dev";
      await queue.requeueRun(db, run!.id, "staging-test@fydell.local", "staging loop");
      const claimed = await queue.claimRun(db, `staging-${tag}`);
      assert.ok(claimed && claimed.id === run!.id);
      const status = await queue.processRun(db, claimed);
      assert.equal(status, "human_review");
      run = await reports.currentRun(db, attempt.id);
      const results = run!.results ?? [];
      assert.ok(results.length > 0);
      console.log(`INFO ${run!.executor} (${run!.environment_version}) results: ${results.map((r) => `${r.id}=${r.outcome}`).join(", ")}`);
      pass("hidden tests executed and recorded for human review");

      const employerA = await signedIn(emails.employerA, password);
      const employerB = await signedIn(emails.employerB, password);
      assert.equal(await visibleCount(employerA, "eng_reports", "attempt_id", attempt.id), 0);

      const { index } = await reports.buildEvidenceIndex(db, attempt, run!);
      const filePath = [...index.files.keys()].find((p) => p.endsWith("webhooks/dispatcher.py")) ?? [...index.files.keys()][0];
      const passedProbe = results.find((r) => r.outcome === "passed");
      const failedProbe = results.find((r) => r.outcome !== "passed");
      const thread2 = await attempts.listMessages(db, attempt.id);
      const candidateMsg = thread2.find((m) => m.sender === "candidate")!;
      const findings = [
        passedProbe
          ? { id: "f1", dimension: "correctness" as const, category: "coding_result" as const, kind: "strength" as const, basis: "observed" as const, statement: `Test ${passedProbe.id} passed.`, citations: [{ kind: "test" as const, ref: passedProbe.id }, { kind: "file" as const, ref: filePath, lineStart: 1, lineEnd: 1 }] }
          : { id: "f1", dimension: "correctness" as const, category: "coding_result" as const, kind: "gap" as const, basis: "observed" as const, statement: `Test ${failedProbe!.id} did not pass.`, citations: [{ kind: "test" as const, ref: failedProbe!.id }] },
        { id: "f2", dimension: "work_communication" as const, category: "communication" as const, kind: "observation" as const, basis: "observed" as const, statement: "Asked about 4xx handling early.", citations: [{ kind: "message" as const, ref: candidateMsg.id }, { kind: "handoff" as const, ref: "what_changed" }] },
      ];
      const brief = {
        summary: "Staging test report written by the automated loop, not a real assessment.",
        strengths: [],
        gaps: [],
        limitations: ["Synthetic staging submission."],
        followUps: ["Walk through the backoff choice."],
        dimensions: (["correctness", "engineering_judgment", "requirement_response", "work_communication"] as const).map((key) => ({ key, level: "insufficient_evidence" as const, rationale: "Staging test only." })),
      };
      await reports.saveReportDraft(db, attempt, "staging-reviewer@fydell.local", { brief, findings: [{ ...findings[0], citations: [{ kind: "file", ref: "missing.py", lineStart: 1 }] }], changeReason: null, reviewMinutes: 1 });
      await assert.rejects(() => reports.releaseReport(db, attempt, "staging-reviewer@fydell.local"), (e: unknown) => e instanceof reports.ReportError && e.problems.length > 0);
      await reports.saveReportDraft(db, attempt, "staging-reviewer@fydell.local", { brief, findings, changeReason: null, reviewMinutes: 3 });
      assert.equal(await visibleCount(employerA, "eng_reports", "attempt_id", attempt.id), 0);
      const released = await reports.releaseReport(db, attempt, "staging-reviewer@fydell.local");
      assert.equal(released.status, "released");
      await assert.rejects(async () => {
        const { error } = await db.from("eng_reports").update({ findings: [] }).eq("id", released.id);
        if (error) throw new Error(error.message);
      }, /immutable/);
      assert.equal(await visibleCount(employerA, "eng_reports", "attempt_id", attempt.id), 1);
      assert.equal(await visibleCount(employerB, "eng_reports", "attempt_id", attempt.id), 0);
      assert.equal(await visibleCount(candidateClient, "eng_reports", "attempt_id", attempt.id), 0);
      pass("release gate rejects an uncited finding; drafts hidden; released report frozen and visible only to the workspace");

      await employer.recordDecision(db, memberA, attempt, "hold", "Staging test decision.");
      await employer.flagFinding(db, memberA, attempt, "f2", "Staging test flag.");
      assert.equal(await visibleCount(employerA, "eng_decisions", "attempt_id", attempt.id), 1);
      assert.equal(await visibleCount(employerB, "eng_decisions", "attempt_id", attempt.id), 0);
      pass("employer decision and finding flag recorded and scoped to the workspace");
    }

    const employerA = await signedIn(emails.employerA, password);
    const employerB = await signedIn(emails.employerB, password);
    const intruder = await signedIn(emails.intruder, password);
    const anon = createClient(devUrl!, anonKey!, { auth: { persistSession: false } });
    for (const [table, column, value] of [
      ["eng_roles", "organization_id", memberA.organizationId],
      ["eng_invitations", "organization_id", memberA.organizationId],
      ["eng_attempts", "id", attempt.id],
      ["eng_messages", "attempt_id", attempt.id],
      ["eng_uploads", "attempt_id", attempt.id],
      ["eng_submissions", "attempt_id", attempt.id],
      ["eng_evaluation_runs", "attempt_id", attempt.id],
      ["eng_attempt_events", "attempt_id", attempt.id],
    ] as const) {
      assert.ok((await visibleCount(employerA, table, column, value)) > 0, `workspace A sees its ${table}`);
      assert.equal(await visibleCount(employerB, table, column, value), 0, `workspace B sees no ${table}`);
      assert.equal(await visibleCount(intruder, table, column, value), 0, `unrelated account sees no ${table}`);
      assert.equal(await visibleCount(anon, table, column, value), 0, `anon sees no ${table}`);
    }
    assert.ok((await visibleCount(candidateClient, "eng_attempts", "id", attempt.id)) > 0);
    assert.ok((await visibleCount(candidateClient, "eng_messages", "attempt_id", attempt.id)) > 0);
    assert.ok((await visibleCount(candidateClient, "eng_drafts", "attempt_id", attempt.id)) > 0);
    assert.equal(await visibleCount(candidateClient, "eng_evaluation_runs", "attempt_id", attempt.id), 0);
    assert.equal(await visibleCount(candidateClient, "eng_invitations", "id", invitation.id), 0);
    assert.equal(await visibleCount(employerA, "eng_drafts", "attempt_id", attempt.id), 0);
    pass("RLS: other workspace, unrelated account and anon see nothing; candidate sees own work but not test results; drafts are candidate-only");

    const { error: writeError } = await candidateClient.from("eng_messages").insert({ attempt_id: attempt.id, sender: "teammate", teammate_id: "x", body: "forged" });
    assert.ok(writeError, "authenticated clients cannot write directly");
    const { error: rpcError } = await employerA.rpc("eng_release_report", { p_report_id: randomUUID() });
    assert.ok(rpcError, "release RPC is service-role only");
    const { data: leaked } = await employerB.storage.from(uploads.SUBMISSION_BUCKET).download(accepted.storage_path);
    assert.equal(leaked, null, "another workspace cannot read the archive");
    const { data: leakedOwn } = await candidateClient.storage.from(uploads.SUBMISSION_BUCKET).download(accepted.storage_path);
    assert.equal(leakedOwn, null, "the bucket has no direct read path, even for the owner");
    pass("direct writes, release RPC and storage reads are refused to signed-in clients");

    console.log(`ENG_STAGING_OK ${passed} checks`);
  } finally {
    await cleanup(db, orgIds, userIds, storagePaths);
  }
}

async function cleanup(db: SupabaseClient, orgIds: string[], userIds: string[], storagePaths: string[]) {
  if (storagePaths.length) await db.storage.from("eng-submissions").remove(storagePaths);
  if (orgIds.length && devDbUrl) {
    if (!devDbUrl.includes(PROJECT_REF)) {
      console.log(
        `CLEANUP SKIPPED: FYDELL_DEV_DB_URL does not name ${PROJECT_REF}. Evidence rows are append-only, so remove orgs ${orgIds.join(", ")} ` +
          "and users eng-staging-*@example.com from the fydell-dev SQL editor with session_replication_role = replica."
      );
      return;
    }
    const sql = postgres(devDbUrl, { max: 1, prepare: false });
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe("set local session_replication_role = replica");
        const attemptIds = (await tx`select id from public.eng_attempts where organization_id = any(${orgIds}::uuid[])`).map((r) => r.id as string);
        for (const table of ["eng_finding_flags", "eng_decisions", "eng_review_notes", "eng_reports", "eng_evaluation_runs", "eng_submissions", "eng_uploads", "eng_drafts", "eng_messages", "eng_attempt_events"]) {
          await tx.unsafe(`delete from public.${table} where attempt_id = any($1::uuid[])`, [attemptIds]);
        }
        await tx`delete from public.eng_attempts where organization_id = any(${orgIds}::uuid[])`;
        await tx`delete from public.eng_invitations where organization_id = any(${orgIds}::uuid[])`;
        await tx`delete from public.eng_roles where organization_id = any(${orgIds}::uuid[])`;
      });
    } finally {
      await sql.end();
    }
  } else if (orgIds.length) {
    console.log(`CLEANUP PARTIAL: FYDELL_DEV_DB_URL not set; evidence rows for orgs ${orgIds.join(", ")} remain (append-only).`);
    return;
  }
  for (const id of orgIds) await db.from("organizations").delete().eq("id", id);
  for (const id of userIds) await db.auth.admin.deleteUser(id);
  console.log("Removed only the disposable workspaces, accounts, rows and files this run created.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : "eng staging loop failed");
  process.exitCode = 1;
});
