import { createClient } from "@supabase/supabase-js";
import { ANALYSIS_VERSION } from "../src/lib/passport/github/types";

// Live recovery check for durable repository imports against a running dev
// server and the dev Supabase project. Simulates a worker that died mid-import
// and a cancelled import that is requested again. Never run against production.
process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { persistSession: false },
});
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const REPO_A = process.env.E2E_REPO ?? "sindresorhus/slugify";
const REPO_B = process.env.E2E_REPO_B ?? "sindresorhus/is-plain-obj";
const createdUsers: string[] = [];

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}${!condition && detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

class Session {
  private cookies = new Map<string, string>();
  async fetch(path: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      redirect: "manual",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return res;
  }
  async json<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
    const res = await this.fetch(path, init);
    return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
  }
}

type Job = { id: string; state: string; stage: string; attempts: number; error: string | null; result: { projectId: string } | null };

async function signupEngineer(s: Session): Promise<string> {
  const email = `fydell-e2e-recovery-${Date.now()}@fydell.dev`;
  const password = "e2e-Passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  createdUsers.push(data.user.id);
  await s.fetch("/api/platform/login", { method: "POST", body: JSON.stringify({ email, password }) });
  await s.json("/api/auth/role", { method: "POST", body: JSON.stringify({ role: "fde" }) });
  return data.user.id;
}

async function pin(s: Session, repo: string): Promise<{ commitSha: string; revisionRef: string }> {
  const r = await s.json<{ preview?: { commitSha: string; revisionRef: string }; error?: string }>("/api/passport/github", {
    method: "POST",
    body: JSON.stringify({ input: repo, preview: true }),
  });
  if (!r.body.preview) throw new Error(`preview failed for ${repo}: ${r.body.error}`);
  return r.body.preview;
}

async function waitFor(s: Session, id: string, done: (j: Job) => boolean, ms = 120_000): Promise<Job | undefined> {
  const deadline = Date.now() + ms;
  let job: Job | undefined;
  while (Date.now() < deadline) {
    job = (await s.json<{ job?: Job }>(`/api/passport/imports/${id}`)).body.job;
    if (job && done(job)) return job;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return job;
}

async function main() {
  console.log(`\nImport recovery against ${BASE}`);
  const dev = new Session();
  const userId = await signupEngineer(dev);

  // 1. A worker died mid-fetch: running, heartbeat well past the lease.
  const a = await pin(dev, REPO_A);
  const lostAt = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: lost, error: insertError } = await admin
    .from("durable_jobs")
    .insert({
      job_type: "passport_import",
      idempotency_key: `${userId}:${REPO_A.toLowerCase()}:${a.commitSha}:${ANALYSIS_VERSION}`,
      state: "running",
      payload: { repository: REPO_A, commitSha: a.commitSha, revisionRef: a.revisionRef, contribution: "", githubLogin: null, displayName: "Recovery" },
      attempt_count: 1,
      max_attempts: 4,
      owner_id: userId,
      stage: "fetching",
      progress: { filesFetched: 3, filesSelected: 10 },
      analysis_version: ANALYSIS_VERSION,
      locked_by: "crashed-worker",
      locked_at: lostAt,
      heartbeat_at: lostAt,
      started_at: lostAt,
    })
    .select("id")
    .single();
  ok("interrupted job seeded", !insertError && Boolean(lost), insertError?.message);
  const lostId = (lost as { id: string } | null)?.id ?? "";

  const before = (await dev.json<{ job?: Job & { needsWorker: boolean } }>(`/api/passport/imports/${lostId}`)).body.job;
  ok("status read reports the lost worker without acting on it", before?.needsWorker === true && before.state === "running" && before.attempts === 1);
  // Two resume requests at once: the atomic claim lets exactly one worker run it.
  const resume = () => dev.fetch(`/api/passport/imports/${lostId}`, { method: "POST", body: JSON.stringify({ action: "resume" }) });
  await Promise.all([resume(), resume()]);
  const recovered = await waitFor(dev, lostId, (j) => j.state === "succeeded" || j.state === "failed");
  ok("interrupted import is recovered and completes", recovered?.state === "succeeded", `${recovered?.state} ${recovered?.error ?? ""}`);
  ok("concurrent recovery claimed the job once", recovered?.attempts === 2, `attempts=${recovered?.attempts}`);

  const { data: passport } = await admin.from("passports").select("id").eq("owner_id", userId).maybeSingle();
  const passportId = (passport as { id: string } | null)?.id ?? "";
  const { data: snapsA } = await admin.from("passport_projects").select("id,job_id").eq("passport_id", passportId).eq("commit_sha", a.commitSha);
  ok("recovery produced exactly one snapshot", (snapsA ?? []).length === 1);
  ok("snapshot records the job that produced it", (snapsA?.[0] as { job_id: string | null } | undefined)?.job_id === lostId);

  const again = await dev.json<{ job?: Job; created?: boolean }>("/api/passport/imports", {
    method: "POST",
    body: JSON.stringify({ repository: REPO_A, commitSha: a.commitSha, revisionRef: a.revisionRef }),
  });
  ok("requesting the recovered revision again creates nothing new", again.body.created === false && again.body.job?.id === lostId);

  // 2. Cancel a queued import, then ask for the same revision again.
  const b = await pin(dev, REPO_B);
  const { data: queued } = await admin
    .from("durable_jobs")
    .insert({
      job_type: "passport_import",
      idempotency_key: `${userId}:${REPO_B.toLowerCase()}:${b.commitSha}:${ANALYSIS_VERSION}`,
      state: "queued",
      payload: { repository: REPO_B, commitSha: b.commitSha, revisionRef: b.revisionRef, contribution: "", githubLogin: null, displayName: "Recovery" },
      max_attempts: 4,
      owner_id: userId,
      stage: "queued",
      analysis_version: ANALYSIS_VERSION,
      next_attempt_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    .select("id")
    .single();
  const queuedId = (queued as { id: string } | null)?.id ?? "";
  const cancelled = await dev.json<{ job?: Job }>(`/api/passport/imports/${queuedId}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) });
  ok("queued import can be cancelled", cancelled.body.job?.state === "cancelled", cancelled.body.job?.state);
  const stillCancelled = (await dev.json<{ job?: Job }>(`/api/passport/imports/${queuedId}`)).body.job;
  ok("a cancelled import is not picked up by recovery", stillCancelled?.state === "cancelled");
  const { data: noSnap } = await admin.from("passport_projects").select("id").eq("passport_id", passportId).eq("commit_sha", b.commitSha);
  ok("cancelling saved nothing", (noSnap ?? []).length === 0);

  const restarted = await dev.json<{ job?: Job; created?: boolean }>("/api/passport/imports", {
    method: "POST",
    body: JSON.stringify({ repository: REPO_B, commitSha: b.commitSha, revisionRef: b.revisionRef }),
  });
  ok("requesting a cancelled revision again restarts the same job", restarted.body.created === true && restarted.body.job?.id === queuedId, JSON.stringify(restarted.body));
  const finished = await waitFor(dev, queuedId, (j) => j.state === "succeeded" || j.state === "failed");
  ok("restarted import completes", finished?.state === "succeeded", `${finished?.state} ${finished?.error ?? ""}`);

  const outsider = new Session();
  await signupEngineer(outsider);
  const theirCancel = await outsider.json(`/api/passport/imports/${queuedId}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) });
  ok("another engineer cannot cancel this import", theirCancel.status === 404);

  // 3. Hostile ids never reach the database.
  const bogus = await dev.json("/api/passport/imports/not-a-uuid");
  ok("malformed job ids are rejected", bogus.status === 404);
}

main()
  .catch((err) => {
    console.error(err);
    failures += 1;
  })
  .finally(async () => {
    for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
    if (failures) {
      console.log(`\n${failures} check(s) failed`);
      process.exit(1);
    }
    console.log("\nImport recovery passed; test accounts removed");
  });
