import { NextResponse } from "next/server";
import { clearAdminSession, clearCompanySession } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Admins may be signed in through Supabase as well as the env cookie; end both. */
export async function POST() {
  try {
    await (await createServerSupabaseClient()).auth.signOut();
  } catch {
    /* no Supabase session */
  }
  await clearCompanySession();
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
