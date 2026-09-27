import type { RepoRef, RepositoryMeta, TreeEntry } from "./types";

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const TIMEOUT_MS = 10_000;

export class GithubError extends Error {
  constructor(
    public readonly code: "not_found" | "rate_limited" | "unavailable",
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "fydell-passport-extractor",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function seg(value: string): string {
  return encodeURIComponent(value);
}

function rateLimitError(res: Response): GithubError | null {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  const retryAfter = Number(res.headers.get("retry-after"));
  if (res.status === 429 || ((res.status === 403 || res.status === 429) && remaining === "0")) {
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter
      : Number.isFinite(reset) && reset > 0
        ? Math.max(1, Math.round(reset - Date.now() / 1000))
        : 60;
    return new GithubError("rate_limited", "GitHub rate limit reached.", seconds);
  }
  return null;
}

export class GithubClient {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  private async request(url: string, accept?: string): Promise<Response> {
    const origin = new URL(url).origin;
    if (origin !== API && origin !== RAW) throw new GithubError("unavailable", "Refused request to a non-GitHub host.");
    let res: Response;
    try {
      res = await this.fetcher(url, {
        headers: accept ? { ...headers(), Accept: accept } : headers(),
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new GithubError("unavailable", "GitHub did not respond in time.");
    }
    const limited = rateLimitError(res);
    if (limited) throw limited;
    if (res.status === 404) throw new GithubError("not_found", "Repository or file not found.");
    if (!res.ok) throw new GithubError("unavailable", `GitHub returned ${res.status}.`);
    return res;
  }

  async getRepository({ owner, repo }: RepoRef): Promise<RepositoryMeta & { private: boolean }> {
    const res = await this.request(`${API}/repos/${seg(owner)}/${seg(repo)}`);
    const body = (await res.json()) as Record<string, unknown>;
    return {
      id: Number(body.id),
      fullName: String(body.full_name),
      htmlUrl: String(body.html_url),
      defaultBranch: String(body.default_branch || "main"),
      fork: body.fork === true,
      archived: body.archived === true,
      private: body.private === true,
      primaryLanguage: typeof body.language === "string" ? body.language : null,
      sizeKb: Number(body.size) || 0,
    };
  }

  async getCommitSha({ owner, repo }: RepoRef, branch: string): Promise<string> {
    const res = await this.request(
      `${API}/repos/${seg(owner)}/${seg(repo)}/commits/${seg(branch)}`,
      "application/vnd.github.sha",
    );
    const sha = (await res.text()).trim();
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new GithubError("unavailable", "GitHub returned an unexpected commit reference.");
    return sha;
  }

  async getTree({ owner, repo }: RepoRef, sha: string): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
    const res = await this.request(`${API}/repos/${seg(owner)}/${seg(repo)}/git/trees/${sha}?recursive=1`);
    const body = (await res.json()) as { tree?: Array<Record<string, unknown>>; truncated?: boolean };
    const entries: TreeEntry[] = (body.tree ?? [])
      .filter((e) => typeof e.path === "string" && (e.type === "blob" || e.type === "tree" || e.type === "commit"))
      .map((e) => ({
        path: String(e.path),
        type: e.type as TreeEntry["type"],
        mode: String(e.mode ?? ""),
        size: typeof e.size === "number" ? e.size : undefined,
      }));
    return { entries, truncated: body.truncated === true };
  }

  async getFileText({ owner, repo }: RepoRef, sha: string, path: string): Promise<string> {
    const encodedPath = path.split("/").map(seg).join("/");
    const res = await this.request(`${RAW}/${seg(owner)}/${seg(repo)}/${sha}/${encodedPath}`, "text/plain");
    return res.text();
  }

  async listPublicRepositories(user: string): Promise<
    Array<{ name: string; fullName: string; language: string | null; fork: boolean; archived: boolean; pushedAt: string | null }>
  > {
    const res = await this.request(`${API}/users/${seg(user)}/repos?type=owner&sort=pushed&per_page=30`);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    return body
      .filter((r) => r.private !== true)
      .map((r) => ({
        name: String(r.name),
        fullName: String(r.full_name),
        language: typeof r.language === "string" ? r.language : null,
        fork: r.fork === true,
        archived: r.archived === true,
        pushedAt: typeof r.pushed_at === "string" ? r.pushed_at : null,
      }));
  }
}
