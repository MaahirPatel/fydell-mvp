import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricStrip } from "@/components/ui/MetricStrip";
import { StatusTag } from "@/components/ui/StatusTag";
import { EmptyState } from "@/components/ui/EmptyState";
import SetupPath, { type SetupStep } from "@/components/employer/SetupPath";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
import EmployerClientAnimator from "@/components/employer/EmployerClientAnimator";
import { getEmployerCatalog } from "./_lib/catalog";
import {
  getInvitationRecords,
  getNeedsReviewRecords,
  getOverviewMetrics,
  getReportRecords,
} from "./_lib/data";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-[13px] text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function RowList({
  rows,
}: {
  rows: {
    key: string;
    primary: string;
    secondary: string;
    href: string;
    action: string;
  }[];
}) {
  return (
    <ul className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]">
      {rows.map((r) => (
        <li
          key={r.key}
          className="group relative flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors group-hover:bg-[var(--action-ink)]" />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-medium text-[var(--text-primary)] transition-colors group-hover:text-white">
              {r.primary}
            </p>
            <p className="mt-1 truncate text-[13px] text-[var(--text-secondary)]">
              {r.secondary}
            </p>
          </div>
          <Link
            href={r.href}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] transition-all hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            {r.action}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function EmployerHomePage() {
  // #region agent log
  fetch('http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f0598'},body:JSON.stringify({sessionId:'7f0598',hypothesisId:'H2',location:'src/app/app/employer/page.tsx:64',message:'Rendering restored employer page',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  const [metrics, invitations, reports, needsReview, catalog] = await Promise.all([
    getOverviewMetrics(org.organizationId),
    // The pipeline counts every stage, so it needs the whole set rather than a
    // page of it.
    getInvitationRecords(org.organizationId, 200),
    getReportRecords(org.organizationId, 5),
    getNeedsReviewRecords(org.organizationId, 6),
    getEmployerCatalog(),
  ]);

  const activeEvaluation = catalog.flatMap((role) => role.sims)[0] ?? null;
  const hasInvited = invitations.length > 0;
  const hasResults = reports.length > 0;

  // A report that needs review already has a module of its own. Repeating it
  // under "Recent reports" made a three-report workspace look like five.
  const reviewIds = new Set(needsReview.map((r) => r.sessionId));
  const otherReports = reports.filter((r) => !reviewIds.has(r.sessionId));

  const steps: SetupStep[] = [
    {
      title: "Your workspace is ready",
      description: "Evaluations, candidates and reports are private to this workspace.",
      state: "done",
    },
    {
      title: "Invite your first candidate",
      description:
        "Send an invitation by email. They complete the evaluation in one sitting.",
      state: hasInvited ? "done" : "current",
      action: { label: "Invite a candidate", invite: true },
    },
    {
      title: "Read the evidence report",
      description:
        "Open the conclusion, then open the evidence behind each claim before you decide.",
      state: hasResults ? "done" : hasInvited ? "current" : "upcoming",
      action: { label: "Go to reports", href: "/app/employer/reports" },
    },
  ];

  return (
    /* A new workspace has one thing to do, so it stays in a single readable
       column. A running workspace has status to scan, so it uses the width. */
    <div className={hasResults ? "max-w-[1180px]" : "max-w-[900px]"}>
      <EmployerClientAnimator>
        <PageHeader
          title="Home"
          description={
            hasResults
              ? "Where your evaluations stand right now."
              : "Three steps to your first evidence report."
          }
        />

        {hasResults ? (
          <div className="mt-7 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--fydell-brand-blue)]/5 to-transparent blur-[40px] -z-10 mix-blend-screen opacity-60" />
            <MetricStrip
              items={[
                { label: "In progress", value: metrics.inProgress },
                { label: "Completed", value: metrics.completed },
                { label: "Reports ready", value: metrics.reportsReady },
                { label: "Needs review", value: metrics.needsReview },
              ]}
            />
          </div>
        ) : (
          <div className="mt-7">
            <SetupPath steps={steps} />
          </div>
        )}

        <div
          className={
            hasResults
              ? "mt-9 grid items-start gap-x-8 gap-y-9 xl:grid-cols-[minmax(0,1fr)_320px]"
              : "contents"
          }
        >
          <div className={hasResults ? "min-w-0" : "contents"}>
            <section className={hasResults ? "" : "mt-9"}>
              <SectionHeading
                title="Active evaluation"
                href="/app/employer/assessments"
                linkLabel="All evaluations"
              />
              <div className="mt-3">
                {activeEvaluation ? (
                  <div className="rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)] px-5 py-4 transition-colors hover:border-[var(--border-strong)] relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent" />
                    <div className="flex items-start justify-between gap-4 relative z-10">
                      <div className="min-w-0">
                        <Link
                          href="/app/employer/assessments"
                          className="text-[15px] font-medium text-[var(--text-primary)] underline-offset-2 hover:underline"
                        >
                          {activeEvaluation.title}
                        </Link>
                        <p className="mt-1 line-clamp-2 max-w-[62ch] text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                          {activeEvaluation.tagline}
                        </p>
                      </div>
                      <StatusTag tone="neutral">
                        {activeEvaluation.templateId ? "Published" : "Not published"}
                      </StatusTag>
                    </div>
                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-[var(--border-subtle)] pt-3 text-[13px] relative z-10">
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--text-tertiary)]">Duration</dt>
                        <dd className="tabular-nums text-[var(--text-secondary)] font-medium">
                          {activeEvaluation.durationMinutes} min
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-[var(--text-tertiary)]">Assesses</dt>
                        <dd className="text-[var(--text-secondary)] font-medium">
                          {activeEvaluation.competencies.slice(0, 3).join(", ")}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <EmptyState
                    title="No evaluation is published yet"
                    description="An evaluation must be published before you can invite candidates to it."
                  />
                )}
              </div>
            </section>

      {needsReview.length > 0 ? (
        <section className="mt-9">
          <SectionHeading
            title="Needs review"
            href="/app/employer/reports?review=needs"
            linkLabel="View all"
          />
          <div className="mt-3">
            <RowList
              rows={needsReview.map((r) => ({
                key: r.sessionId,
                primary: r.candidate,
                secondary: [
                  r.simulation,
                  r.bandLabel,
                  r.score !== null ? `${r.score}/100` : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                href: `/app/employer/assessments/report/${r.sessionId}`,
                action: "Review",
              }))}
            />
          </div>
        </section>
      ) : null}

      {otherReports.length > 0 ? (
        <section className="mt-9">
          <SectionHeading
            title={needsReview.length > 0 ? "Already reviewed" : "Recent reports"}
            href="/app/employer/reports"
            linkLabel="View all"
          />
          <div className="mt-3">
            <RowList
              rows={otherReports.map((r) => ({
                key: r.sessionId,
                primary: r.candidate,
                secondary: [
                  r.simulation,
                  r.bandLabel,
                  r.score !== null ? `${r.score}/100` : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                href: `/app/employer/assessments/report/${r.sessionId}`,
                action: "Open",
              }))}
            />
          </div>
        </section>
      ) : null}
        </div>

        {hasResults ? (
          <aside className="min-w-0">
            <SectionHeading
              title="Candidate status"
              href="/app/employer/candidates"
              linkLabel="All candidates"
            />
            <div className="mt-3">
              <CandidatePipeline invitations={invitations} />
            </div>
          </aside>
        ) : null}
      </div>
      </EmployerClientAnimator>
    </div>
  );
}
