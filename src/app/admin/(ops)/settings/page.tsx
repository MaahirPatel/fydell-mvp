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
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        Safe configuration presence checks. Secret values are never shown.
      </p>

      <div className="mt-8 space-y-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-[13px]"
          >
            <div>
              <p style={{ fontWeight: 520 }}>{check.label}</p>
              <p className="mt-1 text-[var(--text-secondary)]">{check.detail}</p>
            </div>
            <span
              className={
                check.ok
                  ? "text-[var(--status-positive-ink)]"
                  : "text-[var(--status-attention-ink)]"
              }
            >
              {check.ok ? "ok" : "attention"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-4">
          <p className="text-app-meta font-medium text-[var(--text-secondary)]">
            Outbox backlog
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.pendingEmails}</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-app-meta font-medium text-[var(--text-secondary)]">
            Failed emails
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.failedEmails}</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-app-meta font-medium text-[var(--text-secondary)]">
            Bounced emails
          </p>
          <p className="mt-2 text-[24px] tabular-nums">{metrics.bouncedEmails}</p>
        </div>
      </div>

      <p className="mt-8 text-[13px] text-[var(--text-secondary)]">
        MFA enrollment for platform admins is required before enabling high-risk mutations in
        production. See docs/production-setup.md.
      </p>
    </div>
  );
}
