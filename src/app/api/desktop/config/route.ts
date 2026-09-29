import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET: the public Supabase endpoint the desktop app needs to refresh its
 * session and address the auth cookie. Both values already ship to every
 * browser in the web bundle; the service role key is never returned.
 * Contract: desktop/src-tauri/src/config.rs.
 */
export async function GET() {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Desktop configuration is unavailable." }, { status: 503 });
  }
  return NextResponse.json(
    { supabaseUrl: url, supabaseAnonKey: anonKey },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
