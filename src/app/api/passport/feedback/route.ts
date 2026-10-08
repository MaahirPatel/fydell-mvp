/**
 * Collaborator feedback on one project.
 *
 * POST   { projectKey, authorName, relationship, relationshipNote, directlyObserved, statement }
 * DELETE { id } - withdraw from future versions.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireUser } from "@/lib/simulations/auth";
import { parseFeedbackInput } from "@/lib/profile-evidence/contract";
import { addFeedback, withdrawFeedback } from "@/lib/profile-evidence/feedback";
import { gatherSources } from "@/lib/profile-evidence/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function body(req: Request): Promise<Record<string, unknown>> {
  const raw: unknown = await req.json().catch(() => null);
  return (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  const parsed = parseFeedbackInput(b);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const projectKey = typeof b.projectKey === "string" ? b.projectKey : "";
  const g = projectKey ? await gatherSources(user.id, projectKey) : null;
  if (!g || "ok" in g || g.sources.sourceKind === "work_sample") return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  const result = await addFeedback(user.id, g.sources.projectKey, parsed);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ feedback: result.feedback }, { status: 201 });
}

export async function DELETE(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  if (typeof b.id !== "string" || !(await withdrawFeedback(user.id, b.id))) return NextResponse.json({ error: "That feedback was not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
