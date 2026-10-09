import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const RESPONSE_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = {
  id: string;
  request_type: string;
  status: string;
  contact_email: string | null;
  details: { scope?: string; organization_name?: string; source?: string; interrupted?: boolean } | null;
  received_at: string;
  fulfilled_at: string | null;
};

const OPEN = new Set(["received", "identity_verified", "tracing", "fulfilling"]);

function subject(row: Row): string {
  if (row.details?.scope === "workspace") return `Workspace: ${row.details.organization_name ?? "unnamed"}`;
  return "Account";
}

function due(row: Row): { label: string; overdue: boolean } {
  if (!OPEN.has(row.status)) return { label: row.fulfilled_at ? `Closed ${new Date(row.fulfilled_at).toLocaleDateString()}` : "Closed", overdue: false };
  const left = Math.ceil((new Date(row.received_at).getTime() + RESPONSE_DAYS * DAY_MS - Date.now()) / DAY_MS);
  return left < 0 ? { label: `${-left} days overdue`, overdue: true } : { label: `${left} days left`, overdue: false };
}

export default async function AdminDataRequestsPage() {
  let rows: Row[] = [];
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("data_subject_requests")
      .select("id, request_type, status, contact_email, details, received_at, fulfilled_at")
      .order("received_at", { ascending: false })
      .limit(200);
    rows = (data ?? []) as Row[];
  }
  const open = rows.filter((r) => OPEN.has(r.status));

  return (
    <div>
      <h1 className="text-app-page" style={{ fontWeight: 500, letterSpacing: "-0.035em" }}>
        Data requests
      </h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        Deletion, export and correction requests. Answer each within {RESPONSE_DAYS} days of receipt. Self-service account deletions close on their own;
        workspace deletions and interrupted deletions need someone to confirm and finish them. {open.length} open.
      </p>

      <div className="mt-8 overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-app-meta">
          <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] text-app-meta font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  No data requests yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const d = due(row);
                return (
                  <tr key={row.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{new Date(row.received_at).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">
                      {row.request_type}
                      {row.details?.interrupted ? <span className="text-[var(--text-secondary)]"> · interrupted</span> : null}
                    </td>
                    <td className="px-4 py-3">{subject(row)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.contact_email ?? "Signed-in request"}</td>
                    <td className="px-4 py-3 capitalize">{row.status.replaceAll("_", " ")}</td>
                    <td className={`px-4 py-3 tabular-nums ${d.overdue ? "font-medium text-[var(--fy-red-ink)]" : "text-[var(--text-secondary)]"}`}>{d.label}</td>
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
