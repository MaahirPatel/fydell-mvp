import Link from "next/link";
import {
  AdminEmpty,
  AdminMetricCard,
  AdminPageHeader,
  AdminPanel,
  AdminPrimaryButton,
  AdminStatusBadge,
  AdminTextLink,
} from "@/components/admin/AdminUi";
import { getOpsMetrics } from "@/lib/ops/metrics";
import { listPilotRequests } from "@/lib/ops/pilot-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const metrics = await getOpsMetrics();
  const recent = await listPilotRequests(8);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

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
    {
      label: "New requests",
      value: metrics.newPilotRequests,
      href: "/admin/pilot-requests",
      hint: "Needs triage",
    },
    {
      label: "Unassigned",
      value: metrics.unassignedPilotRequests,
      href: "/admin/pilot-requests",
      hint: "No owner yet",
    },
    {
      label: "Awaiting contact",
      value: metrics.awaitingContact,
      href: "/admin/pilot-requests",
      hint: "Follow up",
    },
    {
      label: "Approved pilots",
      value: metrics.approvedPilots,
      href: "/admin/pilot-requests",
      hint: "Ready to invite",
    },
    {
      label: "Organizations",
      value: metrics.activeOrganizations,
      href: "/admin/organizations",
      hint: "Active workspaces",
    },
    {
      label: "Pending email",
      value: metrics.pendingEmails,
      href: "/admin/email",
      hint: "In outbox",
    },
    {
      label: "Failed email",
      value: metrics.failedEmails,
      href: "/admin/email?tab=failed",
      hint: "Needs retry",
    },
    {
      label: "Bounced email",
      value: metrics.bouncedEmails,
      href: "/admin/email?tab=bounced",
      hint: "Bad addresses",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Live operational counts from Supabase — what to act on before pilots start landing."
        action={
          <AdminPrimaryButton href="/admin/pilot-requests">
            Open pilot requests
          </AdminPrimaryButton>
        }
      />

      {!emailConfigured ? (
        <div className="mt-6 rounded-[12px] border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-[13px] text-[#FCD34D]">
          Email provider is not configured yet (`RESEND_API_KEY` missing). Pilot
          acknowledgements and admin alerts will stay queued until Resend is
          connected in Vercel.
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <AdminMetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Recent pilot requests"
          action={<AdminTextLink href="/admin/pilot-requests">View all</AdminTextLink>}
        >
          {recent.length === 0 ? (
            <AdminEmpty>
              No requests yet. When a finance lead submits{" "}
              <Link href="/request-pilot" className="text-white/80 underline">
                /request-pilot
              </Link>
              , it appears here with a FYD reference.
            </AdminEmpty>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/pilot-requests/${row.id}`}
                    className="flex items-start justify-between gap-3 rounded-[12px] border border-white/[0.06] px-3.5 py-3 text-[13px] transition-colors hover:border-white/15 hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {row.public_reference || row.id.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 truncate text-white/50">
                        {row.company_name || "—"} · {row.full_name || "—"}
                      </p>
                    </div>
                    <AdminStatusBadge status={row.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Requires attention"
          action={<AdminTextLink href="/admin/email">Email center</AdminTextLink>}
        >
          {failedEmails.length === 0 ? (
            <AdminEmpty>No failed email deliveries.</AdminEmpty>
          ) : (
            <ul className="space-y-2.5">
              {failedEmails.map((row) => (
                <li
                  key={row.id}
                  className="rounded-[12px] border border-white/[0.06] px-3.5 py-3 text-[13px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {row.recipient_email}
                      </p>
                      <p className="mt-0.5 text-white/50">
                        {row.template_key}
                        {row.last_error ? ` · ${row.last_error}` : ""}
                      </p>
                    </div>
                    <AdminStatusBadge status="failed" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
