import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";

export const metadata = { title: "Home - Fydell" };
export const dynamic = "force-dynamic";

export default async function CandidateHomePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate")}`);

  const admin = createAdminSupabaseClient();
  const [{ data: invitations }, { data: sessions }, { data: credentials }] = await Promise.all([
    admin
      .from("sim_invitations")
      .select("id, status, expires_at, created_at, organizations(name), sim_templates(title, role_key)")
      .eq("candidate_email", user.email.toLowerCase())
      .in("status", ["sent", "opened"])
      .order("created_at", { ascending: false }),
    admin
      .from("sim_sessions")
      .select("id, status, started_at, submitted_at, created_at, organizations(name), sim_templates(title, role_key)")
      .eq("candidate_user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("sim_credentials")
      .select("id, credential_number, status, issued_at, sim_sessions(sim_templates(title, role_key))")
      .eq("candidate_user_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  const pendingInvites = invitations || [];
  const allSessions = sessions || [];
  const active = allSessions.filter((s) => s.status === "accepted" || s.status === "active");
  const completed = allSessions.filter((s) => !["accepted", "active"].includes(s.status));
  const creds = credentials || [];

  const roleTitle = (rk?: string | null) =>
    (rk && ROLE_BY_KEY[rk as RoleKey]?.title) || rk || "";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your work, on record</h1>
          <p className="mt-1 text-[14px] text-slate-600">
            Simulations you&apos;re invited to, sessions in progress, and the credentials you&apos;ve earned.
          </p>
        </div>

        {pendingInvites.length === 0 && allSessions.length === 0 && creds.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-[15px] font-medium text-slate-800">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] text-slate-500">
              When an employer invites you to a work simulation, it appears here. Completed
              simulations earn portable credentials that stay yours.
            </p>
            <Link
              href="/simulations"
              className="mt-4 inline-block text-[13.5px] font-medium text-slate-900 underline underline-offset-4"
            >
              See what the simulations look like
            </Link>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <section aria-labelledby="invites-h">
            <h2 id="invites-h" className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              Invitations
            </h2>
            <div className="mt-2 space-y-2">
              {pendingInvites.map((inv) => {
                const t = inv.sim_templates as { title?: string; role_key?: string } | null;
                const o = inv.organizations as { name?: string } | null;
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-[14px] font-medium text-slate-900">{t?.title}</p>
                      <p className="text-[12.5px] text-slate-500">
                        {roleTitle(t?.role_key)} · from {o?.name} · expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-[12.5px] text-slate-500">Open the link from your email to accept</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {active.length > 0 && (
          <section aria-labelledby="active-h">
            <h2 id="active-h" className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              In progress
            </h2>
            <div className="mt-2 space-y-2">
              {active.map((s) => {
                const t = s.sim_templates as { title?: string; role_key?: string } | null;
                const o = s.organizations as { name?: string } | null;
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-[14px] font-medium text-slate-900">{t?.title}</p>
                      <p className="text-[12.5px] text-slate-500">
                        {roleTitle(t?.role_key)} · {o?.name} ·{" "}
                        {s.status === "active" ? "session running" : "ready to begin"}
                      </p>
                    </div>
                    <Link
                      href={`/sim/${s.id}`}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
                    >
                      {s.status === "active" ? "Resume" : "Begin"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {creds.length > 0 && (
          <section aria-labelledby="creds-h">
            <h2 id="creds-h" className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              Your credentials
            </h2>
            <div className="mt-2 space-y-2">
              {creds.map((c) => {
                const sess = c.sim_sessions as {
                  sim_templates?: { title?: string; role_key?: string } | null;
                } | null;
                const t = sess?.sim_templates;
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-[14px] font-medium text-slate-900">
                        {t?.title} <span className="font-mono text-[12px] text-slate-400">{c.credential_number}</span>
                      </p>
                      <p className="text-[12.5px] text-slate-500">
                        {roleTitle(t?.role_key)} · issued {new Date(c.issued_at).toLocaleDateString()}
                        {c.status === "revoked" && " · revoked"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section aria-labelledby="done-h">
            <h2 id="done-h" className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
              Completed
            </h2>
            <div className="mt-2 space-y-2">
              {completed.map((s) => {
                const t = s.sim_templates as { title?: string; role_key?: string } | null;
                const o = s.organizations as { name?: string } | null;
                return (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[14px] font-medium text-slate-900">{t?.title}</p>
                    <p className="text-[12.5px] text-slate-500">
                      {roleTitle(t?.role_key)} · {o?.name} · submitted{" "}
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
