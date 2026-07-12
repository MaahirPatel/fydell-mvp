import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  autosavePilotSession,
  startPilotSession,
  submitPilotSession,
} from "@/lib/pilot/lifecycle";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (body.action === "start") {
      const session = await startPilotSession({
        userId: user.id,
        assignmentId: String(body.assignmentId),
      });
      return NextResponse.json({ ok: true, session });
    }
    if (body.action === "autosave") {
      const result = await autosavePilotSession({
        userId: user.id,
        sessionId: String(body.sessionId),
        stateVersion: Number(body.stateVersion || 1),
        sessionState: body.sessionState || {},
        currentStage: body.currentStage,
      });
      if ("expired" in result && result.expired) {
        const submitted = await submitPilotSession({
          userId: user.id,
          sessionId: String(body.sessionId),
          finalRecommendation: String(
            (body.sessionState as { recommendation?: string })?.recommendation || "Hold"
          ),
          executiveMemo: String(
            (body.sessionState as { memo?: string })?.memo || "(autosubmitted on expiry)"
          ),
          forceAutosubmit: true,
        });
        return NextResponse.json({ ok: true, expired: true, ...submitted });
      }
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "submit") {
      const result = await submitPilotSession({
        userId: user.id,
        sessionId: String(body.sessionId),
        finalRecommendation: String(body.finalRecommendation || "Hold"),
        executiveMemo: String(body.executiveMemo || ""),
      });
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Session error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
