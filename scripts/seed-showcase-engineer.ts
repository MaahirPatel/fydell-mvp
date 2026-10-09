/**
 * Synthetic showcase engineer on the DEVELOPMENT project, built through the
 * real import pipeline (enqueueImport, runImportJob, extraction, contribution
 * signals, saveProjectVersion, capability report). No report rows are written
 * by hand.
 *
 *   $env:GROQ_MODEL="openai/gpt-oss-20b"
 *   npx tsx --conditions react-server --env-file=.env.local scripts/seed-showcase-engineer.ts [--walk]
 *
 * Repositories are served by a fixture GitHub transport: the same endpoints
 * the real client calls (repository, tree, raw files, commits for a path),
 * answered from files and a commit history kept in this script. Commit
 * attribution therefore comes from the pipeline's own contribution check
 * against the GitHub username on the engineer's profile. That username is
 * self-declared like every Fydell GitHub username (no OAuth token exists) and
 * its connected-account row is marked `synthetic: true`.
 *
 * Credentials: the account is `showcase <email>` in %TEMP%\fydell-walk.txt and
 * uses that file's `password` line. Neither is printed.
 *
 * `--walk` also re-imports the walk engineer's public GitHub projects
 * (p-retry, is-number) with the real client so they record commit signals.
 */
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GithubClient, type Fetcher } from "@/lib/passport/github/client";
import { enqueueImport, runImportJob } from "@/lib/passport/import-store";
import { setGithubLogin } from "@/lib/passport/store";
import { getContribution, saveContribution } from "@/lib/passport/context-store";
import { emptyContribution, type ContributionInput } from "@/lib/passport/context-contract";
import { ensureCapabilityReport } from "@/lib/passport/capability/store";
import { correct, deceptive, incomplete, missingEdgeCase, type Files } from "./acceptance-capability-differential";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const LOGIN = "fydell-showcase-maya";
const TEAMMATE = "sam-teammate";
const NAME = "Maya Okafor";
const EMAIL = "delivered+showcase-maya@resend.dev";

if (!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes(DEV_REF)) throw new Error("Refusing to run outside the development project.");

const walkPath = process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt");
function walkField(tag: string): string | null {
  const line = readFileSync(walkPath, "utf8").split(/\r?\n/).find((l) => l.trim().startsWith(`${tag} `));
  return line ? line.trim().split(/\s+/)[1] ?? null : null;
}

// ---- fixture repositories ----------------------------------------------------

type Commit = { author: string; message: string; date: string; paths: string[] };
type Fixture = { owner: string; repo: string; fork: boolean; language: string; files: Files; history: Commit[] };

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
const all = (files: Files) => Object.keys(files);

const thirdParty: Files = {
  ...Object.fromEntries(Object.entries(correct).map(([p, t]) => [p, t.replace("attempt < 5", "attempt < 3").replace("timeout(5000)", "timeout(8000)")])),
  "README.md": "# job-runner\n\nAcme's reference job runner. Persists progress and retries with backoff.\n",
};

const FIXTURES: Fixture[] = [
  {
    owner: LOGIN,
    repo: "job-runner",
    fork: false,
    language: "TypeScript",
    files: correct,
    history: [
      { author: LOGIN, message: "Initial job runner with persisted progress", date: "2026-05-02T10:12:00Z", paths: ["src/worker.ts", "src/progress.ts", "README.md"] },
      { author: LOGIN, message: "Retry with exponential backoff and a request timeout", date: "2026-05-09T16:40:00Z", paths: ["src/worker.ts"] },
      { author: LOGIN, message: "Tests for resume and retry exhaustion; CI", date: "2026-05-11T09:05:00Z", paths: ["tests/worker.test.ts", ".github/workflows/ci.yml"] },
    ],
  },
  {
    owner: LOGIN,
    repo: "queue-worker",
    fork: false,
    language: "TypeScript",
    files: missingEdgeCase,
    history: [
      { author: TEAMMATE, message: "Scaffold queue worker", date: "2026-03-01T12:00:00Z", paths: all(missingEdgeCase) },
      { author: LOGIN, message: "Persist progress between attempts", date: "2026-03-14T15:20:00Z", paths: ["src/worker.ts"] },
    ],
  },
  {
    owner: "acme-corp",
    repo: "job-runner",
    fork: false,
    language: "TypeScript",
    files: thirdParty,
    history: [{ author: "acme-bot", message: "Release 2.3", date: "2025-11-20T08:00:00Z", paths: all(thirdParty) }],
  },
  {
    owner: LOGIN,
    repo: "job-runner-resume",
    fork: false,
    language: "TypeScript",
    files: incomplete,
    history: [{ author: LOGIN, message: "Start resumable jobs (work in progress)", date: "2026-06-03T18:30:00Z", paths: all(incomplete) }],
  },
  {
    owner: LOGIN,
    repo: "webhook-relay",
    fork: false,
    language: "TypeScript",
    files: deceptive,
    history: [{ author: LOGIN, message: "Relay webhooks with retries", date: "2026-04-18T11:45:00Z", paths: all(deceptive) }],
  },
];

function headSha(f: Fixture) {
  return sha1(`${f.owner}/${f.repo}:${f.history.map((c) => c.message).join("|")}`);
}

/** Answers the GitHub endpoints the import pipeline calls, from FIXTURES only. */
const fixtureFetcher: Fetcher = async (url) => {
  const u = new URL(url);
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  const notFound = () => new Response(JSON.stringify({ message: "Not Found" }), { status: 404, headers: { "content-type": "application/json" } });
  const parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (u.origin === "https://raw.githubusercontent.com") {
    const [owner, repo, , ...rest] = parts;
    const f = FIXTURES.find((x) => x.owner === owner && x.repo === repo);
    const text = f?.files[rest.join("/")];
    return text === undefined ? notFound() : new Response(text, { status: 200, headers: { "content-type": "text/plain" } });
  }
  if (parts[0] !== "repos") return notFound();
  const [, owner, repo, kind, ...rest] = parts;
  const f = FIXTURES.find((x) => x.owner === owner && x.repo === repo);
  if (!f) return notFound();
  const sha = headSha(f);
  if (!kind) {
    return json({ id: parseInt(sha.slice(0, 7), 16), full_name: `${f.owner}/${f.repo}`, html_url: `https://github.com/${f.owner}/${f.repo}`, default_branch: "main", fork: f.fork, archived: false, private: false, language: f.language, size: 12 });
  }
  if (kind === "commits" && rest.length === 1) return new Response(sha, { status: 200 });
  if (kind === "git" && rest[0] === "trees") {
    return json({
      sha,
      truncated: false,
      tree: Object.entries(f.files).map(([path, text]) => ({ path, mode: "100644", type: "blob", size: Buffer.byteLength(text), sha: sha1(`blob ${text}`) })),
    });
  }
  if (kind === "commits" && rest.length === 0) {
    const author = (u.searchParams.get("author") ?? "").toLowerCase();
    const path = u.searchParams.get("path");
    const commits = [...f.history]
      .filter((c) => (!author || c.author.toLowerCase() === author) && (!path || c.paths.includes(path)))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c) => ({ sha: sha1(`${f.repo}:${c.message}`), commit: { message: c.message, author: { name: c.author, date: c.date } }, parents: [{}] }));
    return json(commits);
  }
  return notFound();
};

// ---- account ------------------------------------------------------------------

async function ensureAccount(): Promise<string> {
  const password = walkField("password");
  if (!password) throw new Error(`The walk file at ${walkPath} needs a password line.`);
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", EMAIL).maybeSingle();
  let id = (existing as { id: string } | null)?.id ?? null;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true });
    if (error || !data.user) throw new Error(`Could not create the showcase account: ${error?.message ?? "no user"}`);
    id = data.user.id;
  } else {
    await admin.auth.admin.updateUserById(id, { password });
  }
  await admin.from("profiles").upsert({ id, email: EMAIL, account_type: "fde", full_name: NAME, display_name: NAME, onboarding_state: "completed" });
  await admin
    .from("engineer_profiles")
    .upsert({ owner_id: id, display_name: NAME, headline: "Backend engineer. Job runners, retries and webhook delivery." }, { onConflict: "owner_id" });
  if (walkField("showcase") !== EMAIL) appendFileSync(walkPath, `\nshowcase ${EMAIL}\n`);
  // A Resend test inbox cannot receive a code; dev scripts mark synthetic inboxes the same way.
  const { data: verified } = await admin.from("email_inbox_verifications").select("user_id").eq("user_id", id).maybeSingle();
  if (!verified) await admin.from("email_inbox_verifications").insert({ user_id: id, email: EMAIL, method: "dev_backfill" });

  const login = await setGithubLogin(id, EMAIL, LOGIN);
  if (!login.ok) throw new Error(login.error);
  await admin
    .from("profile_connected_accounts")
    .update({ meta: { login: LOGIN, verified: false, synthetic: true } })
    .eq("owner_id", id)
    .eq("provider", "github");
  return id;
}

// ---- imports ------------------------------------------------------------------

async function importRepo(ownerId: string, displayName: string, repository: string, commitSha: string, contribution: string, client: GithubClient) {
  const queued = await enqueueImport({ ownerId, displayName, repository, commitSha, revisionRef: "main", contribution, githubLogin: null });
  if (!queued.ok) throw new Error(`${repository}: ${queued.error}`);
  const job = queued.job.state === "succeeded" ? queued.job : await runImportJob(queued.job.id, { client });
  console.log(`  ${repository}: ${job?.state ?? "not claimed"}${job?.errorCode ? ` (${job.errorCode})` : ""}`);
  return job;
}

async function setContext(ownerId: string, repo: string, input: Partial<ContributionInput>) {
  const current = await getContribution(ownerId, repo);
  const c = current.version ? current : emptyContribution(repo);
  if (current.version && (Object.keys(input) as Array<keyof ContributionInput>).every((k) => JSON.stringify(c[k]) === JSON.stringify(input[k]))) return;
  const base: ContributionInput = {
    relationship: c.relationship,
    problem: c.problem,
    workedOn: c.workedOn,
    inherited: c.inherited,
    collaboration: c.collaboration,
    collaborationNote: c.collaborationNote,
    constraintsFaced: c.constraintsFaced,
    checkedHow: c.checkedHow,
    results: c.results,
    improvements: c.improvements,
    evidenceRefs: c.evidenceRefs,
  };
  const saved = await saveContribution(ownerId, repo, { ...base, ...input }, c.version);
  if (!saved.ok) throw new Error(`${repo}: could not save the contribution context`);
}

const CONTEXT: Record<string, { relationship: ContributionInput["relationship"]; statement: string; extra?: Partial<ContributionInput> }> = {
  [`${LOGIN}/job-runner`]: {
    relationship: "maintained",
    statement: "I wrote the retry loop, the progress store and both tests.",
    extra: { problem: "Jobs restarted from zero after a crash.", workedOn: "Persisted progress, retries with backoff, a request timeout.", collaboration: "solo" },
  },
  [`${LOGIN}/queue-worker`]: {
    relationship: "team_project",
    statement: "Sam scaffolded the worker; I added persisted progress between attempts.",
    extra: { workedOn: "Progress persistence in src/worker.ts.", inherited: "Scaffold, CI and tests came from Sam.", collaboration: "team", collaborationNote: "Two engineers." },
  },
  ["acme-corp/job-runner"]: {
    relationship: "reference",
    statement: "",
    extra: { problem: "Studied as a reference for my own job runner." },
  },
  [`${LOGIN}/job-runner-resume`]: {
    relationship: "maintained",
    statement: "Resumable jobs. Unfinished.",
  },
  [`${LOGIN}/webhook-relay`]: {
    relationship: "maintained",
    statement: "Webhook relay with retries.",
  },
};

async function seedShowcase() {
  const ownerId = await ensureAccount();
  console.log("Showcase account ready (credentials not printed).");
  const client = new GithubClient(fixtureFetcher);
  const imported: string[] = [];
  for (const f of FIXTURES) {
    const repo = `${f.owner}/${f.repo}`;
    const ctx = CONTEXT[repo];
    const job = await importRepo(ownerId, NAME, repo, headSha(f), ctx?.statement ?? "", client);
    if (!job || job.state !== "succeeded" || !job.result) continue;
    imported.push(job.result.projectId);
    if (ctx) {
      await setContext(ownerId, repo, { relationship: ctx.relationship, ...ctx.extra });
      const r = await ensureCapabilityReport(ownerId, job.result.projectId, "Engineer described the project relationship and contribution");
      console.log(`    report v${r?.report.version ?? "?"}${r?.created ? " (new)" : ""}`);
    }
  }
  // Identical files in later imports change what earlier reports count once; a new version records that.
  for (const id of imported) {
    const r = await ensureCapabilityReport(ownerId, id, "Other projects with identical files were imported after this version");
    if (r?.created) console.log(`  ${id.slice(0, 8)}: report v${r.report.version} (new)`);
  }
}

async function reanalyseWalk() {
  const email = walkField("engineer");
  if (!email) throw new Error("The walk file needs an engineer line.");
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("profiles").select("id, display_name").eq("email", email).maybeSingle();
  const p = profile as { id: string; display_name: string | null } | null;
  if (!p) throw new Error("Walk engineer not found.");
  const { data: passport } = await admin.from("passports").select("id").eq("owner_id", p.id).maybeSingle();
  const passportId = (passport as { id: string } | null)?.id;
  if (!passportId) throw new Error("Walk engineer has no Passport.");
  const { data: projects } = await admin.from("passport_projects").select("repo_full_name").eq("passport_id", passportId).eq("source_kind", "github");
  const repos = [...new Set(((projects ?? []) as { repo_full_name: string }[]).map((r) => r.repo_full_name))];
  const real = new GithubClient();
  console.log(`Walk engineer projects: ${repos.join(", ")}`);
  for (const repo of repos) {
    const [owner, name] = repo.split("/");
    try {
      const meta = await real.getRepository({ owner, repo: name });
      const sha = await real.getCommitSha({ owner, repo: name }, meta.defaultBranch);
      await importRepo(p.id, p.display_name ?? "", repo, sha, "", real);
    } catch {
      console.log(`  ${repo}: not available on GitHub, left as it was`);
    }
  }
}

async function main() {
  await seedShowcase();
  if (process.argv.includes("--walk")) await reanalyseWalk();
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Failed");
  process.exit(1);
});
