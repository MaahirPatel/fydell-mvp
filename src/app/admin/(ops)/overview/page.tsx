import Link from "next/link";
import { getOpsMetrics } from "@/lib/ops/metrics";
import { listPilotRequests } from "@/lib/ops/pilot-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export default async function AdminOverviewPage() {
  const metrics = await getOpsMetrics();
  const recent = await listPilotRequests(8);

  let failedEmails: Array<{
    id: string;
    recipient_email: string;
    template_key: string;
    last_error: string | null;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("email_outbox")
      .select("id, recipient_email, template_key, last_error, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(8);
    failedEmails = data || [];
  }

  const cards = [
    { label: "New requests", value: metrics.newPilotRequests },
    { label: "Unassigned", value: metrics.unassignedPilotRequests },
    { label: "Awaiting contact", value: metrics.awaitingContact },
    { label: "Approved pilots", value: metrics.approvedPilots },
    { label: "Organizations", value: metrics.activeOrganizations },
    { label: "Pending email", value: metrics.pendingEmails },
    { label: "Failed email", value: metrics.failedEmails },
    { label: "Bounced email", value: metrics.bouncedEmails },
  ];

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Overview
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Live counts from Supabase. No invented analytics.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[12px] border border-[rgba(255,255,255,0.095)] px-4 py-4"
          >
            <p className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
              {card.label}
            </p>
            <p className="mt-2 text-[28px] tabular-nums" style={{ fontWeight: 540 }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
              Recent pilot requests
            </h2>
            <Link href="/admin/pilot-requests" className="text-[12px] text-[rgba(244,245,247,0.62)]">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <li className="text-[13px] text-[rgba(244,245,247,0.5)]">No requests yet.</li>
            ) : (
              recent.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <Link
                      href={`/admin/pilot-requests/${row.id}`}
                      className="text-[#F4F5F7] hover:underline"
                    >
                      {row.public_reference || row.id.slice(0, 8)}
                    </Link>
                    <p className="mt-0.5 text-[rgba(244,245,247,0.55)]">
                      {row.company_name || "—"} · {row.full_name || row.name || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 capitalize text-[rgba(244,245,247,0.45)]">
                    {row.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
              Requires attention
            </h2>
            <Link href="/admin/email" className="text-[12px] text-[rgba(244,245,247,0.62)]">
              Email center
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {failedEmails.length === 0 ? (
              <li className="text-[13px] text-[rgba(244,245,247,0.5)]">
                No failed email deliveries.
              </li>
            ) : (
              failedEmails.map((row) => (
                <li key={row.id} className="text-[13px]">
                  <p className="text-[#F4F5F7]">{row.recipient_email}</p>
                  <p className="mt-0.5 text-[rgba(244,245,247,0.55)]">
                    {row.template_key}
                    {row.last_error ? ` · ${row.last_error}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
