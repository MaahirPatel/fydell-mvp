import Link from "next/link";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!isSupabaseConfigured()) {
    return <p className="text-[14px] text-[rgba(244,245,247,0.62)]">Supabase is not configured.</p>;
  }

  const admin = getSupabaseAdmin();
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = (listed?.users || []) as Array<{
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    last_sign_in_at?: string | null;
    created_at?: string;
    user_metadata?: { full_name?: string };
  }>;

  const ids = users.map((u) => u.id);
  const [{ data: roles }, { data: profiles }, { data: memberships }] = await Promise.all([
    ids.length
      ? admin
          .from("platform_user_roles")
          .select("user_id, role")
          .in("user_id", ids)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as Array<{ user_id: string; role: string }> }),
    ids.length
      ? admin.from("profiles").select("id, email, full_name, username, account_status, organization_id")
          .in("id", ids)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ids.length
      ? admin
          .from("organization_members")
          .select("user_id, organization_id, role, status, organizations(name)")
          .in("user_id", ids)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const roleMap = new Map<string, string[]>();
  for (const row of roles || []) {
    const list = roleMap.get(row.user_id) || [];
    list.push(row.role);
    roleMap.set(row.user_id, list);
  }
  const profileMap = new Map<string, Record<string, unknown>>();
  for (const p of profiles || []) {
    profileMap.set(String(p.id), p as Record<string, unknown>);
  }
  const memberMap = new Map<string, string[]>();
  for (const row of memberships || []) {
    const uid = String(row.user_id);
    const orgName =
      row.organizations && typeof row.organizations === "object" && "name" in (row.organizations as object)
        ? String((row.organizations as { name?: string }).name || "")
        : String(row.organization_id || "");
    const list = memberMap.get(uid) || [];
    list.push(`${orgName} (${row.role})`);
    memberMap.set(uid, list);
  }

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Users
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Auth accounts with platform roles and organization membership. Passwords are never visible.
      </p>

      <div className="mt-8 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.095)]">
        <table className="min-w-full text-left text-[13px]">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Platform role</th>
              <th className="px-4 py-3">Organizations</th>
              <th className="px-4 py-3">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[rgba(244,245,247,0.5)]">
                  No Auth users yet. Run the bootstrap script for admin@fydell.com.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const profile = profileMap.get(user.id);
                const name =
                  (typeof profile?.full_name === "string" && profile.full_name) ||
                  user.user_metadata?.full_name ||
                  (typeof profile?.username === "string" && profile.username) ||
                  "—";
                return (
                  <tr key={user.id} className="border-b border-white/[0.05]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-[#F4F5F7] hover:underline"
                        style={{ fontWeight: 520 }}
                      >
                        {name}
                      </Link>
                      <div className="text-[12px] text-[rgba(244,245,247,0.45)]">
                        {user.email}
                        {user.email_confirmed_at ? "" : " · unverified"}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {typeof profile?.account_status === "string"
                        ? profile.account_status
                        : "active"}
                    </td>
                    <td className="px-4 py-3">
                      {(roleMap.get(user.id) || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-[rgba(244,245,247,0.62)]">
                      {(memberMap.get(user.id) || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[rgba(244,245,247,0.55)]">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString()
                        : "—"}
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
