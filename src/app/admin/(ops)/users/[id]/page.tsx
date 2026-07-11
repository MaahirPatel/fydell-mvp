import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import UserAdminActions from "@/components/admin/UserAdminActions";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: userData, error } = await admin.auth.admin.getUserById(id);
  if (error || !userData.user) notFound();
  const user = userData.user;

  const [{ data: roles }, { data: profile }, { data: memberships }, { data: invitations }, { data: audits }] =
    await Promise.all([
      admin
        .from("platform_user_roles")
        .select("id, role, is_active, granted_at")
        .eq("user_id", id)
        .order("granted_at", { ascending: false }),
      admin.from("profiles").select("*").eq("id", id).maybeSingle(),
      admin
        .from("organization_members")
        .select("id, role, status, organization_id, organizations(name, slug)")
        .eq("user_id", id),
      admin
        .from("invitations")
        .select("id, invitation_type, status, organization_id, created_at, last_sent_at")
        .eq("email", (user.email || "").toLowerCase())
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("audit_logs")
        .select("id, action, entity_type, created_at")
        .or(`actor_user_id.eq.${id},entity_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const activeRoles = (roles || []).filter((r) => r.is_active).map((r) => r.role);

  return (
    <div>
      <Link href="/admin/users" className="text-[13px] text-[rgba(244,245,247,0.62)]">
        ← Users
      </Link>
      <h1 className="mt-4 text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        {profile?.full_name || user.user_metadata?.full_name || user.email}
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">{user.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5 text-[13px]">
          <h2 className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Account
          </h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Email verified</dt>
              <dd>{user.email_confirmed_at ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Account status</dt>
              <dd className="capitalize">{profile?.account_status || "active"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Platform roles</dt>
              <dd>{activeRoles.join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Last sign-in</dt>
              <dd className="tabular-nums">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[rgba(244,245,247,0.4)]">Created</dt>
              <dd className="tabular-nums">
                {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
          <h2 className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
            Actions
          </h2>
          <div className="mt-4">
            <UserAdminActions
              userId={id}
              email={user.email || ""}
              accountStatus={profile?.account_status || "active"}
              activeRoles={activeRoles}
            />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Memberships
        </h2>
        <ul className="mt-4 space-y-2 text-[13px]">
          {(memberships || []).length === 0 ? (
            <li className="text-[rgba(244,245,247,0.5)]">No organization memberships.</li>
          ) : (
            (memberships || []).map((m) => (
              <li key={m.id} className="flex justify-between border-b border-white/[0.05] pb-2">
                <span>
                  {(m.organizations as { name?: string } | null)?.name || m.organization_id}
                </span>
                <span className="capitalize text-[rgba(244,245,247,0.55)]">
                  {m.role} · {m.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Invitations
        </h2>
        <ul className="mt-4 space-y-2 text-[13px]">
          {(invitations || []).length === 0 ? (
            <li className="text-[rgba(244,245,247,0.5)]">No invitations.</li>
          ) : (
            (invitations || []).map((inv) => (
              <li key={inv.id} className="flex justify-between border-b border-white/[0.05] pb-2">
                <span>{inv.invitation_type}</span>
                <span className="capitalize text-[rgba(244,245,247,0.55)]">{inv.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5">
        <h2 className="text-[11px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Related audit
        </h2>
        <ul className="mt-4 space-y-2 text-[13px]">
          {(audits || []).length === 0 ? (
            <li className="text-[rgba(244,245,247,0.5)]">No audit events.</li>
          ) : (
            (audits || []).map((a) => (
              <li key={a.id} className="flex justify-between border-b border-white/[0.05] pb-2">
                <span>
                  {a.action} · {a.entity_type}
                </span>
                <span className="tabular-nums text-[rgba(244,245,247,0.45)]">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
