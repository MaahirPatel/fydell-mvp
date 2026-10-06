import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { saveManualProject, type ManualProjectInput } from "@/lib/passport/store";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";

/**
 * POST /api/passport/projects/manual
 * Add a self-reported project (no GitHub required).
 * Body: { title, description, contributionStatement, techStack?, links? }
 *
 * Manual projects carry no code-analysis evidence. They are labeled
 * "self-reported" everywhere they appear.
 */
export async function POST(req: Request) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to save projects to your passport." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    contributionStatement?: unknown;
    techStack?: unknown;
    links?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Send the project details." }, { status: 400 });

  const input: ManualProjectInput = {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    contributionStatement: typeof body.contributionStatement === "string" ? body.contributionStatement : "",
    techStack: Array.isArray(body.techStack) ? body.techStack.filter((t): t is string => typeof t === "string") : [],
    links: Array.isArray(body.links)
      ? body.links
          .filter((l): l is { label?: unknown; url?: unknown } => typeof l === "object" && l !== null)
          .map((l) => ({ label: typeof l.label === "string" ? l.label : "", url: typeof l.url === "string" ? l.url : "" }))
      : [],
  };

  try {
    const displayName = user.email ? user.email.split("@")[0] : "engineer";
    const passport = await saveManualProject({ id: user.id, displayName }, input);
    return NextResponse.json({ passport });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save the project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
