import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
import InviteHomeButton from "@/components/employer/InviteHomeButton";
import { getEmployerCatalog } from "./_lib/catalog";
import {
  getInvitationRecords,
  getNeedsReviewRecords,
  getOverviewMetrics,
  getReportRecords,
} from "./_lib/data";
import { invitationTruth } from "@/lib/contracts/lifecycle";

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
    <ul className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)]">
      {rows.map((r) => (
        <li
          key={r.key}
          className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3.5 last:border-b-0 hover:bg-white/[0.03]"
        >
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">
              {r.primary}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">
              {r.secondary}
            </p>
          </div>
          <Link
            href={r.href}
            className="shrink-0 text-[13px] font-medium text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
          >
            {r.action}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function EmployerHomePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  const [metrics, invitations, reports, needsReview, catalog] = await Promise.all([
    getOverviewMetrics(org.organizationId),
    getInvitationRecords(org.organizationId, 200),
    getReportRecords(org.organizationId, 5),
    getNeedsReviewRecords(org.organizationId, 6),
    getEmployerCatalog(),
  ]);

  const activeEvaluation = catalog.flatMap((role) => role.sims)[0] ?? null;
  const hasInvited = invitations.length > 0;
  const hasResults = reports.length > 0;
  const reviewIds = new Set(needsReview.map((r) => r.sessionId));
  const otherReports = reports.filter((r) => !reviewIds.has(r.sessionId));
  const attention = invitations.filter((i) =>
    ["sent", "opened", "expired", "failed"].includes(i.status) ||
    i.emailDelivery === "failed" ||
    i.emailDelivery === "not_configured",
  );

  return (
    <div className={hasResults ? "max-w-[1180px]" : "max-w-[880px]"}>
      <PageHeader
        title={org.organizationName}
        description={
          hasResults
            ? "Candidates in progress, reports waiting, and invitations that need a follow-up."
            : hasInvited
              ? "Waiting on the first completed evaluation."
              : "Invite a Data Analyst to the operations-yield investigation."
        }
        action={<InviteHomeButton />}
      />

      {!hasInvited && !hasResults ? (
        <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-5 py-5">
          <p className="text-[15px] font-medium text-[var(--text-primary)]">
            {activeEvaluation?.title ?? "Operations performance investigation"}
          </p>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
            {activeEvaluation?.tagline ??
              "A 20-minute Data Analyst evaluation. The candidate separates a reporting change from real production risk."}
          </p>
          <p className="mt-4 text-[13px] text-[var(--text-tertiary)]">
            Use Invite in the top bar. Nothing is fabricated here because no
            candidate has started yet.
          </p>
        </section>
      ) : null}

      {hasResults ? (
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-4">
          {[
            ["In progress", metrics.inProgress],
            ["Completed", metrics.completed],
            ["Reports ready", metrics.reportsReady],
            ["Needs review", metrics.needsReview],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--surface-panel)] px-4 py-3.5">
              <dt className="text-[12.5px] text-[var(--text-tertiary)]">{label}</dt>
              <dd className="mt-1 text-[22px] font-medium tabular-nums tracking-[-0.02em] text-[var(--text-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div
        className={
          hasResults
            ? "mt-9 grid items-start gap-x-8 gap-y-9 xl:grid-cols-[minmax(0,1fr)_320px]"
            : "contents"
        }
      >
        <div className={hasResults ? "min-w-0" : "contents"}>
          {attention.length > 0 ? (
            <section className={hasResults ? "" : "mt-9"}>
              <SectionHeading
                title="Invitations needing attention"
                href="/app/employer/candidates"
                linkLabel="All candidates"
              />
              <div className="mt-3">
                <RowList
                  rows={attention.slice(0, 6).map((i) => {
                    const truth = invitationTruth({
                      status: i.status,
                      emailDelivery: i.emailDelivery,
                    });
                    return {
                      key: i.invitationId,
                      primary: i.name || i.email,
                      secondary: truth.label,
                      href: "/app/employer/candidates",
                      action: "Open",
                    };
                  })}
                />
              </div>
            </section>
          ) : null}

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
                    secondary: [r.simulation, r.bandLabel].filter(Boolean).join(" · "),
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
                    secondary: [r.simulation, r.bandLabel].filter(Boolean).join(" · "),
                    href: `/app/employer/assessments/report/${r.sessionId}`,
                    action: "Open",
                  }))}
                />
              </div>
            </section>
          ) : null}

          {hasInvited && !hasResults && attention.length === 0 ? (
            <section className="mt-9">
              <EmptyState
                title="No reports yet"
                description="Candidates have been invited. The first evidence report will appear here after someone submits."
              />
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
    </div>
  );
}
