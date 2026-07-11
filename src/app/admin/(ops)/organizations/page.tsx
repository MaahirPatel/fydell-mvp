import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  let rows: Array<{
    id: string;
    name: string;
    slug: string | null;
    status: string | null;
    pilot_stage: string | null;
    owner_email: string | null;
    created_at: string;
  }> = [];

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("organizations")
      .select("id, name, slug, status, pilot_stage, owner_email, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = data || [];
  }

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Organizations
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Workspaces created from approved pilot requests.
      </p>

      <div className="mt-8 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.095)]">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pilot stage</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[rgba(244,245,247,0.5)]">
                  No organizations yet. Approve a pilot request to create one.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.05]">
                  <td className="px-4 py-3">
                    <div style={{ fontWeight: 520 }}>{row.name}</div>
                    <div className="text-[12px] text-[rgba(244,245,247,0.4)]">{row.slug || "—"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{row.status || "—"}</td>
                  <td className="px-4 py-3 capitalize">{row.pilot_stage || "—"}</td>
                  <td className="px-4 py-3">{row.owner_email || "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-[rgba(244,245,247,0.55)]">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-[rgba(244,245,247,0.4)]">
        Tip: open a{" "}
        <Link href="/admin/pilot-requests" className="underline">
          pilot request
        </Link>{" "}
        and use Approve pilot.
      </p>
    </div>
  );
}
