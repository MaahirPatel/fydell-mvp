import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { GithubClient, GithubError } from "@/lib/passport/github/client";
import { extractRepository } from "@/lib/passport/github/extract";
import { parseGithubInput } from "@/lib/passport/github/parse";
import { INTAKE_SCOPE, LIMITS } from "@/lib/passport/github/types";
import { projectFromResult } from "@/lib/passport/assemble";
import { disconnectGithub } from "@/lib/passport/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const ANONYMOUS_REQUESTS_PER_WINDOW = 6;
const recent = new Map<string, number[]>();

/** Per-instance throttle. It limits abuse of one server process; it is not a global quota. */
function throttled(key: string, max: number): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > max;
}

export async function POST(req: Request) {
  const user = await requireUser();
  const caller = user?.id ?? `ip:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`;
  if (throttled(caller, user ? MAX_REQUESTS_PER_WINDOW : ANONYMOUS_REQUESTS_PER_WINDOW)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with an \"input\" field." }, { status: 400 });
  }
  const raw = typeof body === "object" && body !== null && "input" in body ? (body as { input: unknown }).input : null;
  const repositories =
    typeof body === "object" && body !== null && "repositories" in body ? (body as { repositories: unknown }).repositories : null;

  if (Array.isArray(repositories)) {
    if (repositories.length === 0 || repositories.length > LIMITS.maxRepositoriesPerImport) {
      return NextResponse.json({ error: `Select between 1 and ${LIMITS.maxRepositoriesPerImport} repositories.` }, { status: 400 });
    }
    const refs = repositories.map((r) => (typeof r === "string" ? parseGithubInput(r) : null));
    if (refs.some((r) => !r || r.kind !== "repository")) {
      return NextResponse.json({ error: "Each selection must be an owner/repository name." }, { status: 400 });
    }
    const client = new GithubClient();
    const results = [];
    for (const ref of refs) if (ref && ref.kind === "repository") results.push(await extractRepository(ref.ref, client));
    return NextResponse.json({ results });
  }

  if (typeof raw !== "string") return NextResponse.json({ error: "Enter a GitHub username or repository URL." }, { status: 400 });
  const parsed = parseGithubInput(raw);
  if (!parsed) return NextResponse.json({ error: "Enter a github.com profile, a repository URL, or owner/repository." }, { status: 400 });

  if (parsed.kind === "profile") {
    try {
      const { repositories, truncated } = await new GithubClient().listPublicRepositories(parsed.user);
      // GH-01: every intake response states the supported scope.
      return NextResponse.json({
        kind: "profile",
        user: parsed.user,
        repositories,
        truncated,
        intake: INTAKE_SCOPE,
      });
    } catch (err) {
      if (err instanceof GithubError && err.code === "not_found") {
        return NextResponse.json({ error: "No GitHub account with that name." }, { status: 404 });
      }
      if (err instanceof GithubError && err.code === "rate_limited") {
        return NextResponse.json({ error: "GitHub is limiting requests. Try again shortly.", retryAfterSeconds: err.retryAfterSeconds }, { status: 503 });
      }
      return NextResponse.json({ error: "GitHub could not be reached." }, { status: 502 });
    }
  }

  const result = await extractRepository(parsed.ref);
  return NextResponse.json({ kind: "repository", result, project: projectFromResult(result, ""), intake: INTAKE_SCOPE });
}

/** Disconnect GitHub from the passport (GH-11): removes the linked login and stops future association. */
export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(await disconnectGithub(user.id));
}
