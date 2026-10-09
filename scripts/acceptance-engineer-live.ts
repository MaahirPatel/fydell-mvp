/**
 * Live acceptance for the engineer journey against the DEV Supabase project
 * and the running dev server. Synthetic users only; everything they create
 * is deleted at the end.
 *
 *   - saving the same analyzed snapshot twice keeps one project
 *   - receipts are idempotent (retry after a lost response, concurrent issue)
 *   - receipts are owner-only (database RLS and HTTP), immutable, exportable
 *   - a Builder Analysis run is versioned, immutable once finished, receipted
 *   - a failed reanalysis keeps the previous report current
 *   - a later run records what it supersedes and compares to the earlier one
 *   - a share link shows the profile to an anonymous visitor, without owner
 *     controls, and stops working when revoked
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/acceptance-engineer-live.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { createClient } from "@supabase/supabase-js";
import { analyzeUpload } from "../src/lib/passport/upload";
import { createShare, revokeShare, saveProjectVersion } from "../src/lib/passport/store";
import { issueSnapshotReceipt, getReceiptView, listReceipts } from "../src/lib/receipts/store";
import { receiptExport } from "../src/lib/receipts/contract";
import { beginAnalysis, failAnalysis, getAnalysis, latestCompleteReport, listAnalysisVersions } from "../src/lib/builder-analysis/store";
import { runAnalysis } from "../src/lib/builder-analysis/run";
import { compareVersions } from "../src/lib/builder-analysis/ledger";
import { confirmContribution, publishEvidenceVersion } from "../src/lib/profile-evidence/store";
import { saveContribution } from "../src/lib/passport/context-store";
import { parseContribution } from "../src/lib/passport/context-contract";
import type { BuilderAnalysisReport } from "../src/lib/builder-analysis/types";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!URL_.includes(DEV_REF)) throw new Error("Refusing to run: this script only runs against the dev Supabase project.");
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), ".scratch", "acceptance", "engineer");
const PASSWORD = `Acc-${Math.random().toString(36).slice(2)}-Pw1!`;

let failures = 0;
const results: Array<{ check: string; ok: boolean; detail?: string }> = [];
function ok(check: string, condition: boolean, detail = "") {
  results.push({ check, ok: condition, detail: condition ? undefined : detail });
  console.log(`${condition ? "ok  " : "FAIL"} ${check}${!condition && detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

class Session {
  private cookies = new Map<string, string>();
  async fetch(p: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE}${p}`, {
      ...init,
      redirect: "manual",
      headers: { "Content-Type": "application/json", Origin: BASE, ...(init.headers ?? {}), Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  }
}

const created: string[] = [];
async function makeUser(tag: string): Promise<{ id: string; email: string }> {
  const email = `delivered+fydell-eng-${tag}-${Date.now()}@resend.dev`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  created.push(data.user.id);
  return { id: data.user.id, email };
}

async function login(email: string): Promise<Session> {
  const s = new Session();
  const res = await s.fetch("/api/platform/login", { method: "POST", body: JSON.stringify({ email, password: PASSWORD }) });
  if (res.status >= 400) throw new Error(`login failed: ${res.status}`);
  await s.fetch("/api/auth/role", { method: "POST", body: JSON.stringify({ role: "fde" }) });
  return s;
}

function project(name: string, extra: Record<string, string> = {}): Uint8Array {
  return zipSync({
    "package.json": strToU8(JSON.stringify({ name, scripts: { test: "vitest run" }, devDependencies: { vitest: "^2.0.0", typescript: "^5.5.0" } })),
    "tsconfig.json": strToU8(JSON.stringify({ compilerOptions: { strict: true } })),
    "README.md": strToU8(`# ${name}\n\nSynthetic acceptance project.\n`),
    "src/client.ts": strToU8(
      [
        "export async function fetchJob(url: string): Promise<unknown> {",
        "  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });",
        "  if (!res.ok) throw new Error(`job fetch failed: ${res.status}`);",
        "  return res.json();",
        "}",
        "",
      ].join("\n"),
    ),
    "src/client.test.ts": strToU8(
      [
        "import { describe, it, expect, vi } from 'vitest';",
        "import { fetchJob } from './client';",
        "describe('fetchJob', () => {",
        "  it('throws when the server fails', async () => {",
        "    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));",
        "    await expect(fetchJob('http://x')).rejects.toThrow('job fetch failed');",
        "  });",
        "});",
        "",
      ].join("\n"),
    ),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, strToU8(v)])),
  });
}

function comparable(r: BuilderAnalysisReport) {
  return {
    inputHash: r.run?.inputHash ?? null,
    input: r.run?.input ?? null,
    dimensions: r.dimensions.map((d) => ({ id: d.id, label: d.label, level: d.level })),
    ledgerIds: (r.ledger ?? []).map((e) => e.id),
  };
}

async function save(ownerId: string, name: string, zip: Uint8Array, contribution: string) {
  const a = analyzeUpload(zip, { ownerId, name });
  if (a.ok === false) throw new Error(`analyzeUpload failed: ${a.error.message}`);
  const saved = await saveProjectVersion({ id: ownerId, displayName: "Acceptance Engineer" }, null, a.result, contribution);
  return { saved, repo: a.result.repository?.fullName ?? "" };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const a = await makeUser("a");
  const b = await makeUser("b");
  console.log(`dev project ${DEV_REF}; synthetic users created`);

  /* Snapshot and receipt idempotency */
  const first = await save(a.id, "job-runner", project("job-runner"), "I wrote the client and its failure test.");
  const again = await save(a.id, "job-runner", project("job-runner"), "I wrote the client and its failure test.");
  ok("saving the same analyzed upload twice keeps one project snapshot", first.saved.projectId === again.saved.projectId && again.saved.reusedExistingVersion);

  const r1 = await issueSnapshotReceipt(a.id, first.saved.projectId, null);
  const r2 = await issueSnapshotReceipt(a.id, first.saved.projectId, null);
  const [r3, r4] = await Promise.all([issueSnapshotReceipt(a.id, first.saved.projectId, null), issueSnapshotReceipt(a.id, first.saved.projectId, null)]);
  ok("a retried or concurrent receipt request returns the same receipt", new Set([r1.id, r2.id, r3.id, r4.id]).size === 1);
  const { count } = await admin.from("engineer_work_receipts").select("id", { count: "exact", head: true }).eq("owner_id", a.id).eq("snapshot_id", first.saved.projectId);
  ok("exactly one receipt row exists for the snapshot", count === 1, `count=${count}`);
  ok("receipt records revision, analysis version, content hash and server acceptance time", !!r1.sourceRevision && !!r1.analysisVersion && /^[0-9a-f]{64}$/.test(r1.contentHash) && !!r1.acceptedAt);
  ok("receipt scope says tests were not executed and authorship was not assessed",
    r1.verificationScope.some((x) => x.facet === "tests_executed" && x.state === "not_assessed") &&
    r1.verificationScope.some((x) => x.facet === "attribution_supported" && x.state === "not_assessed"));

  /* Immutability */
  const upd = await admin.from("engineer_work_receipts").update({ content_hash: "0".repeat(64) }).eq("id", r1.id).select("id");
  ok("the database refuses to change a receipt", !!upd.error && /immutable/.test(upd.error.message), upd.error?.message ?? "update succeeded");

  /* Owner-only: database RLS */
  const asUser = async (email: string) => {
    const c = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`sign in failed: ${error.message}`);
    return c;
  };
  const ca = await asUser(a.email);
  const cb = await asUser(b.email);
  const own = await ca.from("engineer_work_receipts").select("id").eq("id", r1.id);
  const other = await cb.from("engineer_work_receipts").select("id").eq("id", r1.id);
  const byHash = await cb.from("engineer_work_receipts").select("id").eq("content_hash", r1.contentHash);
  const anon = await createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false } }).from("engineer_work_receipts").select("id").eq("id", r1.id);
  ok("RLS: the owner can read their receipt", (own.data ?? []).length === 1, own.error?.message);
  ok("RLS: another user cannot read it by id or by content hash", (other.data ?? []).length === 0 && (byHash.data ?? []).length === 0);
  ok("RLS: an anonymous client cannot read receipts", (anon.data ?? []).length === 0);
  const write = await ca.from("engineer_work_receipts").insert({ owner_id: a.id, idempotency_key: "forged-key-123", artifact_type: "upload_snapshot", content_hash: "1".repeat(64) });
  ok("RLS: an engineer cannot write receipts directly", !!write.error);

  /* Owner-only: HTTP */
  let http = "skipped";
  try {
    const sa = await login(a.email);
    const sb = await login(b.email);
    const mine = await sa.fetch(`/api/passport/receipts/${r1.id}`);
    const mineBody = (await mine.json()) as { receipt?: { id: string }; snapshotDate?: string; timeStatement?: string };
    const theirs = await sb.fetch(`/api/passport/receipts/${r1.id}`);
    const nobody = await new Session().fetch(`/api/passport/receipts/${r1.id}`);
    const dl = await sa.fetch(`/api/passport/receipts/${r1.id}?download=1`);
    ok("HTTP: the owner gets the receipt export with snapshot date and time statement", mine.status === 200 && mineBody.receipt?.id === r1.id && !!mineBody.snapshotDate && !!mineBody.timeStatement, `status=${mine.status}`);
    ok("HTTP: export is private and not cached", /private/.test(mine.headers.get("cache-control") ?? "") && /no-store/.test(mine.headers.get("cache-control") ?? ""));
    ok("HTTP: download is an attachment", /attachment/.test(dl.headers.get("content-disposition") ?? ""));
    ok("HTTP: another engineer gets 404, not the receipt", theirs.status === 404, `status=${theirs.status}`);
    ok("HTTP: a signed-out visitor cannot read it", nobody.status === 401 || nobody.status === 404 || (nobody.status >= 300 && nobody.status < 400), `status=${nobody.status}`);
    const page = await sa.fetch(`/app/candidate/receipts/${r1.id}`);
    const otherPage = await sb.fetch(`/app/candidate/receipts/${r1.id}`);
    const otherHtml = await otherPage.text();
    ok("HTTP: the owner's receipt page renders", page.status === 200, `status=${page.status}`);
    ok("HTTP: another engineer's receipt page does not show it", !otherHtml.includes(r1.contentHash), `status=${otherPage.status}`);
    http = "ran";
  } catch (error) {
    ok("HTTP checks against the dev server", false, error instanceof Error ? error.message : String(error));
  }

  /* Builder Analysis: run, immutability, failed reanalysis, supersession, comparison */
  const start1 = await beginAnalysis(a.id, { sourcesChanged: true });
  if (!start1.started) throw new Error("first analysis did not start");
  await runAnalysis(start1.id, a.id, start1.supersedes);
  const run1 = await getAnalysis(a.id, start1.id);
  ok("first analysis completes with a report hash, input hash and config", run1?.status === "complete" && !!run1.reportHash && !!run1.report?.run?.inputHash, `status=${run1?.status} error=${run1?.error}`);
  const narrativeSource = run1?.report?.narrative.source ?? "none";
  const analysisReceipts = (await listReceipts(a.id)).filter((r) => r.artifactType === "builder_analysis_report" && r.analysisId === start1.id);
  ok("the finished report has exactly one receipt", analysisReceipts.length === 1);
  const freeze = await admin.from("builder_analyses").update({ error: "tamper" }).eq("id", start1.id).select("id");
  ok("the database refuses to change a finished run", !!freeze.error && /immutable/.test(freeze.error.message), freeze.error?.message ?? "update succeeded");

  const start2 = await beginAnalysis(a.id, { sourcesChanged: true });
  if (!start2.started) throw new Error("second analysis did not start");
  await failAnalysis(start2.id, "Synthetic failure for acceptance.");
  const afterFail = await latestCompleteReport(a.id);
  const versionsAfterFail = await listAnalysisVersions(a.id);
  ok("a failed reanalysis keeps the previous report current", afterFail?.run?.runId === start1.id && versionsAfterFail.find((v) => v.current)?.id === start1.id);
  ok("the failed run is listed, not hidden", versionsAfterFail.some((v) => v.id === start2.id && v.status === "failed"));
  ok("the failed run records which report it would have replaced", start2.supersedes === start1.id);

  const second = await save(a.id, "webhook-relay", project("webhook-relay", { "src/retry.ts": "export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {\n  for (let attempt = 0; attempt < 3; attempt++) {\n    try {\n      return await fn();\n    } catch (error) {\n      console.error('retry', attempt, error);\n      await new Promise((r) => setTimeout(r, 2 ** attempt * 100));\n    }\n  }\n  return fn();\n}\n" }), "");
  await issueSnapshotReceipt(a.id, second.saved.projectId, null);
  const start3 = await beginAnalysis(a.id, { sourcesChanged: true });
  if (!start3.started) throw new Error("third analysis did not start");
  await runAnalysis(start3.id, a.id, start3.supersedes);
  const run3 = await getAnalysis(a.id, start3.id);
  const reread = await getAnalysis(a.id, start1.id);
  ok("a later run records the report it supersedes", run3?.status === "complete" && run3.supersedesId === start1.id && run3.report?.run?.supersedes === start1.id, `status=${run3?.status} supersedes=${run3?.supersedesId}`);
  ok("the earlier report is unchanged when re-read", reread?.reportHash === run1?.reportHash && JSON.stringify(reread?.report) === JSON.stringify(run1?.report));
  const cmp = run1?.report && run3?.report ? compareVersions(comparable(run1.report), comparable(run3.report)) : null;
  ok("comparison shows the added project and different inputs", !!cmp && !cmp.sameInputs && cmp.projectsAdded.includes(second.repo), JSON.stringify(cmp));
  const snapView = await getReceiptView(a.id, r1.id);
  ok("the snapshot receipt links to the current report and still matches its hash", snapView?.processing.state === "current" && snapView.integrity.state === "matches" && !!snapView.linkedReport);
  const crossView = await getReceiptView(b.id, r1.id);
  ok("another user's view of the receipt resolves to nothing", crossView === null);

  /* Published evidence version receipt: add context, confirm, publish twice */
  const parsed = parseContribution({ workedOn: "I wrote the job client, its timeout and the failure-path test.", collaboration: "solo" });
  if ("error" in parsed) throw new Error(parsed.error);
  const context = await saveContribution(a.id, first.repo, parsed, 0);
  ok("the engineer's project context is saved", context.ok === true, JSON.stringify(context));
  const confirmed = await confirmContribution(a.id, first.repo);
  const pub1 = await publishEvidenceVersion(a.id, first.repo, "publish");
  const pub2 = await publishEvidenceVersion(a.id, first.repo, "publish");
  ok("publishing evidence issues a receipt, and republishing the same content reuses it",
    pub1.ok === true && pub2.ok === true && !!pub1.receiptId && pub1.receiptId === pub2.receiptId,
    `confirm=${JSON.stringify(confirmed)} pub1=${JSON.stringify(pub1.ok ? { receiptId: pub1.receiptId } : pub1)}`);

  /* Share link: anonymous visitor, then revoked */
  const share = await createShare(a.id, "Acceptance", ["projects", "evidence", "capabilities"]);
  if ("error" in share) {
    ok("create a share link", false, share.error);
  } else {
    const visitor = new Session();
    const open = await visitor.fetch(`/p/${share.token}`);
    const html = await open.text();
    ok("an anonymous visitor can open the shared profile", open.status === 200 && html.includes("job-runner"), `status=${open.status}`);
    const ownerOnly = ["Revoke", "Remove project", "Edit profile", "Run analysis", "/app/candidate/receipts", r1.contentHash, r1.id];
    const leaked = ownerOnly.filter((s) => html.includes(s));
    ok("the shared view shows no owner controls, receipt ids or hashes", leaked.length === 0, leaked.join(", "));
    const revoked = await revokeShare(a.id, share.id);
    const after = await new Session().fetch(`/p/${share.token}`);
    const afterHtml = await after.text();
    ok("after revocation the link stops showing the profile", revoked && afterHtml.includes("This link was revoked.") && !afterHtml.includes("job-runner"), `status=${after.status}`);
  }

  /* Evidence files */
  if (snapView) writeFileSync(path.join(OUT, "example-receipt-snapshot.json"), JSON.stringify(receiptExport({ ...snapView, ownerId: "synthetic-owner" }, new Date().toISOString()), null, 2));
  const anView = analysisReceipts[0] ? await getReceiptView(a.id, analysisReceipts[0].id) : null;
  if (anView) writeFileSync(path.join(OUT, "example-receipt-analysis.json"), JSON.stringify(receiptExport({ ...anView, ownerId: "synthetic-owner" }, new Date().toISOString()), null, 2));
  if (run3?.report) writeFileSync(path.join(OUT, "example-report-live.json"), JSON.stringify({ id: run3.id, status: run3.status, reportHash: run3.reportHash, supersedesId: run3.supersedesId, report: run3.report }, null, 2));
  writeFileSync(path.join(OUT, "live-summary.json"), JSON.stringify({ ranAt: new Date().toISOString(), devProject: DEV_REF, http, narrativeSource, comparison: cmp, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    failures += 1;
  })
  .finally(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined);
    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} live checks passed; synthetic users removed. Output: ${OUT}`);
    process.exit(failures ? 1 : 0);
  });
