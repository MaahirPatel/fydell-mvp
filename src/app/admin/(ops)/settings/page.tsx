import { getOpsMetrics } from "@/lib/ops/metrics";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const metrics = await getOpsMetrics();
  const checks = [
    {
      label: "Database reachable",
      ok: isSupabaseConfigured(),
      detail: isSupabaseConfigured() ? "Supabase service role configured" : "Missing service role",
    },
    {
      label: "Email provider configured",
      ok: Boolean(process.env.RESEND_API_KEY),
      detail: process.env.RESEND_API_KEY ? "RESEND_API_KEY present" : "Missing RESEND_API_KEY",
    },
    {
      label: "Webhook secret configured",
      ok: Boolean(process.env.RESEND_WEBHOOK_SECRET),
      detail: process.env.RESEND_WEBHOOK_SECRET
        ? "RESEND_WEBHOOK_SECRET present"
        : "Missing RESEND_WEBHOOK_SECRET",
    },
    {
      label: "Cron secret configured",
      ok: Boolean(process.env.CRON_SECRET),
      detail: process.env.CRON_SECRET ? "CRON_SECRET present" : "Missing CRON_SECRET",
    },
    {
      label: "Bootstrap admin email",
      ok: Boolean(process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL),
      detail: process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@fydell.com",
    },
  ];

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        System settings
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Safe configuration presence checks. Secret values are never shown.
      </p>

      <div className="mt-8 space-y-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between rounded-[12px] border border-[rgba(255,255,255,0.095)] px-4 py-3 text-[13px]"
          >
            <div>
              <p style={{ fontWeight: 520 }}>{check.label}</p>
              <p className="mt-1 text-[rgba(244,245,247,0.5)]">{check.detail}</p>
            </div>
            <span className={check.ok ? "text-[#67D9A0]" : "text-[#E9B949]"}>
              {check.ok ? "ok" : "attention"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.095)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Outbox backlog
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.pendingEmails}</p>
        </div>
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.095)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Failed emails
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.failedEmails}</p>
        </div>
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.095)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Bounced emails
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.bouncedEmails}</p>
        </div>
      </div>

      <p className="mt-8 text-[13px] text-[rgba(244,245,247,0.5)]">
        MFA enrollment for platform admins is required before enabling high-risk mutations in
        production. See docs/production-setup.md.
      </p>
    </div>
  );
}
