import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate } from "@/lib/simulations/db";
import { evaluatePreflight, recordPreflight } from "@/lib/pilot/consent";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { publicErrorMessage } from "@/lib/security/public-error";
import { parseJsonBody } from "@/lib/security/request-body";

export const runtime = "nodejs";

/** POST: record real browser/viewport/network checks. Also probes this API as reachability. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, {
    viewportWidth: { type: "number", min: 0, max: 100000 },
    viewportHeight: { type: "number", min: 0, max: 100000 },
    userAgent: { type: "string", max: 1000 },
    localStorageOk: { type: "boolean" },
  });
  if (parsed.ok === false) return parsed.response;
  const body = parsed.body;

  try {
    const session = await getSessionForCandidate(id, user.id);
    // Reaching this handler proves network/API reachability for this session.
    const payload = evaluatePreflight({
      ...body,
      networkOk: true,
    });
    const recorded = await recordPreflight({
      invitationId: session.invitation_id,
      sessionId: session.id,
      candidateUserId: user.id,
      payload,
    });
    return NextResponse.json({
      ok: recorded.ok,
      preflightId: recorded.id,
      result: payload,
      canStart: recorded.ok,
    });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Preflight failed") },
      { status: 400 }
    );
  }
}

/** GET: latest preflight for this session. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const session = await getSessionForCandidate(id, user.id);
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("preflight_checks")
      .select("*")
      .eq("invitation_id", session.invitation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ preflight: data });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Failed") },
      { status: 400 }
    );
  }
}
