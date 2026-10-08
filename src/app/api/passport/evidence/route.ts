/**
 * Evidence versions for one of the engineer's projects.
 *
 * GET  ?projectKey=  - confirmation state, guide gaps, preview and versions.
 * POST { action: "confirm" | "publish", projectKey } - confirm the contribution
 *      as written now, or publish the current evidence as an immutable version.
 *      Publishing unchanged evidence returns the existing version.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireUser } from "@/lib/simulations/auth";
import { confirmContribution, evidenceStatus, publishEvidenceVersion } from "@/lib/profile-evidence/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const KEY = /^[A-Za-z0-9._:/-]{1,300}$/;

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const projectKey = new URL(req.url).searchParams.get("projectKey") ?? "";
  if (!KEY.test(projectKey)) return NextResponse.json({ error: "Choose a project." }, { status: 400 });
  const status = await evidenceStatus(user.id, projectKey);
  if (!status) return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  return NextResponse.json({ status }, { headers: noStore });
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!rateLimit(`evidence:${user.id}`, 120, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many changes this hour. Try again later." }, { status: 429 });
  }
  const body: unknown = await req.json().catch(() => null);
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const projectKey = typeof b.projectKey === "string" ? b.projectKey : "";
  if (!KEY.test(projectKey)) return NextResponse.json({ error: "Choose a project." }, { status: 400 });
  if (b.action === "confirm") {
    const result = await confirmContribution(user.id, projectKey);
    if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  } else if (b.action === "publish") {
    const result = await publishEvidenceVersion(user.id, projectKey, "publish");
    if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  } else {
    return NextResponse.json({ error: "Choose confirm or publish." }, { status: 400 });
  }
  const status = await evidenceStatus(user.id, projectKey);
  return NextResponse.json({ status }, { headers: noStore });
}
