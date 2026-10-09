import { NextResponse } from "next/server";
import { clearCompanySession, clearAdminSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    // Local scope: a global sign-out would also revoke the desktop app's own session.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  await clearCompanySession();
  try {
    await clearAdminSession();
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  await POST();
  return NextResponse.redirect(new URL("/login", req.url));
}
