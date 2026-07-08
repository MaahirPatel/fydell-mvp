import { NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { dbSaveSessionResult, supabaseReady } from "@/lib/platform-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await getCompanySession();

    if (!supabaseReady()) {
      return NextResponse.json({
        ok: true,
        stored: false,
        message: "Supabase not configured - session saved locally only."
      });
    }

    await dbSaveSessionResult({
      userId: session?.userId || null,
      simId: body.simId || null,
      simTitle: body.simTitle || null,
      overallScore: body.overallScore ?? null,
      verdict: body.verdict || null,
      analysis: body.analysis || {},
      responses: body.responses || {},
      elapsedSeconds: body.elapsedSeconds ?? null,
      demo: Boolean(body.demo)
    });

    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save session.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
