import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "missing" | "error" | "skipped"> = {
    application: "ok",
    database: "skipped",
    email_provider: process.env.RESEND_API_KEY ? "ok" : "missing",
    service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
  };

  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin.from("pilot_requests").select("id", { count: "exact", head: true });
      checks.database = error ? "error" : "ok";
    } catch {
      checks.database = "error";
    }
  } else {
    checks.database = "missing";
  }

  const healthy = checks.application === "ok" && checks.database !== "error";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
