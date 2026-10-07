import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { projectRemovalExplanation } from "@/lib/passport/removal";
import { removeProject } from "@/lib/passport/store";

export const runtime = "nodejs";

/** Saving projects goes through durable imports: POST /api/passport/imports. */
export async function POST() {
  return NextResponse.json(
    { error: "Projects are added through imports. Preview the repository, then start an import.", code: "use_imports" },
    { status: 410 },
  );
}

export async function DELETE(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const repo = new URL(req.url).searchParams.get("repo") ?? "";
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) return NextResponse.json({ error: "Unknown project." }, { status: 400 });
  const passport = await removeProject(user.id, repo);
  return NextResponse.json({ passport, explanation: projectRemovalExplanation(repo) });
}
