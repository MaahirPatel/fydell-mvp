import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { StatusTag } from "@/components/ui/StatusTag";

export const metadata = { title: "Your evaluations | Fydell" };
export const dynamic = "force-dynamic";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[13px] font-medium text-[var(--text-tertiary)]">{title}</h2>
      <Surface tone="panel" className="mt-2.5 overflow-hidden">
        <ul className="divide-y divide-[var(--border-subtle)]">{children}</ul>
      </Surface>
    </section>
  );
}

function Row({
  title,
  detail,
  action,
  tag,
}: {
  title: React.ReactNode;
  detail: React.ReactNode;
  action?: React.ReactNode;
  tag?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-medium text-[var(--text-primary)]">{title}</p>
          {tag}
        </div>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-tertiary)]">
          {detail}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export default async function CandidateHomePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate")}`);

  const admin = createAdminSupabaseClient();
  const [{ data: invitations }, { data: sessions }, { data: credentials }] =
    await Promise.all([
      admin
        .from("sim_invitations")
        .select(
          "id, status, expires_at, created_at, organizations(name), sim_templates(title, role_key)"
        )
        .eq("candidate_email", user.email.toLowerCase())
        .in("status", ["sent", "opened"])
        .order("created_at", { ascending: false }),
      admin
        .from("sim_sessions")
        .select(
          "id, status, started_at, submitted_at, created_at, organizations(name), sim_templates(title, role_key)"
        )
        .eq("candidate_user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("sim_credentials")
        .select("id, credential_number, status, issued_at, session_id")
        .eq("candidate_user_id", user.id)
        .order("issued_at", { ascending: false }),
    ]);

  const pendingInvites = invitations || [];
  const allSessions = sessions || [];
  const active = allSessions.filter(
    (s) => s.status === "accepted" || s.status === "active"
  );
  const completed = allSessions.filter(
    (s) => !["accepted", "active"].includes(s.status)
  );

  // The receipt belongs to a session, so it belongs on that session's row. A
  // separate list of bare numbers told a candidate nothing and led nowhere.
  const receiptBySession = new Map(
    (credentials || []).map((c) => [c.session_id as string, c])
  );

  const roleTitle = (rk?: string | null) =>
    (rk && ROLE_BY_KEY[rk as RoleKey]?.title) || rk || "";

  const empty =
    pendingInvites.length === 0 && allSessions.length === 0;

  return (
    <CandidateShell>
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
        Your evaluations
      </h1>
      <p className="mt-2 max-w-[62ch] text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
        Everything a company has invited you to, and the work you have already
        submitted. Your results stay here and stay yours.
      </p>

      <div className="mt-8 space-y-7">
        {empty ? (
          <Surface tone="panel" className="px-5 py-7">
            <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
              Nothing here yet
            </p>
            <p className="mt-2 max-w-[58ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
              When a company invites you to an evaluation, it appears here. You
              cannot start one on your own from this page; an invitation always
              comes from the company that wants to see your work.
            </p>
            <p className="mt-4 text-[13.5px]">
              <Link
                href="/simulations"
                className="text-[var(--text-primary)] underline underline-offset-2"
              >
                See what an evaluation involves
              </Link>
            </p>
          </Surface>
        ) : null}

        {active.length > 0 ? (
          <Section title="Waiting on you">
            {active.map((s) => {
              const t = s.sim_templates as { title?: string; role_key?: string } | null;
              const o = s.organizations as { name?: string } | null;
              const running = s.status === "active";
              return (
                <Row
                  key={s.id}
                  title={t?.title}
                  tag={
                    <StatusTag tone={running ? "changed" : "active"}>
                      {running ? "Timer running" : "Not started"}
                    </StatusTag>
                  }
                  detail={`${roleTitle(t?.role_key)} · ${o?.name}`}
                  action={
                    <ButtonLink href={`/sim/${s.id}`} variant="primary" size="sm">
                      {running ? "Resume" : "Begin"}
                    </ButtonLink>
                  }
                />
              );
            })}
          </Section>
        ) : null}

        {pendingInvites.length > 0 ? (
          <Section title="Invitations">
            {pendingInvites.map((inv) => {
              const t = inv.sim_templates as { title?: string; role_key?: string } | null;
              const o = inv.organizations as { name?: string } | null;
              return (
                <Row
                  key={inv.id}
                  title={t?.title}
                  detail={`${roleTitle(t?.role_key)} · from ${o?.name} · expires ${new Date(
                    inv.expires_at
                  ).toLocaleDateString()}`}
                  action={
                    <span className="text-[12.5px] text-[var(--text-tertiary)]">
                      Open the link in your email to accept
                    </span>
                  }
                />
              );
            })}
          </Section>
        ) : null}

        {completed.length > 0 ? (
          <Section title="Submitted">
            {completed.map((s) => {
              const t = s.sim_templates as { title?: string; role_key?: string } | null;
              const o = s.organizations as { name?: string } | null;
              const receipt = receiptBySession.get(s.id);
              const scoring = s.status === "submitted";
              return (
                <Row
                  key={s.id}
                  title={t?.title}
                  tag={
                    scoring ? <StatusTag tone="active">Being scored</StatusTag> : null
                  }
                  detail={
                    <>
                      {roleTitle(t?.role_key)} · {o?.name} · submitted{" "}
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleDateString()
                        : "recently"}
                      {receipt ? (
                        <>
                          {" · receipt "}
                          <span className="tabular-nums">
                            {receipt.credential_number}
                          </span>
                          {receipt.status === "revoked" ? " (revoked)" : null}
                        </>
                      ) : null}
                    </>
                  }
                  action={
                    <ButtonLink
                      href={`/sim/${s.id}/result`}
                      variant="secondary"
                      size="sm"
                    >
                      {scoring ? "Check progress" : "Open result"}
                    </ButtonLink>
                  }
                />
              );
            })}
          </Section>
        ) : null}
      </div>
    </CandidateShell>
  );
}
