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
    { label: "New requests", value: metrics.newPilotRequests, href: "/admin/pilot-requests" },
    { label: "Unassigned", value: metrics.unassignedPilotRequests, href: "/admin/pilot-requests" },
    { label: "Awaiting contact", value: metrics.awaitingContact, href: "/admin/pilot-requests" },
    { label: "Approved pilots", value: metrics.approvedPilots, href: "/admin/pilot-requests" },
    { label: "Organizations", value: metrics.activeOrganizations, href: "/admin/organizations" },
    { label: "Pending email", value: metrics.pendingEmails, href: "/admin/email" },
    { label: "Failed email", value: metrics.failedEmails, href: "/admin/email?tab=failed" },
    { label: "Bounced email", value: metrics.bouncedEmails, href: "/admin/email?tab=bounced" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] text-white" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
            Overview
          </h1>
          <p className="mt-2 text-[14px] text-white/65">
            Live operational counts from Supabase.
          </p>
        </div>
        <Link
          href="/admin/pilot-requests"
          className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Open pilot requests
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11] px-4 py-4 transition-colors hover:border-white/20 hover:bg-[#0D1017]"
          >
            <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-white/60">
              {card.label}
            </p>
            <p className="mt-2 text-[32px] tabular-nums text-white" style={{ fontWeight: 540 }}>
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.05em] text-white/60">
              Recent pilot requests
            </h2>
            <Link href="/admin/pilot-requests" className="text-[12px] text-white/70 hover:text-white">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <li className="rounded-[10px] border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-white/55">
                No requests yet. When a finance lead submits /request-pilot, it appears here.
              </li>
            ) : (
              recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/pilot-requests/${row.id}`}
                    className="flex items-start justify-between gap-3 rounded-[10px] border border-white/[0.06] px-3 py-3 text-[13px] transition-colors hover:border-white/15 hover:bg-white/[0.02]"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {row.public_reference || row.id.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 text-white/55">
                        {row.company_name || "—"} · {row.full_name || "—"}
                      </p>
                    </div>
                    <span className="shrink-0 capitalize text-white/50">{row.status}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.05em] text-white/60">
              Requires attention
            </h2>
            <Link href="/admin/email" className="text-[12px] text-white/70 hover:text-white">
              Email center
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {failedEmails.length === 0 ? (
              <li className="rounded-[10px] border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-white/55">
                No failed email deliveries.
              </li>
            ) : (
              failedEmails.map((row) => (
                <li
                  key={row.id}
                  className="rounded-[10px] border border-white/[0.06] px-3 py-3 text-[13px]"
                >
                  <p className="font-medium text-white">{row.recipient_email}</p>
                  <p className="mt-0.5 text-white/55">
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
