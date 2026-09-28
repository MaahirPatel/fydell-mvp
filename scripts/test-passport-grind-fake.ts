/**
 * Shared fakes and harness for the chunk-passport grind tests.
 * Run: npx tsx scripts/test-passport-grind-extract.ts (etc.)
 */
import type { Fetcher } from "@/lib/passport/github/client";

export type FakeRepo = {
  owner: string;
  repo: string;
  private?: boolean;
  fork?: boolean;
  archived?: boolean;
  defaultBranch?: string;
  /** null => the commits endpoint 404s (empty repository). */
  sha?: string | null;
  language?: string | null;
  sizeKb?: number;
  files?: Record<string, string>;
  extraEntries?: Array<{ path: string; type: "blob" | "tree" | "commit"; mode: string; size?: number }>;
  treeTruncated?: boolean;
};

const API = "https://api.github.com";

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const text = (data: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(data, { status, headers: { "Content-Type": "text/plain", ...headers } });

export class FakeGithub {
  private repos = new Map<string, FakeRepo>();
  private plan: Array<{ match: (url: string) => boolean; remaining: number; make: () => Response }> = [];
  readonly requests: string[] = [];
  readonly users = new Map<string, FakeRepo[]>();

  addRepo(repo: FakeRepo): this {
    this.repos.set(`${repo.owner}/${repo.repo}`.toLowerCase(), repo);
    return this;
  }

  addUserRepos(user: string, repos: FakeRepo[]): this {
    this.users.set(user.toLowerCase(), repos);
    return this;
  }

  /** Inject a scripted failure that fires `times` times for matching URLs. */
  failNext(match: (url: string) => boolean, times: number, status: number, headers: Record<string, string> = {}): this {
    this.plan.push({ match, remaining: times, make: () => new Response(`fake ${status}`, { status, headers }) });
    return this;
  }

  rateLimitNext(times: number, retryAfterSeconds: number): this {
    return this.failNext(() => true, times, 429, {
      "x-ratelimit-remaining": "0",
      "retry-after": String(retryAfterSeconds),
    });
  }

  readonly fetcher: Fetcher = async (url: string) => {
    this.requests.push(url);
    for (const p of this.plan) {
      if (p.remaining > 0 && p.match(url)) {
        p.remaining -= 1;
        return p.make();
      }
    }
    return this.route(url);
  };

  count(match: (url: string) => boolean): number {
    return this.requests.filter(match).length;
  }

  private route(url: string): Response {
    const u = new URL(url);
    if (u.origin === "https://raw.githubusercontent.com") {
      const [, owner, repo, sha, ...rest] = u.pathname.split("/");
      const r = this.repos.get(`${owner}/${repo}`.toLowerCase());
      const path = rest.join("/");
      if (!r || r.sha !== sha) return new Response("not found", { status: 404 });
      const content = r.files?.[path];
      if (content === undefined) return new Response("not found", { status: 404 });
      return text(content);
    }
    if (u.origin !== API) return new Response("refused", { status: 500 });

    let m = u.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/commits\/([^/]+)$/);
    if (m) {
      const r = this.repos.get(`${m[1]}/${m[2]}`.toLowerCase());
      if (!r || r.sha == null) return new Response("not found", { status: 404 });
      return text(r.sha, 200, { "Content-Type": "application/vnd.github.sha" });
    }
    m = u.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/git\/trees\/([^/]+)$/);
    if (m) {
      const r = this.repos.get(`${m[1]}/${m[2]}`.toLowerCase());
      if (!r || r.sha !== m[3]) return new Response("not found", { status: 404 });
      const entries = [
        ...Object.entries(r.files ?? {}).map(([path, content]) => ({
          path,
          type: "blob" as const,
          mode: "100644",
          size: Buffer.byteLength(content, "utf8"),
        })),
        ...(r.extraEntries ?? []),
      ];
      return json({ tree: entries, truncated: r.treeTruncated === true });
    }
    m = u.pathname.match(/^\/repos\/([^/]+)\/([^/]+)$/);
    if (m) {
      const r = this.repos.get(`${m[1]}/${m[2]}`.toLowerCase());
      if (!r) return new Response("not found", { status: 404 });
      return json({
        id: 424242,
        full_name: `${r.owner}/${r.repo}`,
        html_url: `https://github.com/${r.owner}/${r.repo}`,
        default_branch: r.defaultBranch ?? "main",
        fork: r.fork === true,
        archived: r.archived === true,
        private: r.private === true,
        language: r.language ?? null,
        size: r.sizeKb ?? 12,
      });
    }
    m = u.pathname.match(/^\/users\/([^/]+)\/repos$/);
    if (m) {
      const repos = this.users.get(m[1].toLowerCase());
      if (!repos) return new Response("not found", { status: 404 });
      const page = Number(u.searchParams.get("page") ?? "1");
      const perPage = Number(u.searchParams.get("per_page") ?? "30");
      const slice = repos.slice((page - 1) * perPage, page * perPage);
      const headers: Record<string, string> = {};
      // Page 1 advertises a next page. The "next" link can be overridden by
      // tests via `linkOverride` to probe hostile pagination targets.
      const next = this.linkOverride ?? (repos.length > page * perPage
        ? `${API}/users/${m[1]}/repos?type=owner&sort=pushed&per_page=${perPage}&page=${page + 1}`
        : null);
      if (next) headers.link = `<${next}>; rel="next"`;
      return json(
        slice.map((r) => ({
          name: r.repo,
          full_name: `${r.owner}/${r.repo}`,
          private: r.private === true,
          language: r.language ?? null,
          fork: r.fork === true,
          archived: r.archived === true,
          pushed_at: "2026-01-02T03:04:05Z",
        })),
        200,
        headers,
      );
    }
    return new Response("not found", { status: 404 });
  }

  linkOverride: string | null = null;
}

/* ------------------------------------------------------------------ */
/* Minimal check harness                                               */
/* ------------------------------------------------------------------ */

let passes = 0;
let failures = 0;

export function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passes += 1;
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

export function report(label: string): void {
  console.log(`${label}: ${passes} passed, ${failures} failed`);
  if (failures > 0) process.exitCode = 1;
}

export const SHA_A = "a".repeat(40);
export const SHA_B = "b".repeat(40);

/** A small realistic repo exercising most detectors. */
export function standardRepo(overrides: Partial<FakeRepo> = {}): FakeRepo {
  return {
    owner: "acme",
    repo: "api",
    sha: SHA_A,
    language: "Python",
    files: {
      "README.md": "# api\nRuns the Acme HTTP API.\n",
      "requirements.txt": "fastapi==0.110\nuvicorn[standard]\n",
      "src/app.py": [
        "from fastapi import FastAPI",
        "from pydantic import BaseModel",
        "",
        "app = FastAPI()",
        "",
        "class ItemIn(BaseModel):",
        "    name: str",
        "",
        '@app.post("/items")',
        "async def create_item(payload: ItemIn):",
        '    return {"ok": True}',
        "",
      ].join("\n"),
      "src/worker.py": [
        "seen_ids = set()",
        "",
        "def handle(event):",
        '    if event.get("already_processed") and event["token"] == "ghp_0123456789abcdef0123":',
        '        return {"status": "duplicate"}',
        "    seen_ids.add(event['id'])",
        "    process(event)",
        "",
      ].join("\n"),
      "tests/test_app.py": ["def test_create_item():", "    assert True", ""].join("\n"),
      ".github/workflows/ci.yml": ["name: ci", "on: [push]", "jobs:", "  test:", "    runs-on: ubuntu-latest", "    steps:", "      - run: pytest", ""].join("\n"),
      ".env": 'DATABASE_URL=postgres://user:hunter2@localhost/db\n',
      "assets/logo.png": "fake-binary",
    },
    ...overrides,
  };
}
