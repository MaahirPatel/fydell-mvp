import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import InvitationActions from "@/components/admin/InvitationActions";

export const dynamic = "force-dynamic";

export default async function AdminInvitationsPage() {
  let rows: Array<{
    id: string;
    email: string;
    invitation_type: string;
    organization_id: string | null;
    organization_role: string | null;
    status: string;
    send_count: number;
    last_sent_at: string | null;
    expires_at: string | null;
    accepted_at: string | null;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("invitations")
      .select(
        "id, email, invitation_type, organization_id, organization_role, status, send_count, last_sent_at, expires_at, accepted_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    rows = data || [];
  }

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Invitations
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Application invitation tracking. Auth tokens are never stored or shown.
      </p>

      <div className="mt-8 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.095)]">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[rgba(244,245,247,0.5)]">
                  No invitations yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expired =
                  row.expires_at && new Date(row.expires_at).getTime() < Date.now()
                    ? true
                    : false;
                return (
                  <tr key={row.id} className="border-b border-white/[0.05]">
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.invitation_type}</td>
                    <td className="px-4 py-3">{row.organization_role || "—"}</td>
                    <td className="px-4 py-3 capitalize">
                      {expired && row.status === "pending" ? "expired" : row.status}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[rgba(244,245,247,0.55)]">
                      {row.last_sent_at
                        ? new Date(row.last_sent_at).toLocaleString()
                        : "—"}
                      <div className="text-[11px]">count {row.send_count}</div>
                    </td>
                    <td className="px-4 py-3">
                      <InvitationActions id={row.id} status={row.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
