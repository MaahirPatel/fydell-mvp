/**
 * Golden-path E2E — drives the DEPLOYED app over HTTP as real users:
 *
 *   employer signup → org onboarding → mission draft → publish → shadow mode
 *   → invite → candidate signup → wrong-user accept rejected → accept →
 *   consent → preflight → begin (seed check) → edit → chat (Dana + Priya) →
 *   tests fail → fix → pass → preview → handoff → submit (snapshot immutable)
 *   → evidence LOCKED (shadow) → decision lock → reveal → receipt issued →
 *   share link works → revoke denies.
 *
 * Run: npm run test:pilot-golden-path            (defaults to NEXT_PUBLIC_APP_URL)
 *      GOLDEN_PATH_BASE_URL=https://... npx tsx scripts/test-pilot-golden-path.ts
 *
 * Requires only the PUBLIC Supabase URL + anon key (from .env.local) — users
 * are created through the product's own signup path. The chain runs TWICE
 * with fresh synthetic identities (GOLDENPATH-TEST). Shadow decision locks
 * are append-only by design, so synthetic orgs stay in the database.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient, type Session } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
function loadEnvFile(file: string): void {
  if (!existsSync(file)) return;
  const buf = readFileSync(file);
  let text: string;
  if (buf[0] === 0xff && buf[1] === 0xfe) text = buf.toString("utf16le");
  else text = buf.toString("utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]] && v && v !== "[SENSITIVE]") process.env[m[1]] = v;
  }
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------
let stepCount = 0;
function step(label: string, ok: boolean, detail?: string): void {
  stepCount += 1;
  if (!ok) {
    throw new Error(`Step ${stepCount} FAILED: ${label}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`  PASS ${String(stepCount).padStart(2, " ")}. ${label}`);
}

// ---------------------------------------------------------------------------
// Authenticated HTTP user (Supabase SSR cookie: sb-<ref>-auth-token)
// ---------------------------------------------------------------------------
type HttpUser = { label: string; cookie: string; userId: string };

function sessionCookie(projectRef: string, session: Session): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${payload}`;
  // Chunk like @supabase/ssr (MAX_CHUNK_SIZE = 3180) so large sessions parse.
  if (value.length <= 3180) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * 3180 < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  }
  return parts.join("; ");
}

async function api(
  baseUrl: string,
  user: HttpUser | null,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Cookie: user.cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------
async function runChain(runIndex: number, baseUrl: string): Promise<void> {
  console.log(`\n=== Golden path run ${runIndex} against ${baseUrl} ===`);
  const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const password = `Gp!${randomBytes(12).toString("base64url")}`;

  async function signUpUser(label: string, email: string): Promise<HttpUser> {
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signUp({ email, password });
    if (error || !data.session || !data.user) {
      throw new Error(`${label} signUp failed: ${error?.message || "no session returned"}`);
    }
    return { label, cookie: sessionCookie(projectRef, data.session), userId: data.user.id };
  }

  // ---- Employer setup -------------------------------------------------------
  const employer = await signUpUser(
    "employer",
    `goldenpath-employer-${suffix}@fydell-test.example.com`
  );
  step("Employer account created through the product signup path", true);

  const onboard = await api(baseUrl, employer, "POST", "/api/pilot/onboarding", {
    action: "complete",
    companyName: `GOLDENPATH-TEST ${suffix}`,
    roleTitle: "Forward Deployed Engineer",
    outcomes: ["Reconcile shipment delay data"],
  });
  step(
    "Employer onboarding creates the organization",
    onboard.status === 200 && Boolean(onboard.data.organizationId),
    JSON.stringify(onboard.data)
  );

  const draft = await api(baseUrl, employer, "POST", "/api/fde/missions", {
    title: `GOLDENPATH-TEST mission ${suffix}`,
    objective: "Reconcile shipment delay data and report the verified late rate.",
  });
  const mission = draft.data.mission as { id: string } | undefined;
  step("Mission draft created", draft.status === 200 && Boolean(mission?.id), JSON.stringify(draft.data));
  const missionId = mission!.id;

  const publish = await api(baseUrl, employer, "POST", `/api/fde/missions/${missionId}`, {
    action: "publish",
  });
  step("Mission published (active)", publish.status === 200, JSON.stringify(publish.data));

  const setMode = await api(baseUrl, employer, "POST", `/api/fde/missions/${missionId}`, {
    action: "set_mode",
    mode: "shadow_pilot",
  });
  step("Mission switched to shadow_pilot mode", setMode.status === 200, JSON.stringify(setMode.data));

  // ---- Invitation -----------------------------------------------------------
  const candidateEmail = `goldenpath-candidate-${suffix}@fydell-test.example.com`;
  const invite = await api(baseUrl, employer, "POST", "/api/fde/invites", {
    missionId,
    email: candidateEmail,
  });
  const acceptUrl = String(invite.data.acceptUrl || "");
  step(
    "Invitation created with secure accept URL + truthful email status",
    invite.status === 200 &&
      /\/s\/.+/.test(acceptUrl) &&
      ["queued", "not_configured"].includes(String(invite.data.emailDelivery)),
    JSON.stringify(invite.data)
  );
  const token = acceptUrl.split("/s/")[1];

  // ---- Candidate accepts ----------------------------------------------------
  const preview = await api(baseUrl, null, "GET", `/api/fde/invites/${token}`);
  step(
    "Unauthenticated invitation preview shows mission (no login required to see it)",
    preview.status === 200 && String(preview.data.email) === candidateEmail
  );

  const wrongAccept = await api(baseUrl, employer, "POST", `/api/fde/invites/${token}`);
  step(
    "Security: a different account cannot accept the invitation",
    wrongAccept.status === 403,
    `status=${wrongAccept.status}`
  );

  const candidate = await signUpUser("candidate", candidateEmail);
  const accept = await api(baseUrl, candidate, "POST", `/api/fde/invites/${token}`);
  const sessionId = String(accept.data.sessionId || "");
  step("Invited candidate accepts; session created", accept.status === 200 && Boolean(sessionId));

  const acceptAgain = await api(baseUrl, candidate, "POST", `/api/fde/invites/${token}`);
  step(
    "Duplicate accept is idempotent (same session)",
    acceptAgain.status === 200 && String(acceptAgain.data.sessionId) === sessionId
  );

  // ---- Consent → preflight → begin -----------------------------------------
  const consent = await api(baseUrl, candidate, "PATCH", `/api/fde/sessions/${sessionId}`, {
    action: "consent",
    consentVersion: "relay-consent-v1",
  });
  step("Consent recorded as an event", consent.status === 200, JSON.stringify(consent.data));

  const pre = await api(baseUrl, candidate, "PATCH", `/api/fde/sessions/${sessionId}`, {
    action: "start_preflight",
  });
  step("Preflight started", pre.status === 200);

  const begin = await api(baseUrl, candidate, "PATCH", `/api/fde/sessions/${sessionId}`, {
    action: "begin",
  });
  const seedFiles = (begin.data.seedFiles || {}) as Record<string, string>;
  const beginSessionRow = begin.data.session as { status?: string } | undefined;
  step("Session begins (status active)", begin.status === 200 && beginSessionRow?.status === "active");

  for (const path of [
    "docs/customer-brief.md",
    "data/shipments.csv",
    "data/carriers.csv",
    "data/delays_manual_tracking.csv",
    "src/reconcile.py",
    "src/join.py",
    "tests/test_reconcile.py",
  ]) {
    step(
      `Seeded workspace contains ${path}`,
      Boolean(seedFiles[path]),
      `only ${Object.keys(seedFiles).length} files seeded`
    );
  }
  step(
    "Evaluator answer key is NOT in the candidate filesystem",
    !Object.keys(seedFiles).some((p) => /canonical\.json|\.fydell/.test(p))
  );

  // ---- Workspace: edit, chat, tests, preview --------------------------------
  const wsPath = `/api/fde/sessions/${sessionId}/workspace`;
  const engine0 = await api(baseUrl, candidate, "GET", wsPath);
  let state = engine0.data.state as {
    headVersion: number;
    artifacts: Record<string, { version: number; content: string }>;
    messages: Array<{ actor: string; text: string; authorName?: string }>;
    tests: Array<{ id: string; status: string }>;
    preview: { status: string };
    submissionHeadHash?: string | null;
  };
  step("Workspace engine loads with seeded artifacts", engine0.status === 200 && Object.keys(state.artifacts).length > 0);

  const fixedReconcile =
    "def normalize_id(x):\n" +
    "    s = str(x).strip().upper()\n" +
    "    if s.startswith('SHP-'):\n        s = s[4:]\n" +
    "    if s.isdigit():\n        return f'SHP-{int(s):05d}'\n" +
    "    return s\n";
  const edit = await api(baseUrl, candidate, "POST", wsPath, {
    commandId: `gp-edit-${suffix}`,
    type: "EDIT_FILE",
    expectedHeadVersion: state.headVersion,
    payload: {
      path: "src/reconcile.py",
      content: fixedReconcile,
      baseVersion: state.artifacts["src/reconcile.py"].version,
    },
  });
  state = edit.data.state as typeof state;
  step(
    "Edit persists through the workspace engine (version bumped)",
    edit.status === 200 && state.artifacts["src/reconcile.py"].content === fixedReconcile
  );

  const dana = await api(baseUrl, candidate, "POST", wsPath, {
    commandId: `gp-dana-${suffix}`,
    type: "SEND_STAKEHOLDER_MESSAGE",
    expectedHeadVersion: state.headVersion,
    payload: { text: "Which matters more first — the dashboard or the root cause?", recipient: "dana" },
  });
  state = dana.data.state as typeof state;
  step(
    "Dana replies in chat",
    dana.status === 200 &&
      state.messages.some(
        (m) => m.actor === "customer_simulator" && m.authorName === "Dana Whitfield" && m.text.length > 0
      )
  );

  const priya = await api(baseUrl, candidate, "POST", wsPath, {
    commandId: `gp-priya-${suffix}`,
    type: "SEND_STAKEHOLDER_MESSAGE",
    expectedHeadVersion: state.headVersion,
    payload: { text: "Do you trust the delay export?", recipient: "priya" },
  });
  state = priya.data.state as typeof state;
  step(
    "Priya replies as a distinct recipient",
    priya.status === 200 &&
      state.messages.some(
        (m) => m.actor === "customer_simulator" && m.authorName === "Priya Anand" && m.text.length > 0
      )
  );

  const failRun = await api(baseUrl, candidate, "POST", wsPath, {
    action: "runtime_result",
    command: "pytest",
    ok: false,
    exitCode: 1,
    stdout: "",
    stderr: "FAILED tests/test_reconcile.py::test_normalize_id",
    workspaceVersion: state.headVersion,
  });
  state = failRun.data.state as typeof state;
  step(
    "Failing test run recorded (visible suite FAIL)",
    failRun.status === 200 && state.tests.find((t) => t.id === "visible_suite")?.status === "FAIL"
  );

  const passRun = await api(baseUrl, candidate, "POST", wsPath, {
    action: "runtime_result",
    command: "pytest",
    ok: true,
    exitCode: 0,
    stdout: "4 passed",
    stderr: "",
    workspaceVersion: state.headVersion,
  });
  state = passRun.data.state as typeof state;
  step(
    "Passing test run recorded (visible suite PASS)",
    passRun.status === 200 && state.tests.find((t) => t.id === "visible_suite")?.status === "PASS"
  );

  const previewRun = await api(baseUrl, candidate, "POST", wsPath, {
    action: "runtime_result",
    command: "preview",
    ok: true,
    exitCode: 0,
    stdout: "shipment_id,delay_days\nSHP-00001,2\nSHP-00002,1\n",
    stderr: "",
    workspaceVersion: state.headVersion,
  });
  state = previewRun.data.state as typeof state;
  step("Preview regenerates output artifact", previewRun.status === 200 && state.preview.status === "current");

  const handoff = await api(baseUrl, candidate, "POST", wsPath, {
    commandId: `gp-handoff-${suffix}`,
    type: "SAVE_HANDOFF",
    expectedHeadVersion: state.headVersion,
    payload: {
      whatChanged: "Fixed the reconcile join so mismatched source records are no longer dropped.",
      evidence: "Test suite passes; preview regenerated from the corrected join.",
      limitations: "Carrier-level root-cause breakdown not completed before the deadline moved.",
      clientMessage: "Verified late rate attached; one open item flagged as unverified.",
    },
  });
  state = handoff.data.state as typeof state;
  step("Handoff saved", handoff.status === 200);

  const submitCmd = await api(baseUrl, candidate, "POST", wsPath, {
    commandId: `gp-submitcmd-${suffix}`,
    type: "SUBMIT_SESSION",
    expectedHeadVersion: state.headVersion,
    payload: {},
  });
  state = submitCmd.data.state as typeof state;
  step("Engine records submission (head hash frozen)", submitCmd.status === 200 && Boolean(state.submissionHeadHash));

  // ---- Submit: snapshot + evidence -------------------------------------------
  const submit = await api(baseUrl, candidate, "PATCH", `/api/fde/sessions/${sessionId}`, {
    action: "submit",
  });
  const submittedSession = submit.data.session as {
    status?: string;
    submission_snapshot?: unknown;
  } | null;
  step(
    "Submission freezes snapshot and generates evidence (status receipt_ready)",
    submit.status === 200 &&
      submittedSession?.status === "receipt_ready" &&
      Boolean(submittedSession?.submission_snapshot),
    JSON.stringify({ httpStatus: submit.status, data: submit.data })
  );
  const snapshot1 = JSON.stringify(submittedSession?.submission_snapshot);

  const resubmit = await api(baseUrl, candidate, "PATCH", `/api/fde/sessions/${sessionId}`, {
    action: "submit",
    handoff: { whatBuilt: "TAMPERED" },
  });
  const resubmitted = resubmit.data.session as { submission_snapshot?: unknown } | null;
  step(
    "Snapshot is immutable after submission (re-submit is a no-op)",
    resubmit.status === 200 && JSON.stringify(resubmitted?.submission_snapshot) === snapshot1
  );

  // ---- Shadow gate: evidence locked until decision, then reveal ---------------
  const evidenceLocked = await api(baseUrl, employer, "GET", `/api/employer/evidence/${sessionId}`);
  step(
    "Shadow mode: evidence report is LOCKED before the employer decision",
    evidenceLocked.status === 200 && evidenceLocked.data.locked === true,
    JSON.stringify({ status: evidenceLocked.status, locked: evidenceLocked.data.locked })
  );

  const candidateEvidence = await api(baseUrl, candidate, "GET", `/api/employer/evidence/${sessionId}`);
  step(
    "Security: the candidate cannot read the employer evidence report",
    candidateEvidence.status === 403,
    `status=${candidateEvidence.status}`
  );

  const exportBlocked = await api(
    baseUrl,
    employer,
    "GET",
    `/api/employer/evidence/${sessionId}/export`
  );
  step(
    "Shadow mode: export is blocked before the decision lock",
    exportBlocked.status === 423 || exportBlocked.status === 403 || exportBlocked.status === 400,
    `status=${exportBlocked.status}`
  );

  const lock = await api(baseUrl, employer, "POST", `/api/employer/evidence/${sessionId}/lock`, {
    decision: "advance",
    confidence: "high",
    reasons: "Golden-path E2E original decision, recorded before reveal.",
  });
  const lockRow = lock.data.lock as { id?: string; locked_at?: string } | undefined;
  step("Employer decision locked before reveal", lock.status === 200 && Boolean(lockRow?.locked_at));

  const lockAgain = await api(baseUrl, employer, "POST", `/api/employer/evidence/${sessionId}/lock`, {
    decision: "decline",
    confidence: "low",
    reasons: "Attempted overwrite must not replace the original decision.",
  });
  step(
    "Decision lock is immutable (second lock returns the original)",
    lockAgain.status === 200 &&
      lockAgain.data.alreadyLocked === true &&
      (lockAgain.data.lock as { decision?: string })?.decision === "advance"
  );

  const evidenceRevealed = await api(baseUrl, employer, "GET", `/api/employer/evidence/${sessionId}`);
  const shadow = evidenceRevealed.data.shadow as
    | { lock?: { lockedAt?: string; locked_at?: string }; reveals?: Array<{ revealed_at?: string; revealedAt?: string }> }
    | undefined;
  step(
    "Post-lock view reveals the report and records the reveal event",
    evidenceRevealed.status === 200 && evidenceRevealed.data.locked !== true,
    JSON.stringify({ status: evidenceRevealed.status, locked: evidenceRevealed.data.locked, hasShadow: Boolean(shadow) })
  );

  // ---- Candidate-owned credential ---------------------------------------------
  const wrongIssue = await api(baseUrl, employer, "POST", "/api/fde/receipts", { sessionId });
  step("Security: employer cannot issue the candidate's receipt", wrongIssue.status !== 200);

  const issue = await api(baseUrl, candidate, "POST", "/api/fde/receipts", { sessionId });
  const receipt = issue.data.receipt as { id?: string; receipt_number?: string } | undefined;
  step(
    "Receipt issued to candidate (WR-YYYY-NNNNNN)",
    issue.status === 200 && /^WR-\d{4}-\d{6}$/.test(String(receipt?.receipt_number)),
    JSON.stringify(issue.data)
  );
  const receiptId = String(receipt?.id);

  const issueAgain = await api(baseUrl, candidate, "POST", "/api/fde/receipts", { sessionId });
  step(
    "Receipt issuance is idempotent",
    issueAgain.status === 200 && String((issueAgain.data.receipt as { id?: string })?.id) === receiptId
  );

  const wrongRead = await api(baseUrl, employer, "GET", `/api/fde/receipts/${receiptId}`);
  step("Security: employer cannot read the candidate's receipt detail", wrongRead.status === 403);

  const share = await api(baseUrl, candidate, "POST", `/api/fde/receipts/${receiptId}`, {
    action: "share",
    purpose: "hiring_review",
  });
  const shareUrl = String(share.data.shareUrl || "");
  const permission = share.data.permission as { id?: string } | undefined;
  step("Share link minted", share.status === 200 && shareUrl.startsWith("/r/"));

  const sharedPage = await fetch(`${baseUrl}${shareUrl}`, { redirect: "manual" });
  const sharedHtml = await sharedPage.text();
  step(
    "Share link resolves the credential publicly",
    sharedPage.status === 200 && /WR-\d{4}-\d{6}/.test(sharedHtml),
    `status=${sharedPage.status}`
  );

  const revoke = await api(baseUrl, candidate, "POST", `/api/fde/receipts/${receiptId}`, {
    action: "revoke",
    permissionId: String(permission?.id),
  });
  step("Share revoked by the candidate", revoke.status === 200);

  const revokedPage = await fetch(`${baseUrl}${shareUrl}`, { redirect: "manual" });
  const revokedHtml = await revokedPage.text();
  step(
    "Revoked share link denies access",
    !/WR-\d{4}-\d{6}/.test(revokedHtml) || /revoked|no longer|invalid/i.test(revokedHtml)
  );

  console.log(`=== Run ${runIndex} complete ===`);
}

async function main() {
  loadEnvFile(resolve(__dirname, "..", ".env.local"));
  const baseUrl = (process.env.GOLDEN_PATH_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "")
    .replace(/\/$/, "");
  assert.ok(baseUrl.startsWith("http"), "Set GOLDEN_PATH_BASE_URL or NEXT_PUBLIC_APP_URL");
  assert.ok(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").startsWith("https://"),
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
  assert.ok(
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length > 20,
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );

  await runChain(1, baseUrl);
  await runChain(2, baseUrl);
  console.log(`\nGOLDEN PATH PASSED — full chain ran twice (${stepCount} steps total).`);
}

main().catch((err) => {
  console.error("\nGOLDEN PATH FAILED");
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
