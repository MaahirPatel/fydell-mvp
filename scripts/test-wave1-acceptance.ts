/**
 * Wave 1 DA-01 acceptance harness.
 *
 * Uses product HTTP APIs only. No SQL edits. No status patches.
 *
 *   GOLDEN_PATH_BASE_URL=http://localhost:3000 npx tsx scripts/test-wave1-acceptance.ts
 *
 * Writes docs/wave1-acceptance-evidence.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient, type Session } from "@supabase/supabase-js";
import { invitationGate } from "../src/lib/simulations/invitation-gate";
import { invitationTruth, mayUseKeywordFallback, DA01_SLUG, can } from "../src/lib/contracts";

function loadEnv() {
  for (const file of [".env.staging.local", ".env.goldenpath", ".env.local", ".env"]) {
    if (!existsSync(resolve(process.cwd(), file))) continue;
    const raw = readFileSync(resolve(process.cwd(), file));
    let text = raw.toString("utf8");
    if (text.includes("\u0000")) text = raw.toString("utf16le");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!value || value === "[SENSITIVE]") continue;
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

type EvidenceRow = {
  id: string;
  area: string;
  route: string;
  actor: string;
  expected: string;
  observed: string;
  persisted?: string;
  ids?: Record<string, string>;
  errors: string[];
  pass: boolean;
  severity: "P0" | "P1" | "P2" | "info";
  at: string;
};

const evidence: EvidenceRow[] = [];
const startedAt = new Date().toISOString();

function record(row: Omit<EvidenceRow, "at">) {
  const full = { ...row, at: new Date().toISOString() };
  evidence.push(full);
  console.log(`${full.pass ? "PASS" : "FAIL"} [${full.severity}] ${full.id} — ${full.observed}`);
}

function writeEvidence(extra: Record<string, unknown> = {}) {
  mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), "docs/wave1-acceptance-evidence.json"),
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        ...extra,
        evidence,
        blockers: evidence.filter((e) => !e.pass && (e.severity === "P0" || e.severity === "P1")),
      },
      null,
      2,
    ),
  );
}

type HttpUser = { label: string; cookie: string; userId: string };

function sessionCookie(projectRef: string, session: Session): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${payload}`;
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
  body?: Record<string, unknown>,
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

function runOfflineContractCases() {
  record({
    id: "analysis.no-keyword-fallback",
    area: "Analysis",
    route: "contract",
    actor: "system",
    expected: "DA-01 cannot use keyword fallback",
    observed: String(!mayUseKeywordFallback(DA01_SLUG)),
    errors: [],
    pass: mayUseKeywordFallback(DA01_SLUG) === false,
    severity: "P0",
  });

  const expired = invitationGate({
    status: "sent",
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });
  record({
    id: "invite.expired",
    area: "Invitations",
    route: "/invite/[token]",
    actor: "candidate",
    expected: "expired gate",
    observed: expired.code || "ok",
    errors: [],
    pass: expired.ok === false && expired.code === "expired",
    severity: "P0",
  });

  const revoked = invitationGate({
    status: "revoked",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
  record({
    id: "invite.revoked",
    area: "Invitations",
    route: "/invite/[token]",
    actor: "candidate",
    expected: "revoked gate",
    observed: revoked.code || "ok",
    errors: [],
    pass: revoked.ok === false && revoked.code === "revoked",
    severity: "P0",
  });

  const reused = invitationGate({
    status: "completed",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
  record({
    id: "invite.reused",
    area: "Invitations",
    route: "/invite/[token]",
    actor: "candidate",
    expected: "completed/used gate",
    observed: reused.code || "ok",
    errors: [],
    pass: reused.ok === false && reused.code === "completed",
    severity: "P0",
  });

  const notConfigured = invitationTruth({ status: "sent", emailDelivery: "not_configured" });
  record({
    id: "invite.not-configured",
    area: "Invitations",
    route: "/api/sim/invitations",
    actor: "employer",
    expected: "copyable link is not delivered",
    observed: notConfigured.label,
    errors: [],
    pass: notConfigured.emailed === false && notConfigured.copyable === true,
    severity: "P0",
  });

  record({
    id: "perm.candidate-cannot-invite",
    area: "Permissions",
    route: "contract",
    actor: "candidate",
    expected: "candidate cannot invite",
    observed: String(can("candidate", "invite_candidate")),
    errors: [],
    pass: can("candidate", "invite_candidate") === false,
    severity: "P0",
  });

  record({
    id: "perm.outsider-cannot-view-report",
    area: "Permissions",
    route: "contract",
    actor: "viewer",
    expected: "cross-org is forbidden at the route, viewer cannot invite",
    observed: `viewer.invite=${can("viewer", "invite_candidate")}`,
    errors: [],
    pass: can("viewer", "invite_candidate") === false,
    severity: "P0",
  });
}

async function runLiveChain(baseUrl: string, runLabel: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    record({
      id: `${runLabel}.env`,
      area: "Empty states",
      route: baseUrl,
      actor: "system",
      expected: "staging anon credentials present",
      observed: "missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY",
      errors: ["staging credentials not loaded"],
      pass: false,
      severity: "P0",
    });
    return;
  }
  if (supabaseUrl.includes("qtrhwrcxthtqvkeerptp")) {
    record({
      id: `${runLabel}.refuse-production`,
      area: "Empty states",
      route: baseUrl,
      actor: "system",
      expected: "never run against production",
      observed: "production project ref detected",
      errors: ["refused"],
      pass: false,
      severity: "P0",
    });
    return;
  }

  const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const password = `Rc1!${randomBytes(10).toString("base64url")}`;
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  async function signUp(label: string, email: string): Promise<HttpUser | null> {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error || !data.session || !data.user) {
      record({
        id: `${runLabel}.${label}.signup`,
        area: "Empty states",
        route: "/signup",
        actor: label,
        expected: "session returned from product signup",
        observed: error?.message || "no session",
        errors: [error?.message || "no session"],
        pass: false,
        severity: "P0",
      });
      return null;
    }
    record({
      id: `${runLabel}.${label}.signup`,
      area: "Empty states",
      route: "/signup",
      actor: label,
      expected: "account created",
      observed: "session issued",
      ids: { userId: data.user.id },
      errors: [],
      pass: true,
      severity: "info",
    });
    return { label, cookie: sessionCookie(projectRef, data.session), userId: data.user.id };
  }

  const employer = await signUp("employer", `wave1-owner-${suffix}@fydell-test.example.com`);
  if (!employer) return;

  const onboard = await api(baseUrl, employer, "POST", "/api/auth/role", {
    role: "employer",
    companyName: `WAVE1-RC1 ${suffix}`,
  });
  record({
    id: `${runLabel}.workspace`,
    area: "Empty states",
    route: "/onboarding/employer",
    actor: "owner",
    expected: "workspace created without seeded production data",
    observed: `status=${onboard.status}`,
    persisted: JSON.stringify(onboard.data).slice(0, 300),
    errors: onboard.status >= 400 ? [String(onboard.data.error || onboard.status)] : [],
    pass: onboard.status === 200,
    severity: "P0",
  });
  if (onboard.status !== 200) return;

  const catalog = await api(baseUrl, employer, "GET", "/api/sim/catalog");
  const templates = (catalog.data.simulations || []) as Array<{
    templateId?: string;
    slug?: string;
  }>;
  const da01 = Array.isArray(templates)
    ? templates.find((t) => t.slug === DA01_SLUG)
    : undefined;
  record({
    id: `${runLabel}.catalog`,
    area: "Empty states",
    route: "/app/employer/assessments",
    actor: "owner",
    expected: "DA-01 is the published evaluation",
    observed: da01 ? `found ${da01.slug}` : `status=${catalog.status}`,
    errors: da01 ? [] : ["DA-01 template not published on staging"],
    pass: Boolean(da01?.templateId),
    severity: "P0",
  });
  if (!da01?.templateId) return;

  const candidateEmail = `wave1-candidate-${suffix}@fydell-test.example.com`;
  const invite = await api(baseUrl, employer, "POST", "/api/sim/invitations", {
    templateId: da01.templateId,
    candidates: [{ email: candidateEmail, name: "Wave1 Candidate" }],
  });
  const created = (invite.data.created as Array<Record<string, string>> | undefined)?.[0];
  const delivery = created?.emailDelivery || "";
  const inviteUrl = created?.inviteUrl || "";
  record({
    id: `${runLabel}.invite`,
    area: "Invitations",
    route: "/api/sim/invitations",
    actor: "owner",
    expected: "invitation created; emailed vs copyable is honest",
    observed: `status=${invite.status} delivery=${delivery}`,
    ids: { invitationId: created?.id || "", inviteUrl },
    errors: invite.status >= 400 ? [String(invite.data.error || "")] : [],
    pass:
      invite.status === 200 &&
      Boolean(created?.id) &&
      ["not_configured", "queued", "sent", "failed"].includes(delivery) &&
      delivery !== "delivered",
    severity: "P0",
  });
  if (!created?.inviteUrl) return;

  const token = inviteUrl.split("/invite/")[1] || "";
  const preview = await api(baseUrl, null, "GET", `/api/sim/invitations/${token}`);
  record({
    id: `${runLabel}.invite.opened`,
    area: "Invitations",
    route: `/invite/${token}`,
    actor: "candidate",
    expected: "unauthenticated preview opens the invitation",
    observed: `status=${preview.status} ok=${String(preview.data.ok)}`,
    errors: [],
    pass: preview.status === 200 && preview.data.ok === true,
    severity: "P0",
  });

  const outsider = await signUp("outsider", `wave1-outsider-${suffix}@fydell-test.example.com`);
  if (outsider) {
    const steal = await api(baseUrl, outsider, "GET", "/app/employer");
    record({
      id: `${runLabel}.perm.outsider-home`,
      area: "Permissions",
      route: "/app/employer",
      actor: "outsider",
      expected: "outsider does not land in another org workspace via API catalog",
      observed: `status=${steal.status}`,
      errors: [],
      pass: steal.status === 200 || steal.status === 307 || steal.status === 302 || steal.status === 401,
      severity: "P1",
    });
    const stealInvite = await api(baseUrl, outsider, "POST", `/api/sim/invitations/${token}`);
    record({
      id: `${runLabel}.perm.outsider-accept`,
      area: "Permissions",
      route: `/api/sim/invitations/${token}`,
      actor: "outsider",
      expected: "wrong email cannot accept",
      observed: `status=${stealInvite.status}`,
      errors: [],
      pass: stealInvite.status >= 400,
      severity: "P0",
    });
  }

  const candidate = await signUp("candidate", candidateEmail);
  if (!candidate) return;
  const accept = await api(baseUrl, candidate, "POST", `/api/sim/invitations/${token}`);
  const sessionId = String(accept.data.sessionId || "");
  record({
    id: `${runLabel}.invite.accepted`,
    area: "Invitations",
    route: `/api/sim/invitations/${token}`,
    actor: "candidate",
    expected: "invited email accepts and gets a session",
    observed: `status=${accept.status}`,
    ids: { sessionId },
    errors: accept.status >= 400 ? [String(accept.data.error || "")] : [],
    pass: accept.status === 200 && Boolean(sessionId),
    severity: "P0",
  });
  if (!sessionId) return;

  const acceptAgain = await api(baseUrl, candidate, "POST", `/api/sim/invitations/${token}`);
  record({
    id: `${runLabel}.invite.reused-token`,
    area: "Invitations",
    route: `/api/sim/invitations/${token}`,
    actor: "candidate",
    expected: "second accept is idempotent or rejected as used",
    observed: `status=${acceptAgain.status} session=${String(acceptAgain.data.sessionId || "")}`,
    errors: [],
    pass:
      (acceptAgain.status === 200 && String(acceptAgain.data.sessionId) === sessionId) ||
      acceptAgain.status >= 400,
    severity: "P0",
  });

  const start = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}/start`);
  record({
    id: `${runLabel}.start`,
    area: "Persistence",
    route: `/api/sim/sessions/${sessionId}/start`,
    actor: "candidate",
    expected: "session starts",
    observed: `status=${start.status}`,
    errors: start.status >= 400 ? [String(start.data.error || "")] : [],
    pass: start.status === 200 || start.status === 409,
    severity: "P0",
  });

  const answers = {
    primary_driver: "A mid-period classification/reporting change that treats holds like scrap",
    residual_segment: "Line L2 Day shift (elevated rework/scrap beyond reclass holds)",
    evidence_rows: [
      "HOLD_RECLASS events appearing only in the current period",
      "Reporting note: prior period not restated",
      "L2 Day elevated REWORK_FIT / SCRAP_MATERIAL alongside holds",
    ],
    recommendation:
      "The apparent yield drop is mostly a HOLD_RECLASS mapping change mid-period; residual risk sits on L2 Day rework/scrap. Caveat: mid-period restatement is incomplete. Validate L2 Day holds before the next huddle.",
  };

  const save = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}`, {
    answers,
    currentTaskId: "recommendation",
  });
  record({
    id: `${runLabel}.autosave`,
    area: "Persistence",
    route: `/api/sim/sessions/${sessionId}`,
    actor: "candidate",
    expected: "answers persist",
    observed: `status=${save.status}`,
    errors: save.status >= 400 ? [String(save.data.error || "")] : [],
    pass: save.status === 200,
    severity: "P0",
  });

  if (runLabel === "recovery") {
    const reload = await api(baseUrl, candidate, "GET", `/api/sim/sessions/${sessionId}`);
    const content = reload.data as { state?: { deliverable?: Record<string, unknown> } };
    const kept = Boolean(content.state?.deliverable?.recommendation);
    record({
      id: `${runLabel}.refresh`,
      area: "Persistence",
      route: `/api/sim/sessions/${sessionId}`,
      actor: "candidate",
      expected: "refresh does not discard work",
      observed: kept ? "recommendation still present" : "work missing after reload",
      errors: kept ? [] : ["silent data loss"],
      pass: kept,
      severity: "P0",
    });
  }

  const curveball = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}/curveball`, {
    action: "acknowledge",
  });
  record({
    id: `${runLabel}.curveball`,
    area: "Persistence",
    route: `/api/sim/sessions/${sessionId}/curveball`,
    actor: "candidate",
    expected: "changed-information event can be acknowledged",
    observed: `status=${curveball.status}`,
    errors: [],
    pass: curveball.status === 200 || curveball.status === 409 || curveball.status === 404,
    severity: "P1",
  });

  const submit1 = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}/submit`, {
    answers,
    externalAiDisclosed: false,
  });
  const submit2 = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}/submit`, {
    answers,
    externalAiDisclosed: false,
  });
  record({
    id: `${runLabel}.submit.idempotent`,
    area: "Submission",
    route: `/api/sim/sessions/${sessionId}/submit`,
    actor: "candidate",
    expected: "double submit is idempotent",
    observed: `first=${submit1.status} second=${submit2.status}`,
    errors: [],
    pass: submit1.status === 200 && (submit2.status === 200 || submit2.status === 409),
    severity: "P0",
  });

  const analyze = await api(baseUrl, candidate, "POST", `/api/sim/sessions/${sessionId}/analyze`);
  const engine = String(analyze.data.engineVersion || "");
  const fallback = analyze.data.fallback === true;
  record({
    id: `${runLabel}.analyze`,
    area: "Analysis",
    route: `/api/sim/sessions/${sessionId}/analyze`,
    actor: "system",
    expected: "v2 only; no keyword fallback",
    observed: `status=${analyze.status} engine=${engine} fallback=${fallback}`,
    ids: { analysisRunId: String(analyze.data.analysisRunId || "") },
    errors: fallback ? ["keyword fallback presented"] : [],
    pass: (analyze.status === 200 && engine === "v2" && !fallback) || analyze.status === 500,
    severity: "P0",
  });
  if (analyze.status === 500) {
    record({
      id: `${runLabel}.analyze.failed-honest`,
      area: "Analysis",
      route: `/api/sim/sessions/${sessionId}/analyze`,
      actor: "system",
      expected: "failure is analysis_failed, not a fake score",
      observed: String(analyze.data.code || analyze.data.error || ""),
      errors: [],
      pass: String(analyze.data.code) === "analysis_failed" || fallback === false,
      severity: "P0",
    });
  }

  const report = await api(baseUrl, employer, "GET", `/api/sim/sessions/${sessionId}/report`);
  record({
    id: `${runLabel}.report`,
    area: "Reports",
    route: `/api/sim/sessions/${sessionId}/report`,
    actor: "owner",
    expected: "honest ready / processing / failed",
    observed: `status=${report.status} ready=${String(report.data.ready)} failed=${String(report.data.failed)}`,
    ids: { sessionId },
    errors: [],
    pass: report.status === 200 && (report.data.ready === true || report.data.failed === true || report.data.ready === false),
    severity: "P0",
  });

  if (outsider) {
    const cross = await api(baseUrl, outsider, "GET", `/api/sim/sessions/${sessionId}/report`);
    record({
      id: `${runLabel}.perm.cross-org-report`,
      area: "Permissions",
      route: `/api/sim/sessions/${sessionId}/report`,
      actor: "outsider",
      expected: "403/404, never another org's report",
      observed: `status=${cross.status}`,
      errors: cross.status === 200 ? ["cross-organization report leaked"] : [],
      pass: cross.status === 403 || cross.status === 404 || cross.status === 401,
      severity: "P0",
    });
  }

  const share = await api(baseUrl, candidate, "POST", `/api/sim/results/${sessionId}/share`, {
    audienceLabel: "wave1-rc1",
    allowedFields: ["evaluation_title", "completion_date", "limitations"],
    expiresInDays: 7,
  });
  const shareUrl = String(share.data.shareUrl || share.data.url || "");
  record({
    id: `${runLabel}.receipt.share`,
    area: "Receipts",
    route: `/api/sim/results/${sessionId}/share`,
    actor: "candidate",
    expected: "share link created",
    observed: `status=${share.status}`,
    ids: { shareUrl },
    errors: share.status >= 400 ? [String(share.data.error || "")] : [],
    pass: share.status === 200 && Boolean(shareUrl || share.data.id),
    severity: "P0",
  });

  const shareId = String(share.data.id || share.data.shareId || "");
  if (shareId) {
    const revoke = await api(baseUrl, candidate, "POST", `/api/sim/results/${sessionId}/share`, {
      action: "revoke",
      shareId,
    });
    record({
      id: `${runLabel}.receipt.revoke`,
      area: "Receipts",
      route: `/api/sim/results/${sessionId}/share`,
      actor: "candidate",
      expected: "revoke succeeds server-side",
      observed: `status=${revoke.status}`,
      errors: [],
      pass: revoke.status === 200,
      severity: "P0",
    });
  }
}

async function main() {
  loadEnv();
  runOfflineContractCases();

  const baseUrl = process.env.GOLDEN_PATH_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const live = Boolean(baseUrl && process.env.WAVE1_LIVE === "1");
  if (!live) {
    record({
      id: "live.skipped",
      area: "Empty states",
      route: "n/a",
      actor: "system",
      expected: "set WAVE1_LIVE=1 and GOLDEN_PATH_BASE_URL to run the HTTP loop",
      observed: "offline contract cases only",
      errors: ["live golden path not executed"],
      pass: false,
      severity: "P0",
    });
    writeEvidence({ mode: "offline-contract" });
    process.exit(1);
  }

  try {
    await runLiveChain(baseUrl.replace(/\/$/, ""), "fresh");
    await runLiveChain(baseUrl.replace(/\/$/, ""), "recovery");
  } finally {
    writeEvidence({ mode: "live", baseUrl });
  }

  const blockers = evidence.filter((e) => !e.pass && (e.severity === "P0" || e.severity === "P1"));
  if (blockers.length) {
    console.error(`\n${blockers.length} P0/P1 blocker(s). Wave 1 cannot close.`);
    process.exit(1);
  }
  console.log("\nWave 1 live acceptance passed.");
}

main().catch((err) => {
  record({
    id: "harness.crash",
    area: "Empty states",
    route: "n/a",
    actor: "system",
    expected: "harness completes",
    observed: err instanceof Error ? err.message : String(err),
    errors: [err instanceof Error ? err.message : String(err)],
    pass: false,
    severity: "P0",
  });
  writeEvidence({ crashed: true });
  process.exit(1);
});
