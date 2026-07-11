import Link from "next/link";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/AdminUi";
import { listPilotRequests } from "@/lib/ops/pilot-requests";

export const dynamic = "force-dynamic";

export default async function AdminPilotRequestsPage() {
  const rows = await listPilotRequests(200);

  return (
    <div>
      <AdminPageHeader
        title="Pilot requests"
        description="Inbound requests from fydell.com. A request only appears after the database confirms it."
      />

      <div className="mt-8 overflow-hidden rounded-[16px] border border-white/[0.1] bg-[#0A0C11]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-white/[0.08] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-white/40">
              <tr>
                <th className="px-4 py-3.5 font-medium">Reference</th>
                <th className="px-4 py-3.5 font-medium">Submitted</th>
                <th className="px-4 py-3.5 font-medium">Contact</th>
                <th className="px-4 py-3.5 font-medium">Company</th>
                <th className="px-4 py-3.5 font-medium">Role</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-4 py-3.5 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4">
                    <AdminEmpty>
                      No pilot requests yet. Submit one from{" "}
                      <Link href="/request-pilot" className="text-white/80 underline">
                        /request-pilot
                      </Link>{" "}
                      to verify the loop.
                    </AdminEmpty>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/pilot-requests/${row.id}`}
                        className="tabular-nums text-white hover:underline"
                        style={{ fontWeight: 540 }}
                      >
                        {row.public_reference || row.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-white/55">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-white">{row.full_name}</div>
                      <div className="text-[12px] text-white/40">{row.work_email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-white/80">{row.company_name}</td>
                    <td className="px-4 py-3.5 text-white/70">{row.role_being_hired}</td>
                    <td className="px-4 py-3.5">
                      <AdminStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/45">
                      ack {row.acknowledgment_email_status || "—"}
                      <br />
                      admin {row.admin_notification_status || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
