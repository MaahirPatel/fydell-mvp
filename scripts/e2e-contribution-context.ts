import { createClient } from "@supabase/supabase-js";

// Live check for contribution statements and decision records against a
// running dev server and the dev Supabase project. Never run against production.
process.loadEnvFile(".env.local");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
if (!SUPABASE_URL.includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run: this test only runs against the dev Supabase project.");
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const REPO = process.env.E2E_REPO ?? "sindresorhus/is-plain-obj";
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

type Contribution = { version: number; workedOn: string; evidenceRefs: unknown[] };
type Decision = { id: string; version: number; title: string; withdrawnAt: string | null };
type Job = { id: string; state: string; result: { projectId: string } | null; error: string | null; needsWorker: boolean };

async function signupEngineer(s: Session, tag: string): Promise<string> {
  const email = `fydell-e2e-context-${tag}-${Date.now()}@fydell.dev`;
  const password = "e2e-Passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  createdUsers.push(data.user.id);
  await s.fetch("/api/platform/login", { method: "POST", body: JSON.stringify({ email, password }) });
  await s.json("/api/auth/role", { method: "POST", body: JSON.stringify({ role: "fde" }) });
  return data.user.id;
}

async function importRepo(s: Session): Promise<string> {
  const preview = await s.json<{ preview?: { commitSha: string; revisionRef: string } }>("/api/passport/github", {
    method: "POST",
    body: JSON.stringify({ input: REPO, preview: true }),
  });
  if (!preview.body.preview) throw new Error("preview failed");
  const started = await s.json<{ job?: Job }>("/api/passport/imports", {
    method: "POST",
    body: JSON.stringify({ repository: REPO, commitSha: preview.body.preview.commitSha, revisionRef: preview.body.preview.revisionRef }),
  });
  const id = started.body.job?.id;
  if (!id) throw new Error("import did not start");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const job = (await s.json<{ job?: Job }>(`/api/passport/imports/${id}`)).body.job;
    if (job?.state === "succeeded" && job.result) return job.result.projectId;
    if (job?.state === "failed") throw new Error(`import failed: ${job.error}`);
    if (job?.needsWorker) await s.fetch(`/api/passport/imports/${id}`, { method: "POST", body: JSON.stringify({ action: "resume" }) });
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("import timed out");
}

async function main() {
  console.log(`\nContribution context against ${BASE}`);
  const dev = new Session();
  await signupEngineer(dev, "owner");
  const projectId = await importRepo(dev);
  const { data: evidence } = await admin.from("passport_evidence").select("id,path,start_line,end_line").eq("project_id", projectId).limit(1);
  const finding = (evidence ?? [])[0] as { id: string; path: string; start_line: number; end_line: number } | undefined;
  ok("imported project has a finding to link", Boolean(finding));
  const ref = finding ? { projectId, findingId: finding.id, path: finding.path, startLine: finding.start_line, endLine: finding.end_line } : null;

  // Contribution statement with optimistic concurrency.
  const empty = await dev.json<{ contribution: Contribution; decisions: Decision[] }>(`/api/passport/context?projectId=${projectId}`);
  ok("a new project starts with no statement", empty.status === 200 && empty.body.contribution.version === 0 && empty.body.decisions.length === 0);
  const put = (expectedVersion: number, workedOn: string, refs: unknown[] = ref ? [ref] : []) =>
    dev.json<{ contribution?: Contribution; current?: Contribution; error?: string }>("/api/passport/context", {
      method: "PUT",
      body: JSON.stringify({ projectId, expectedVersion, contribution: { workedOn, collaboration: "solo", evidenceRefs: refs } }),
    });
  const first = await put(0, "Wrote the type guard.");
  ok("first save creates version 1 with its evidence link", first.status === 200 && first.body.contribution?.version === 1 && first.body.contribution.evidenceRefs.length === (ref ? 1 : 0), JSON.stringify(first.body));
  const stale = await put(0, "An edit from an older tab.");
  ok("a stale edit is refused, not silently overwritten", stale.status === 409 && stale.body.current?.workedOn === "Wrote the type guard.");
  const second = await put(1, "Wrote the type guard and its tests.");
  ok("an edit on the current version saves as version 2", second.status === 200 && second.body.contribution?.version === 2);

  // Evidence links must point into this project.
  if (ref) {
    const forged = await put(2, "x", [{ ...ref, path: "somewhere/else.ts" }]);
    ok("a link whose finding does not match its file is rejected", forged.status === 400);
  }
  const foreign = await put(2, "x", [{ projectId: "00000000-0000-4000-8000-000000000000", path: "a.ts" }]);
  ok("a link to a project outside this record is rejected", foreign.status === 400);

  // Decisions.
  const incomplete = await dev.json("/api/passport/context", { method: "POST", body: JSON.stringify({ projectId, decision: { title: "Only a title" } }) });
  ok("a decision without a problem and choice is rejected", incomplete.status === 400);
  const created = await dev.json<{ decision?: Decision }>("/api/passport/context", {
    method: "POST",
    body: JSON.stringify({ projectId, decision: { title: "Use a prototype check", problem: "Objects from other realms", choice: "Compare prototypes", tradeoffs: "Slower than typeof", evidenceRefs: ref ? [ref] : [] } }),
  });
  const decision = created.body.decision;
  ok("a complete decision is recorded", created.status === 201 && decision?.version === 1);
  if (decision) {
    const edit = (expectedVersion: number) =>
      dev.json<{ decision?: Decision }>("/api/passport/context", {
        method: "PATCH",
        body: JSON.stringify({ decisionId: decision.id, expectedVersion, decision: { title: "Use a prototype check", problem: "Objects from other realms", choice: "Compare prototypes, then fall back" } }),
      });
    ok("editing the current decision saves version 2", (await edit(1)).body.decision?.version === 2);
    ok("a stale decision edit is refused", (await edit(1)).status === 409);

    // Another engineer.
    const outsider = new Session();
    await signupEngineer(outsider, "outsider");
    ok("another engineer cannot read this project's context", (await outsider.json(`/api/passport/context?projectId=${projectId}`)).status === 404);
    const theirEdit = await outsider.json("/api/passport/context", { method: "PATCH", body: JSON.stringify({ decisionId: decision.id, action: "withdraw" }) });
    ok("another engineer cannot withdraw this decision", theirEdit.status === 404);
    const theirPut = await outsider.json("/api/passport/context", { method: "PUT", body: JSON.stringify({ projectId, expectedVersion: 2, contribution: { workedOn: "Mine now" } }) });
    ok("another engineer cannot write this statement", theirPut.status === 404);

    const csrf = await dev.json("/api/passport/context", { method: "PUT", headers: { Origin: "https://evil.example" }, body: JSON.stringify({ projectId, expectedVersion: 2, contribution: { workedOn: "x" } }) });
    ok("a cross-site write is blocked", csrf.status === 403);

    const withdrawn = await dev.json("/api/passport/context", { method: "PATCH", body: JSON.stringify({ decisionId: decision.id, action: "withdraw" }) });
    ok("the engineer can withdraw a decision", withdrawn.status === 200);
    const again = await dev.json("/api/passport/context", { method: "PATCH", body: JSON.stringify({ decisionId: decision.id, action: "withdraw" }) });
    ok("withdrawing twice changes nothing", again.status === 404);
    ok("a withdrawn decision can no longer be edited", (await edit(2)).status === 409);
  }

  const after = await dev.json<{ contribution: Contribution; decisions: Decision[] }>(`/api/passport/context?projectId=${projectId}`);
  ok("the statement survives as last saved", after.body.contribution.workedOn === "Wrote the type guard and its tests." && after.body.contribution.version === 2);
  ok("the withdrawn decision is kept with its time", after.body.decisions.length === 1 && Boolean(after.body.decisions[0].withdrawnAt));
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
    console.log("\nContribution context passed; test accounts removed");
  });
