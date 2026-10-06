import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { removeManualProject, updateManualProject, type ManualProjectInput } from "@/lib/passport/store";

export const runtime = "nodejs";

function parseBody(body: unknown): ManualProjectInput {
  const b = (body ?? {}) as {
    title?: unknown;
    description?: unknown;
    contributionStatement?: unknown;
    techStack?: unknown;
    links?: unknown;
  };
  return {
    title: typeof b.title === "string" ? b.title : "",
    description: typeof b.description === "string" ? b.description : "",
    contributionStatement: typeof b.contributionStatement === "string" ? b.contributionStatement : "",
    techStack: Array.isArray(b.techStack) ? b.techStack.filter((t): t is string => typeof t === "string") : [],
    links: Array.isArray(b.links)
      ? b.links
          .filter((l): l is { label?: unknown; url?: unknown } => typeof l === "object" && l !== null)
          .map((l) => ({ label: typeof l.label === "string" ? l.label : "", url: typeof l.url === "string" ? l.url : "" }))
      : [],
  };
}

function idFrom(params: { id?: string }): string | null {
  const id = params.id ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

/** PATCH /api/passport/projects/manual/[id] — edit a self-reported project. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = idFrom(await params);
  if (!id) return NextResponse.json({ error: "Unknown project." }, { status: 400 });
  try {
    const passport = await updateManualProject(user.id, id, parseBody(await req.json().catch(() => null)));
    return NextResponse.json({ passport });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save the project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/passport/projects/manual/[id] — remove a self-reported project. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = idFrom(await params);
  if (!id) return NextResponse.json({ error: "Unknown project." }, { status: 400 });
  const passport = await removeManualProject(user.id, id);
  return NextResponse.json({ passport });
}
