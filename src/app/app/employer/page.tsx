import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
import SetupPath, { type SetupStep } from "@/components/employer/SetupPath";
import { getEmployerCatalog } from "./_lib/catalog";
import {
  getInvitationRecords,
  getNeedsReviewRecords,
  getOverviewMetrics,
  getReportRecords,
  getWorkspaceHealth,
  type WorkspaceHealth,
} from "./_lib/data";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-app-body text-[var(--text-secondary)] underline-offset-2 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * An edge-to-edge band of real counts, each one a route to where you act on it.
 * Rendered only once at least one is non-zero: four zeros report the absence of
 * data instead of telling a new workspace what to do.
 */
function MetricBand({
  items,
}: {
  items: { label: string; value: number; href: string; color: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--border-subtle)] sm:grid-cols-4 sm:divide-y-0">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group px-5 py-4 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] lg:px-6"
        >
          <dt className="text-app-meta text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] group-hover:text-[var(--text-secondary)]">
            {item.label}
          </dt>
          <dd
            className="mt-1.5 text-[26px] font-medium leading-none tabular-nums tracking-[-0.025em]"
            style={{ color: item.value > 0 ? item.color : "var(--text-tertiary)" }}
          >
            {item.value}
          </dd>
        </Link>
      ))}
    </dl>
  );
}

function HealthPanel({ health }: { health: WorkspaceHealth }) {
  const rows: { key: string; label: string; detail: string; tone: "attention" | "risk" }[] =
    [];

  if (!health.emailConfigured) {
    rows.push({
      key: "email",
      label: "Email delivery is not configured",
      detail:
        "Invitations are not sent. Copy each candidate link from Candidates and share it yourself.",
      tone: "attention",
    });
  }
  if (health.failedAnalyses > 0) {
    rows.push({
      key: "analysis",
      label: `${health.failedAnalyses} analysis ${health.failedAnalyses === 1 ? "run" : "runs"} failed`,
      detail: "The attempt was submitted but produced no report. Support can re-run it.",
      tone: "risk",
    });
  }
  if (health.awaitingAnalysis > 0) {
    rows.push({
      key: "awaiting",
      label: `${health.awaitingAnalysis} submitted ${health.awaitingAnalysis === 1 ? "attempt is" : "attempts are"} still being analysed`,
      detail: "No action needed yet. Reports appear here when analysis completes.",
      tone: "attention",
    });
  }

  if (rows.length === 0 && health.stalled.length === 0) return null;

  return (
    <Panel className="mt-6">
      <PanelSection
        title="Invitation and analysis health"
        description="What is quietly blocking a candidate right now."
      >
        {rows.length > 0 ? (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{
                    background:
                      row.tone === "risk" ? "var(--fydell-risk)" : "var(--viz-attention)",
                  }}
                />
                <div className="min-w-0">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">
                    {row.label}
                  </p>
                  <p className="mt-0.5 max-w-[70ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
                    {row.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </PanelSection>

      {health.stalled.length > 0 ? (
        <PanelSection
          title={
            health.stalled.length === 1
              ? "1 invitation is waiting on you"
              : `${health.stalled.length} invitations are waiting on you`
          }
          action={<SectionLink href="/app/employer/candidates" label="All candidates" />}
        >
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            {health.stalled.slice(0, 5).map((row) => (
              <li
                key={row.invitationId}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <span className="truncate text-app-body text-[var(--text-primary)]">
                  {row.who}
                </span>
                <span className="shrink-0 text-app-meta text-[var(--text-tertiary)]">
                  {row.reason}
                </span>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}
    </Panel>
  );
}

type QueueRow = {
  key: string;
  primary: string;
  secondary: string;
  href: string;
  action: string;
};

function ReviewQueue({
  title,
  linkHref,
  linkLabel,
  rows,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
  rows: QueueRow[];
}) {
  return (
    <PanelSection
      title={title}
      action={<SectionLink href={linkHref} label={linkLabel} />}
      bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
    >
      <ul className="border-t border-[var(--border-subtle)]">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-3 last:border-b-0 hover:bg-[var(--surface-hover)] lg:px-6"
          >
            <div className="min-w-0">
              <p className="truncate text-app-body font-medium text-[var(--text-primary)]">
                {row.primary}
              </p>
              <p className="mt-0.5 truncate text-app-meta text-[var(--text-secondary)]">
                {row.secondary}
              </p>
            </div>
            <Link
              href={row.href}
              className="shrink-0 text-app-body font-medium text-[var(--text-secondary)] underline-offset-2 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
            >
              {row.action}
            </Link>
          </li>
        ))}
      </ul>
    </PanelSection>
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
  const health = await getWorkspaceHealth(org.organizationId, invitations);

  const activeEvaluation = catalog.flatMap((role) => role.sims)[0] ?? null;
  const hasInvited = invitations.length > 0;
  const hasResults = reports.length > 0;
  const hasReviewed = reports.some((r) => !r.needsReview);
  const reviewIds = new Set(needsReview.map((r) => r.sessionId));
  const otherReports = reports.filter((r) => !reviewIds.has(r.sessionId));

  const steps: SetupStep[] = [
    {
      title: "Workspace created",
      description: org.organizationName,
      state: "done",
    },
    {
      title: "Evaluation ready",
      description:
        activeEvaluation?.title ?? "No published evaluation is available to this workspace.",
      state: activeEvaluation ? "done" : "current",
      action: activeEvaluation
        ? undefined
        : { label: "View evaluations", href: "/app/employer/assessments" },
    },
    {
      title: "Invite your first candidate",
      description: hasInvited
        ? `${invitations.length} ${invitations.length === 1 ? "candidate" : "candidates"} invited.`
        : "Send the evaluation to someone you are considering.",
      state: hasInvited ? "done" : activeEvaluation ? "current" : "upcoming",
      action: { label: "Invite candidate", invite: true },
    },
    {
      title: "Review the first report",
      description: hasReviewed
        ? "You have recorded a decision from the evidence."
        : hasResults
          ? "A report is ready to read."
          : "Reports appear once a candidate submits.",
      state: hasReviewed ? "done" : hasResults ? "current" : "upcoming",
      action: { label: "Open reports", href: "/app/employer/reports" },
    },
  ];

  const completedSteps = steps.filter((s) => s.state === "done").length;
  const setupComplete = completedSteps === steps.length;

  const metricItems = [
    {
      label: "In progress",
      value: metrics.inProgress,
      href: "/app/employer/candidates",
      color: "var(--fydell-evidence)",
    },
    {
      label: "Completed",
      value: metrics.completed,
      href: "/app/employer/candidates",
      color: "var(--fydell-good)",
    },
    {
      label: "Reports ready",
      value: metrics.reportsReady,
      href: "/app/employer/reports",
      color: "var(--fydell-verified)",
    },
    {
      label: "Needs review",
      value: metrics.needsReview,
      href: "/app/employer/reports?review=needs",
      color: "var(--fydell-changed)",
    },
  ];
  const showMetrics = metricItems.some((m) => m.value > 0);

  return (
    <div>
      <PageHeader
        title={org.organizationName}
        description={
          hasResults
            ? "Candidates in progress, reports waiting, and invitations that need a follow-up."
            : hasInvited
              ? "Waiting on the first completed evaluation."
              : "Invite a Data Analyst to the operations performance investigation."
        }
      />

      <Panel className="mt-7">
        {!setupComplete ? (
          <PanelSection
            title="Workspace setup"
            action={
              <div className="flex items-center gap-2.5">
                <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                  {completedSteps} of {steps.length} complete
                </span>
                <ProgressRing value={completedSteps} total={steps.length} />
              </div>
            }
          >
            <SetupPath steps={steps} />
          </PanelSection>
        ) : null}

        {!hasInvited && activeEvaluation ? (
          <PanelSection title={activeEvaluation.title}>
            <p className="max-w-[70ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
              {activeEvaluation.tagline}
            </p>
            <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
              Nothing is fabricated here because no candidate has started yet.
            </p>
          </PanelSection>
        ) : null}

        {showMetrics ? <MetricBand items={metricItems} /> : null}

        {hasInvited ? (
          <PanelSection
            title="Candidate pipeline"
            action={
              <SectionLink href="/app/employer/candidates" label="All candidates" />
            }
          >
            <CandidatePipeline invitations={invitations} />
          </PanelSection>
        ) : null}
      </Panel>

      <HealthPanel health={health} />

      {needsReview.length > 0 || otherReports.length > 0 ? (
        <Panel className="mt-6">
          {needsReview.length > 0 ? (
            <ReviewQueue
              title="Needs review"
              linkHref="/app/employer/reports?review=needs"
              linkLabel="View all"
              rows={needsReview.map((r) => ({
                key: r.sessionId,
                primary: r.candidate,
                secondary: [r.simulation, r.bandLabel].filter(Boolean).join(" · "),
                href: `/app/employer/assessments/report/${r.sessionId}`,
                action: "Review",
              }))}
            />
          ) : null}

          {otherReports.length > 0 ? (
            <ReviewQueue
              title={needsReview.length > 0 ? "Already reviewed" : "Recent reports"}
              linkHref="/app/employer/reports"
              linkLabel="View all"
              rows={otherReports.map((r) => ({
                key: r.sessionId,
                primary: r.candidate,
                secondary: [r.simulation, r.bandLabel].filter(Boolean).join(" · "),
                href: `/app/employer/assessments/report/${r.sessionId}`,
                action: "Open",
              }))}
            />
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
