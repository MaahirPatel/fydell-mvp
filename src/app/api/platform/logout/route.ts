import { NextResponse } from "next/server";
import { clearCompanySession, clearAdminSession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
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

export async function GET() {
  await POST();
  return NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://www.fydell.com")
  );
}
