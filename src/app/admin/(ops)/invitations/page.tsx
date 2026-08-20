import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import InvitationActions from "@/components/admin/InvitationActions";

export const dynamic = "force-dynamic";

async function loadInvitations() {
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

  // Read alongside the query so every row is judged against the same instant.
  return { rows, now: Date.now() };
}

export default async function AdminInvitationsPage() {
  const { rows, now } = await loadInvitations();

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Invitations
      </h1>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        Application invitation tracking. Auth tokens are never stored or shown.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] text-[12px] font-medium text-[var(--text-secondary)]">
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
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  No invitations yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expired = Boolean(
                  row.expires_at && new Date(row.expires_at).getTime() < now
                );
                return (
                  <tr key={row.id} className="border-b border-[var(--border-subtle)]">
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.invitation_type}</td>
                    <td className="px-4 py-3">{row.organization_role || "-"}</td>
                    <td className="px-4 py-3 capitalize">
                      {expired && row.status === "pending" ? "expired" : row.status}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                      {row.last_sent_at
                        ? new Date(row.last_sent_at).toLocaleString()
                        : "-"}
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
