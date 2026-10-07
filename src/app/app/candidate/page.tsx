import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { ButtonLink } from "@/components/ui/Button";
import { Status, type StatusKind } from "@/components/ui/report";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import type { AttemptRow, AttemptStatus, InvitationRow } from "@/lib/eng/types";
import s from "@/components/candidate/candidate.module.css";

export const metadata = { title: "Your evaluations" };
export const dynamic = "force-dynamic";

type Tone = "blue" | "amber" | "green" | "neutral";

/** Index into the five-stage journey: invitation, setup, work, submit, review. */
const ENG_STAGE: Record<AttemptStatus, { label: string; tone: Tone; stage: number | null; action: string }> = {
  accepted: { label: "Setup not finished", tone: "blue", stage: 1, action: "Continue setup" },
  preflight_passed: { label: "Ready to start", tone: "blue", stage: 2, action: "Start task" },
  in_progress: { label: "Timer running", tone: "amber", stage: 2, action: "Return to task" },
  submitted: { label: "With the hiring team", tone: "green", stage: 4, action: "View receipt" },
  withdrawn: { label: "Withdrawn", tone: "neutral", stage: null, action: "View" },
  expired: { label: "Expired", tone: "neutral", stage: null, action: "View" },
};

function day(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TONE_KIND: Record<Tone, StatusKind> = { blue: "pending", amber: "attention", green: "success", neutral: "neutral" };

function Table({ title, count, dateHeading, children }: { title: string; count: number; dateHeading: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>{title}</h2>
        <span className={s.sectionCount}>{count}</span>
      </div>
      <div className={s.table}>
        <div className={s.tableHead} aria-hidden>
          <span>Evaluation</span>
          <span>Status</span>
          <span>{dateHeading}</span>
          <span />
        </div>
        <ul>{children}</ul>
      </div>
    </section>
  );
}

function Row({
  title,
  sub,
  status,
  tone,
  stage,
  dateLabel,
  date,
  action,
}: {
  title: string;
  sub: string;
  status: string;
  tone: Tone;
  stage?: number | null;
  dateLabel: string;
  date: string;
  action: React.ReactNode;
}) {
  return (
    <li className={s.row}>
      <div className="min-w-0">
        <p className={s.rowTitle}>{title}</p>
        <p className={s.rowSub}>{sub}</p>
      </div>
      <div className={s.status}>
        <Status kind={TONE_KIND[tone]} className="justify-self-start">
          {status}
        </Status>
        {typeof stage === "number" ? <span className="text-[13px] text-[var(--text-tertiary)]">Step {stage + 1} of 5</span> : null}
      </div>
      <div className={s.date}>
        <span className={s.dateLabel}>{dateLabel}</span>
        <span>{date}</span>
      </div>
      <div className={s.rowAction}>{action}</div>
    </li>
  );
}

const HOW_IT_WORKS = [
  { title: "Accept the invitation", body: "A hiring team sends it. You cannot start one on your own." },
  { title: "Set up, untimed", body: "Download the project and run one setup check." },
  { title: "Do the work", body: "A timed task in your own editor, with a simulated team." },
  { title: "Submit", body: "Upload your project as a ZIP with a short handoff." },
  { title: "Review", body: "The hiring team reads the results and contacts you." },
];

export default async function CandidateHomePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate")}`);

  const admin = createAdminSupabaseClient();
  const [{ data: invitations }, { data: sessions }, { data: credentials }, { data: engInvites }, { data: engAttempts }] =
    await Promise.all([
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
        .select("id, credential_number, status, issued_at, session_id")
        .eq("candidate_user_id", user.id)
        .order("issued_at", { ascending: false }),
      admin
        .from("eng_invitations")
        .select("id, status, expires_at, role_snapshot")
        .eq("candidate_email", user.email.toLowerCase())
        .in("status", ["invited", "accepted"])
        .order("created_at", { ascending: false }),
      admin.from("eng_attempts").select("id, invitation_id, status, submitted_at").eq("candidate_user_id", user.id),
    ]);

  const engAttemptByInvite = new Map(
    ((engAttempts ?? []) as Pick<AttemptRow, "id" | "invitation_id" | "status" | "submitted_at">[]).map((a) => [a.invitation_id, a])
  );
  const engTasks = ((engInvites ?? []) as Pick<InvitationRow, "id" | "status" | "expires_at" | "role_snapshot">[]).map((inv) => ({
    invitation: inv,
    attempt: engAttemptByInvite.get(inv.id) ?? null,
  }));

  const pendingInvites = invitations || [];
  const allSessions = sessions || [];
  const active = allSessions.filter((x) => x.status === "accepted" || x.status === "active");
  const completed = allSessions.filter((x) => !["accepted", "active"].includes(x.status));

  // The receipt belongs to a session, so it belongs on that session's row. A
  // separate list of bare numbers told a candidate nothing and led nowhere.
  const receiptBySession = new Map((credentials || []).map((c) => [c.session_id as string, c]));

  const roleTitle = (rk?: string | null) => (rk && ROLE_BY_KEY[rk as RoleKey]?.title) || rk || "";

  const engOpen = engTasks.filter((t) => t.attempt?.status !== "submitted");
  const engDone = engTasks.filter((t) => t.attempt?.status === "submitted");
  const waiting = engOpen.length + active.length + pendingInvites.length;
  const submitted = engDone.length + completed.length;
  const empty = pendingInvites.length === 0 && allSessions.length === 0 && engTasks.length === 0;

  return (
    <CandidateShell width="wide" current="assessments">
      <CandidatePageHead title="Evaluations" lead={empty ? undefined : "Tasks hiring teams have invited you to, with each one's deadline and next step."} />

      <div className="mt-8 grid gap-10">
        <div className="grid gap-10">
          {empty ? (
            <section className="py-4">
              <h2 className="text-[19px] font-semibold tracking-[-0.014em]">No invitations yet</h2>
              <p className="mt-1.5 max-w-[56ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                Invitations from hiring teams will appear here, with the task, deadline, and next step.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/app/candidate/work-record" variant="primary" size="md">
                  Build your Passport
                </ButtonLink>
                <ButtonLink href="/simulations" variant="secondary" size="md">
                  View example task
                </ButtonLink>
              </div>
            </section>
          ) : null}

            {engOpen.length > 0 || active.length > 0 || pendingInvites.length > 0 ? (
              <Table title="Waiting on you" count={waiting} dateHeading="Deadline">
                {engOpen.map(({ invitation, attempt }) => {
                  const org = invitation.role_snapshot.organizationName;
                  if (!attempt) {
                    return (
                      <Row
                        key={invitation.id}
                        title={invitation.role_snapshot.title}
                        sub={`${org} · Engineering task`}
                        status="Invitation open"
                        tone="blue"
                        stage={0}
                        dateLabel="Invitation expires"
                        date={day(invitation.expires_at)}
                        action={
                          <ButtonLink href={`/assess/invitations/${invitation.id}`} variant="primary" size="sm">
                            Review invitation
                          </ButtonLink>
                        }
                      />
                    );
                  }
                  const st = ENG_STAGE[attempt.status];
                  return (
                    <Row
                      key={invitation.id}
                      title={invitation.role_snapshot.title}
                      sub={`${org} · Engineering task`}
                      status={st.label}
                      tone={st.tone}
                      stage={st.stage}
                      dateLabel="Invitation expires"
                      date={day(invitation.expires_at)}
                      action={
                        <ButtonLink href={`/assess/${attempt.id}`} variant="primary" size="sm">
                          {st.action}
                        </ButtonLink>
                      }
                    />
                  );
                })}
                {active.map((x) => {
                  const t = x.sim_templates as { title?: string; role_key?: string } | null;
                  const o = x.organizations as { name?: string } | null;
                  const running = x.status === "active";
                  return (
                    <Row
                      key={x.id}
                      title={t?.title ?? "Simulation"}
                      sub={[o?.name, roleTitle(t?.role_key)].filter(Boolean).join(" · ")}
                      status={running ? "Timer running" : "Not started"}
                      tone={running ? "amber" : "blue"}
                      stage={running ? 2 : 1}
                      dateLabel={running ? "Started" : "Accepted"}
                      date={day(running ? x.started_at : x.created_at)}
                      action={
                        <ButtonLink href={`/sim/${x.id}`} variant="primary" size="sm">
                          {running ? "Resume" : "Begin"}
                        </ButtonLink>
                      }
                    />
                  );
                })}
                {pendingInvites.map((inv) => {
                  const t = inv.sim_templates as { title?: string; role_key?: string } | null;
                  const o = inv.organizations as { name?: string } | null;
                  return (
                    <Row
                      key={inv.id}
                      title={t?.title ?? "Simulation"}
                      sub={[o?.name, roleTitle(t?.role_key)].filter(Boolean).join(" · ")}
                      status="Invitation sent"
                      tone="blue"
                      stage={0}
                      dateLabel="Invitation expires"
                      date={day(inv.expires_at)}
                      action={<span className={s.rowNote}>Accept from the email link</span>}
                    />
                  );
                })}
              </Table>
            ) : null}

            {submitted > 0 ? (
              <Table title="Submitted" count={submitted} dateHeading="Submitted">
                {engDone.map(({ invitation, attempt }) => (
                  <Row
                    key={invitation.id}
                    title={invitation.role_snapshot.title}
                    sub={`${invitation.role_snapshot.organizationName} · Engineering task`}
                    status="With the hiring team"
                    tone="green"
                    stage={4}
                    dateLabel="Submitted"
                    date={day(attempt?.submitted_at)}
                    action={
                      <ButtonLink href={`/assess/${attempt?.id}`} variant="secondary" size="sm">
                        View receipt
                      </ButtonLink>
                    }
                  />
                ))}
                {completed.map((x) => {
                  const t = x.sim_templates as { title?: string; role_key?: string } | null;
                  const o = x.organizations as { name?: string } | null;
                  const receipt = receiptBySession.get(x.id);
                  const scoring = x.status === "submitted";
                  const sub = [o?.name, roleTitle(t?.role_key), receipt ? `Receipt ${receipt.credential_number}${receipt.status === "revoked" ? " (revoked)" : ""}` : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Row
                      key={x.id}
                      title={t?.title ?? "Simulation"}
                      sub={sub}
                      status={scoring ? "Being scored" : "Result ready"}
                      tone={scoring ? "blue" : "green"}
                      stage={scoring ? 4 : null}
                      dateLabel="Submitted"
                      date={x.submitted_at ? day(x.submitted_at) : "Recently"}
                      action={
                        <ButtonLink href={`/sim/${x.id}/result`} variant="secondary" size="sm">
                          {scoring ? "Check progress" : "Open result"}
                        </ButtonLink>
                      }
                    />
                  );
                })}
              </Table>
            ) : null}
        </div>

        <div className="max-w-[960px] border-t border-[var(--border-default)]">
          <details className="group border-b border-[var(--border-subtle)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-[15px] font-medium text-[var(--text-primary)]">
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
              How an evaluation works
            </summary>
            <ol className="grid gap-x-8 gap-y-4 pb-6 pl-6 sm:grid-cols-2 lg:grid-cols-5">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title}>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                    <span className="tabular-nums text-[var(--text-tertiary)]">{i + 1}.</span> {step.title}
                  </p>
                  <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </details>
          <p className="py-4 text-[14px] text-[var(--text-secondary)]">
            Stuck on setup? Setup problems are never held against you.{" "}
            <a href={CONTACT_MAILTO} className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
              Email {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </CandidateShell>
  );
}
