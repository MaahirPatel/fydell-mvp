import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listCandidateVerifications } from "@/lib/employer/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/candidate/verifications
 * Candidate's pending verification requests across all employers.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json({ verifications: await listCandidateVerifications(user.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load." }, { status: 500 });
  }
}
