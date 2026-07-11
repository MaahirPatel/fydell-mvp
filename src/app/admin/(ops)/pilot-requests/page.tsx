import Link from "next/link";
import { listPilotRequests } from "@/lib/ops/pilot-requests";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  new: "text-[#6B75FF]",
  reviewing: "text-[#C4A8FF]",
  contacted: "text-[#3ABFD2]",
  qualified: "text-[#3ABFD2]",
  approved: "text-[#67D9A0]",
  needs_information: "text-[#E9B949]",
  rejected: "text-[#F26B82]",
  archived: "text-[rgba(244,245,247,0.4)]",
};

export default async function AdminPilotRequestsPage() {
  const rows = await listPilotRequests(200);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
          Pilot requests
        </h1>
        <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
          Durable inbound requests from fydell.com. Success only after database confirmation.
        </p>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.095)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[rgba(244,245,247,0.5)]">
                    No pilot requests yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[rgba(255,255,255,0.05)] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pilot-requests/${row.id}`}
                        className="tabular-nums text-[#F4F5F7] hover:underline"
                        style={{ fontWeight: 520 }}
                      >
                        {row.public_reference || row.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[rgba(244,245,247,0.62)]">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.full_name}</div>
                      <div className="text-[12px] text-[rgba(244,245,247,0.4)]">{row.work_email}</div>
                    </td>
                    <td className="px-4 py-3">{row.company_name}</td>
                    <td className="px-4 py-3">{row.role_being_hired}</td>
                    <td
                      className={`px-4 py-3 capitalize ${STATUS_STYLE[row.status] || "text-[rgba(244,245,247,0.62)]"}`}
                    >
                      {row.status}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[rgba(244,245,247,0.5)]">
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
