import { createClient } from "@supabase/supabase-js";

// End-to-end check of the developer passport and employer review flow against
// a running dev server backed by the dev Supabase project. Creates throwaway
// accounts on example.com addresses; never run against production.
process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { persistSession: false },
});
const createdUsers: string[] = [];
const createdOrgNames: string[] = [];
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const REPO = process.env.E2E_REPO ?? "fastapi/full-stack-fastapi-template";

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

async function signup(s: Session, path: "fde" | "employer", tag: string) {
  const email = `fydell-e2e-${tag}-${Date.now()}@fydell.dev`;
  const password = "e2e-Passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `E2E ${tag}` } });
  if (error || !data.user) return { status: 500, body: { error: error?.message ?? "createUser failed" } as { redirectTo?: string; error?: string } };
  createdUsers.push(data.user.id);
  const login = await s.fetch("/api/platform/login", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!login.ok) return { status: login.status, body: { error: await login.text() } as { redirectTo?: string; error?: string } };
  const companyName = `E2E ${tag} ${Date.now()}`;
  if (path === "employer") createdOrgNames.push(companyName);
  return s.json<{ redirectTo?: string; error?: string }>("/api/auth/role", {
    method: "POST",
    body: JSON.stringify(path === "employer" ? { role: "employer", companyName } : { role: "fde" }),
  });
}

async function cleanup() {
  for (const name of createdOrgNames) await admin.from("organizations").delete().eq("name", name);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}

async function main() {
  console.log(`\nPassport flow against ${BASE}`);

  const anon = new Session();
  const anonSave = await anon.json("/api/passport/projects", { method: "POST", body: JSON.stringify({ repository: REPO }) });
  ok("saving requires sign-in", anonSave.status === 401);

  const dev = new Session();
  const devSignup = await signup(dev, "fde", "dev");
  ok("developer account created without a workspace", devSignup.status === 200, JSON.stringify(devSignup.body));

  const saved = await dev.json<{ passport?: { projects: Array<{ evidence: unknown[] }>; capabilities: { source: string; capabilities: unknown[] } }; error?: string }>(
    "/api/passport/projects",
    { method: "POST", body: JSON.stringify({ repository: REPO, contribution: "E2E: I built the backend routes.", githubLogin: REPO.split("/")[0] }) },
  );
  const evidenceCount = saved.body.passport?.projects.reduce((n, p) => n + p.evidence.length, 0) ?? 0;
  ok("repository analyzed and saved with evidence", saved.status === 200 && evidenceCount > 0, `${saved.status} ${saved.body.error ?? ""}`);
  ok("capability summary produced with provenance", Boolean(saved.body.passport?.capabilities.source) && (saved.body.passport?.capabilities.capabilities.length ?? 0) > 0);

  const again = await dev.json<{ passport?: { projects: unknown[] } }>("/api/passport/projects", { method: "POST", body: JSON.stringify({ repository: REPO }) });
  ok("re-importing the same commit does not duplicate the project", again.body.passport?.projects.length === 1);

  const share = await dev.json<{ url?: string; shares?: Array<{ id: string }> }>("/api/passport/shares", {
    method: "POST",
    body: JSON.stringify({ label: "E2E employer", fields: ["projects", "evidence", "roles"] }),
  });
  ok("share link created", share.status === 200 && Boolean(share.body.url));
  const token = share.body.url?.split("/p/")[1] ?? "";
  const shareId = share.body.shares?.[0]?.id ?? "";

  const publicPage = await anon.fetch(`/p/${token}`);
  const publicHtml = await publicPage.text();
  ok("shared passport renders publicly", publicPage.status === 200 && publicHtml.includes("Engineering Passport") && publicHtml.includes(REPO));
  ok("capabilities were excluded because the share did not allow them", !publicHtml.includes("Demonstrated in code"));
  ok("contribution statement stays with shared projects", publicHtml.includes("I built the backend routes"));

  const employer = new Session();
  const empSignup = await signup(employer, "employer", "emp");
  ok("employer signup creates a workspace", empSignup.status === 200 && empSignup.body.redirectTo === "/app/employer", JSON.stringify(empSignup.body));
  const added = await employer.json<{ id?: string; error?: string }>("/api/employer/passport-reviews", {
    method: "POST",
    body: JSON.stringify({ shareUrl: share.body.url, roleTitle: "Backend Engineer" }),
  });
  ok("employer adds the shared passport", added.status === 200 && Boolean(added.body.id), added.body.error);
  const decided = await employer.json<{ ok?: boolean }>(`/api/employer/passport-reviews/${added.body.id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: "advance", note: "E2E: ask about retries." }),
  });
  ok("employer records a decision with a private note", decided.status === 200 && decided.body.ok === true);
  const reviewPage = await (await employer.fetch(`/app/employer/passports/${added.body.id}`)).text();
  ok("review page shows the passport and the saved note", reviewPage.includes(REPO) && reviewPage.includes("ask about retries"));

  const outsider = new Session();
  await signup(outsider, "employer", "other");
  const crossPatch = await outsider.json(`/api/employer/passport-reviews/${added.body.id}`, {
    method: "PATCH",
    body: JSON.stringify({ decision: "decline", note: "should not apply" }),
  });
  ok("another workspace cannot change this review", crossPatch.status === 404);
  const crossList = await outsider.json<{ reviews?: unknown[] }>("/api/employer/passport-reviews");
  ok("another workspace cannot list this review", crossList.status === 200 && (crossList.body.reviews?.length ?? -1) === 0);
  const crossHtml = await (await outsider.fetch(`/app/employer/passports/${added.body.id}`)).text();
  ok("another workspace cannot open this review page", !crossHtml.includes(REPO) && !crossHtml.includes("ask about retries"));

  const devPublicAfterNote = await anon.fetch(`/p/${token}`);
  ok("employer notes never appear in the shared passport", !(await devPublicAfterNote.text()).includes("ask about retries"));

  const revoke = await dev.json(`/api/passport/shares/${shareId}`, { method: "DELETE" });
  ok("developer revokes the link", revoke.status === 200);
  const revokedHtml = await (await anon.fetch(`/p/${token}`)).text();
  ok("revoked link stops working", revokedHtml.includes("This link was revoked") && !revokedHtml.includes(REPO));
  const reviewAfterRevoke = await (await employer.fetch(`/app/employer/passports/${added.body.id}`)).text();
  ok("employer loses access to the evidence after revocation", reviewAfterRevoke.includes("revoked this link") && !reviewAfterRevoke.includes(`${REPO} ·`));

  const reAdd = await employer.json("/api/employer/passport-reviews", { method: "POST", body: JSON.stringify({ shareUrl: share.body.url }) });
  ok("a revoked link cannot be added again", reAdd.status === 404);

  await cleanup();
  if (failures) {
    console.log(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nPassport flow passed; test accounts removed");
}

main().catch(async (err) => {
  console.error(err);
  await cleanup();
  process.exit(1);
});
