import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  let rows: Array<{
    id: string;
    actor_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("audit_logs")
      .select("id, actor_email, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = data || [];
  }

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Audit log
      </h1>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        Append-only operational history. Secrets are never stored.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] text-[12px] font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  No audit events yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border-subtle)]">
                  <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{row.actor_email || "-"}</td>
                  <td className="px-4 py-3">{row.action}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {row.entity_type}
                    {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
