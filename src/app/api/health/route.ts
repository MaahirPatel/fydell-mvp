import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { allowDemoData } from "@/lib/org/reserved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV === "production" && allowDemoData()) {
    return NextResponse.json(
      {
        status: "error",
        checks: { demo_guard: "error" },
        error: "ALLOW_DEMO_DATA=true is forbidden in production",
      },
      { status: 500 }
    );
  }

  const checks: Record<string, "ok" | "missing" | "error" | "skipped"> = {
    application: "ok",
    database: "skipped",
    email_provider: process.env.RESEND_API_KEY ? "ok" : "missing",
    service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
    email_outbox: "skipped",
    pilot_schema: "skipped",
  };

  let emailBacklog = 0;
  let failedEmails = 0;
  let lastCron: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("pilot_requests")
        .select("id", { count: "exact", head: true });
      checks.database = error ? "error" : "ok";

      const { count: pending } = await admin
        .from("email_outbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: failed } = await admin
        .from("email_outbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed");
      emailBacklog = pending || 0;
      failedEmails = failed || 0;
      checks.email_outbox = "ok";

      const { error: schemaErr } = await admin
        .from("employer_onboarding")
        .select("id", { count: "exact", head: true });
      checks.pilot_schema = schemaErr ? "missing" : "ok";

      const { data: hb } = await admin
        .from("system_heartbeats")
        .select("last_run_at")
        .eq("key", "email_outbox_cron")
        .maybeSingle();
      lastCron = hb?.last_run_at || null;
    } catch {
      checks.database = "error";
    }
  } else {
    checks.database = "missing";
  }

  const healthy =
    checks.application === "ok" && checks.database !== "error";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      metrics: {
        emailBacklog,
        failedEmails,
        lastEmailCronAt: lastCron,
        version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
