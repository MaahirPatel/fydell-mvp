/**
 * Production readiness checks for Fydell ops foundation.
 * Usage: npx tsx scripts/verify-production-readiness.ts
 * Never prints secret values.
 */
import { createClient } from "@supabase/supabase-js";

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const checks: Check[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  const bootstrap = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@fydell.com").toLowerCase();

  checks.push({
    name: "NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(url),
    detail: url ? "present" : "missing",
  });
  checks.push({
    name: "SUPABASE_SERVICE_ROLE_KEY",
    ok: Boolean(serviceKey),
    detail: serviceKey ? "present" : "missing",
  });
  checks.push({
    name: "RESEND_API_KEY",
    ok: Boolean(process.env.RESEND_API_KEY),
    detail: process.env.RESEND_API_KEY ? "present" : "missing",
  });
  checks.push({
    name: "CRON_SECRET",
    ok: Boolean(process.env.CRON_SECRET),
    detail: process.env.CRON_SECRET ? "present" : "missing",
  });
  checks.push({
    name: "No NEXT_PUBLIC_ service role",
    ok: !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    detail: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
      ? "EXPOSED — remove immediately"
      : "safe",
  });

  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const table of [
      "pilot_requests",
      "platform_user_roles",
      "email_outbox",
      "audit_logs",
      "invitations",
      "organization_members",
    ]) {
      const { error } = await admin.from(table).select("*", { count: "exact", head: true });
      checks.push({
        name: `table:${table}`,
        ok: !error,
        detail: error ? error.message : "reachable",
      });
    }

    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = listed?.users.find((u: { email?: string }) => (u.email || "").toLowerCase() === bootstrap);
    if (!user) {
      checks.push({
        name: "bootstrap admin user",
        ok: false,
        detail: `${bootstrap} not found in Auth — run bootstrap script`,
      });
    } else {
      const { data: roles } = await admin
        .from("platform_user_roles")
        .select("role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);
      const hasSuper = (roles || []).some((r: { role: string }) => r.role === "super_admin");
      checks.push({
        name: "bootstrap super_admin role",
        ok: hasSuper,
        detail: hasSuper ? "active" : "missing role record",
      });
    }
  }

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name} — ${check.detail}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
