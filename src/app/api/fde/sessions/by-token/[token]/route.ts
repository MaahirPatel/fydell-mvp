import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getSessionByInviteToken } from "@/lib/fde/relay-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const { token } = await ctx.params;
    const session = await getSessionByInviteToken(token, data.user.id);
    return NextResponse.json({ sessionId: session.id, status: session.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not resolve session.";
    const status = /not found|no session/i.test(msg) ? 404 : /forbidden/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
