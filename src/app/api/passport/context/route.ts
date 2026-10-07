import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { parseContribution, parseDecision } from "@/lib/passport/context-contract";
import {
  createDecision,
  getContribution,
  listDecisions,
  repoForProject,
  saveContribution,
  updateDecision,
  withdrawDecision,
} from "@/lib/passport/context-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "That project is not in your Passport." }, { status: 404 });

async function body(req: Request): Promise<Record<string, unknown> | null> {
  const b = (await req.json().catch(() => null)) as unknown;
  return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : null;
}

const versionOf = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);

/** GET ?projectId= - the engineer's contribution statement and decisions for that project. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const repo = await repoForProject(user.id, new URL(req.url).searchParams.get("projectId") ?? "");
  if (!repo) return notFound();
  const [contribution, decisions] = await Promise.all([getContribution(user.id, repo), listDecisions(user.id, repo)]);
  return NextResponse.json({ contribution, decisions });
}

/** PUT { projectId, expectedVersion, contribution } - save the contribution statement. */
export async function PUT(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  const repo = await repoForProject(user.id, typeof b?.projectId === "string" ? b.projectId : "");
  if (!repo) return notFound();
  const expected = versionOf(b?.expectedVersion);
  if (expected === null) return NextResponse.json({ error: "Missing the version you edited." }, { status: 400 });
  const input = parseContribution(b?.contribution);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  const saved = await saveContribution(user.id, repo, input, expected);
  if (saved.ok === false) return NextResponse.json({ error: saved.error, current: saved.current }, { status: saved.status });
  return NextResponse.json({ contribution: saved.value });
}

/** POST { projectId, decision } - record a new decision. */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  const repo = await repoForProject(user.id, typeof b?.projectId === "string" ? b.projectId : "");
  if (!repo) return notFound();
  const input = parseDecision(b?.decision);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  const saved = await createDecision(user.id, repo, input);
  if (saved.ok === false) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json({ decision: saved.value }, { status: 201 });
}

/** PATCH { decisionId, action: "withdraw" } or { decisionId, expectedVersion, decision }. */
export async function PATCH(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  const decisionId = typeof b?.decisionId === "string" ? b.decisionId : "";
  if (b?.action === "withdraw") {
    const done = await withdrawDecision(user.id, decisionId);
    return done ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }
  const expected = versionOf(b?.expectedVersion);
  if (expected === null) return NextResponse.json({ error: "Missing the version you edited." }, { status: 400 });
  const input = parseDecision(b?.decision);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
  const saved = await updateDecision(user.id, decisionId, input, expected);
  if (saved.ok === false) return NextResponse.json({ error: saved.error, current: saved.current }, { status: saved.status });
  return NextResponse.json({ decision: saved.value });
}
