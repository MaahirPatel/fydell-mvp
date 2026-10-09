import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Status, type StatusKind } from "@/components/ui/report";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import { getOwnerPassport } from "@/lib/passport/store";
import type { PassportProject } from "@/lib/passport/view";
import type { AttemptRow, AttemptStatus, InvitationRow } from "@/lib/eng/types";
import { LocalDate } from "@/components/eng/LocalTime";
import s from "@/components/candidate/candidate.module.css";

export const metadata = { title: "Overview" };
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

function day(iso: string | null | undefined): React.ReactNode {
  if (!iso) return "Not recorded";
  return <LocalDate iso={iso} />;
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
  date: React.ReactNode;
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

const PROJECT_STATUS: Record<"complete" | "partial" | "failed", { label: string; kind: StatusKind }> = {
  complete: { label: "Report ready", kind: "success" },
  partial: { label: "Partial report", kind: "attention" },
  failed: { label: "Import failed", kind: "neutral" },
};

const RECENT_PROJECTS = 3;

function ProjectsSection({ projects }: { projects: PassportProject[] }) {
  const recent = projects
    .filter((p): p is PassportProject & { id: string; status: "complete" | "partial" | "failed" } => Boolean(p.id) && p.status !== "stale")
    .sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt));
  if (recent.length === 0) return null;
  return (
    <section className={s.section} aria-labelledby="home-projects">
      <div className={s.sectionHead}>
        <h2 id="home-projects" className={s.sectionTitle}>
          Your projects
        </h2>
        <span className={s.sectionCount}>{recent.length}</span>
        <span className="ml-auto flex items-center gap-4 text-app-meta font-medium">
          <Link href="/app/candidate/work-record" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline hover:underline-offset-4">
            All projects
          </Link>
          <Link href="/app/candidate/work-record/preview" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline hover:underline-offset-4">
            Preview what you share
          </Link>
        </span>
      </div>
      <ul>
        {recent.slice(0, RECENT_PROJECTS).map((p) => {
          const st = PROJECT_STATUS[p.status];
          const name = p.repoFullName.split("/").pop() ?? p.repoFullName;
          return (
            <li key={p.id} className="border-t border-[var(--border-subtle)] first:border-t-0">
              <Link
                href={`/app/candidate/projects/${p.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[6px] px-3 py-3 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-app-control font-medium text-[var(--text-primary)]">{name}</span>
                  <span className="block truncate text-app-meta text-[var(--text-tertiary)]">
                    {p.evidence.length} finding{p.evidence.length === 1 ? "" : "s"}
                    {p.primaryLanguage ? ` · ${p.primaryLanguage}` : ""} · Analyzed <LocalDate iso={p.analyzedAt} />
                  </span>
                </span>
                <Status kind={st.kind}>{st.label}</Status>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--text-tertiary)] sm:block" strokeWidth={1.75} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
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
  const [{ data: invitations }, { data: sessions }, { data: credentials }, { data: engInvites }, { data: engAttempts }, passport] =
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
      getOwnerPassport(user.id).catch(() => null),
    ]);
  const hasProjects = (passport?.projects ?? []).some((p) => p.status !== "stale");

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
      <CandidatePageHead title="Overview" lead="What needs your attention, your recent projects, and the evaluations hiring teams have invited you to." />

      <div className="mt-6 grid gap-8">
        <div className="grid gap-6">
          {empty && !hasProjects ? (
            <EmptyState
              title="Start with a project"
              description="Add a repository you built and Fydell writes its Builder Report. Your projects are what hiring teams see first, and evaluations you are invited to appear here."
              action={
                <ButtonLink href="/app/candidate/work-record#add-repository" variant="primary" size="sm">
                  Add a project
                </ButtonLink>
              }
            />
          ) : null}
          {empty && hasProjects ? (
            <EmptyState
              title="No invitations yet"
              description="Evaluations are invite-only. When a hiring team invites you, the task appears here with its deadline and next step. Until then, your projects are what teams see first."
              action={
                <ButtonLink href="/app/candidate/work-record" variant="primary" size="sm">
                  View your projects
                </ButtonLink>
              }
              secondary={
                <a href="/simulations" className="text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                  See an example task
                </a>
              }
            />
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

            <ProjectsSection projects={passport?.projects ?? []} />

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

        <div className="border-t border-[var(--border-subtle)]">
          <details className="group border-b border-[var(--border-subtle)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-[14px] font-medium text-[var(--text-primary)]">
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
              How an evaluation works
            </summary>
            <ol className="grid gap-x-8 gap-y-4 pb-6 pl-6 sm:grid-cols-2 lg:grid-cols-5">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step.title}>
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                    <span className="tabular-nums text-[var(--text-tertiary)]">{i + 1}.</span> {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </details>
          <p className="py-3 text-[13px] text-[var(--text-secondary)]">
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
