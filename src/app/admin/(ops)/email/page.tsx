import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { processEmailOutbox } from "@/lib/ops/process-outbox";

export const dynamic = "force-dynamic";

export default async function AdminEmailCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "outbox" } = await searchParams;
  const statusFilter =
    tab === "sent"
      ? ["sent"]
      : tab === "delivered"
        ? ["delivered"]
        : tab === "failed"
          ? ["failed"]
          : tab === "bounced"
            ? ["bounced"]
            : ["pending", "processing", "failed"];

  let rows: Array<{
    id: string;
    recipient_email: string;
    template_key: string;
    status: string;
    attempt_count: number;
    scheduled_for: string;
    sent_at: string | null;
    provider_message_id: string | null;
    last_error: string | null;
  }> = [];
  let suppressions: Array<{ id: string; email: string; reason: string; created_at: string }> = [];

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (tab === "suppressions") {
      const { data } = await admin
        .from("email_suppressions")
        .select("id, email, reason, created_at")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      suppressions = data || [];
    } else {
      const { data } = await admin
        .from("email_outbox")
        .select(
          "id, recipient_email, template_key, status, attempt_count, scheduled_for, sent_at, provider_message_id, last_error"
        )
        .in("status", statusFilter)
        .order("created_at", { ascending: false })
        .limit(200);
      rows = data || [];
    }
  }

  const tabs = [
    ["outbox", "Outbox"],
    ["sent", "Sent"],
    ["delivered", "Delivered"],
    ["failed", "Failed"],
    ["bounced", "Bounced"],
    ["suppressions", "Suppressions"],
  ] as const;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
            Email Center
          </h1>
          <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
            Outbox survives provider failures. Retry without losing customer records.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await processEmailOutbox(25);
          }}
        >
          <button
            type="submit"
            className="h-9 rounded-[8px] bg-[var(--control-solid)] px-3 text-[12.5px] text-[var(--control-solid-ink)]"
            style={{ fontWeight: 560 }}
          >
            Process queue now
          </button>
        </form>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <a
            key={key}
            href={`/admin/email?tab=${key}`}
            className={`rounded-[8px] px-3 py-1.5 text-[12.5px] ${
              tab === key
                ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="overflow-x-auto">
          {tab === "suppressions" ? (
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] text-[12px] font-medium text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {suppressions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                      No suppressions.
                    </td>
                  </tr>
                ) : (
                  suppressions.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border-subtle)]">
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3 capitalize">{row.reason}</td>
                      <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] text-[12px] font-medium text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Provider ID</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                      No emails in this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border-subtle)]">
                      <td className="px-4 py-3">{row.recipient_email}</td>
                      <td className="px-4 py-3">{row.template_key}</td>
                      <td className="px-4 py-3 capitalize">{row.status}</td>
                      <td className="px-4 py-3 tabular-nums">{row.attempt_count}</td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">
                        {row.provider_message_id || "-"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#F26B82]">
                        {row.last_error || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
