import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { extractRepository } from "@/lib/passport/github/extract";
import { parseGithubInput } from "@/lib/passport/github/parse";
import { projectRemovalExplanation } from "@/lib/passport/removal";
import { removeProject, saveProject } from "@/lib/passport/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to save projects to your passport." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { repository?: unknown; contribution?: unknown; githubLogin?: unknown } | null;
  const parsed = typeof body?.repository === "string" ? parseGithubInput(body.repository) : null;
  if (!parsed || parsed.kind !== "repository") return NextResponse.json({ error: "Choose a repository as owner/repository." }, { status: 400 });
  const contribution = typeof body?.contribution === "string" ? body.contribution.trim() : "";
  const githubLogin = typeof body?.githubLogin === "string" && /^[A-Za-z0-9-]{1,39}$/.test(body.githubLogin) ? body.githubLogin : null;

  const result = await extractRepository(parsed.ref);
  if (result.status === "failed") return NextResponse.json({ result }, { status: 422 });

  try {
    const passport = await saveProject({ id: user.id, displayName: githubLogin ?? user.email.split("@")[0] }, githubLogin, result, contribution);
    return NextResponse.json({ result, passport });
  } catch {
    return NextResponse.json({ result, error: "The analysis finished but could not be saved. Try again." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const repo = new URL(req.url).searchParams.get("repo") ?? "";
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) return NextResponse.json({ error: "Unknown project." }, { status: 400 });
  const passport = await removeProject(user.id, repo);
  // GH-11: the response explains deletion versus retained shared/employer records.
  return NextResponse.json({ passport, explanation: projectRemovalExplanation(repo) });
}
