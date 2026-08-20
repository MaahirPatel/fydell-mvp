import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import ActivityFeed from "@/components/employer/ActivityFeed";
import AttentionQueue from "@/components/employer/AttentionQueue";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
import SetupPath, { type SetupStep } from "@/components/employer/SetupPath";
import { describeElapsed, formatElapsed } from "@/lib/time/elapsed";
import { getEmployerCatalog } from "./_lib/catalog";
import {
  getInvitationRecords,
  getOperationalSnapshot,
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
 *
 * Every tile carries the rule that produced its number. A metric a reader has
 * to guess the definition of cannot be reconciled against the pipeline below
 * it, and an unreconcilable number is the one people stop trusting first.
 *
 * Rendered only once at least one is non-zero: four zeros report the absence of
 * data instead of telling a new workspace what to do.
 */
function MetricBand({
  items,
}: {
  items: {
    label: string;
    value: number;
    href: string;
    /** Colour is reserved for the one count that means "act here". */
    needsAction?: boolean;
    definition: string;
  }[];
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
          <dd>
            <span
              className="mt-1.5 block text-[26px] font-medium leading-none tabular-nums tracking-[-0.025em]"
              style={{
                color:
                  item.value === 0
                    ? "var(--text-tertiary)"
                    : item.needsAction
                      ? "var(--color-changed)"
                      : "var(--text-primary)",
              }}
            >
              {item.value}
            </span>
            <span className="mt-2 block text-app-meta leading-[1.45] text-[var(--text-tertiary)]">
              {item.definition}
            </span>
          </dd>
        </Link>
      ))}
    </dl>
  );
}

/**
 * Workspace-level delivery and processing facts.
 *
 * Per-candidate problems belong to the attention queue above; this section is
 * only for conditions that affect the whole workspace, so the same failure is
 * never reported in two places.
 */
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

  if (rows.length === 0) return null;

  return (
    <Panel className="mt-6">
      <PanelSection
        title="Invitation and analysis health"
        description="Conditions that affect every candidate in this workspace."
      >
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full"
                style={{
                  background:
                    row.tone === "risk" ? "var(--color-risk)" : "var(--color-changed)",
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
      </PanelSection>
    </Panel>
  );
}

export default async function EmployerHomePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  // One instant for the whole page, so every elapsed reading agrees. This is an
  // async Server Component: it runs once per request and never re-renders, so
  // the purity rule for client render does not apply here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const [metrics, invitations, reports, catalog, snapshot] = await Promise.all([
    getOverviewMetrics(org.organizationId),
    getInvitationRecords(org.organizationId, 200),
    getReportRecords(org.organizationId, 5),
    getEmployerCatalog(),
    getOperationalSnapshot(org.organizationId, now),
  ]);
  const health = await getWorkspaceHealth(org.organizationId, invitations);

  const activeEvaluation = catalog.flatMap((role) => role.sims)[0] ?? null;
  const hasInvited = invitations.length > 0;
  const hasResults = reports.length > 0;
  const hasReviewed = reports.some((r) => !r.needsReview);

  const attentionRows = snapshot.attention.map((item) => ({
    key: item.key,
    invitationId: item.invitationId,
    candidate: item.candidate,
    email: item.email,
    state: item.state,
    reason: item.reason,
    severity: item.severity,
    primary: item.primary,
    secondary: item.secondary,
    elapsed: formatElapsed(item.since, now),
    elapsedTitle: `In this state for ${describeElapsed(item.since, now).replace(" ago", "")}`,
  }));

  const activityRows = snapshot.activity.slice(0, 8).map((event) => ({
    key: event.key,
    who: event.who,
    what: event.what,
    href: event.href,
    elapsed: formatElapsed(event.at, now),
    elapsedTitle: describeElapsed(event.at, now),
  }));

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
      definition: "Accepted or actively working, not yet submitted.",
    },
    {
      label: "Completed",
      value: metrics.completed,
      href: "/app/employer/candidates",
      definition: "Submitted a final recommendation.",
    },
    {
      label: "Reports ready",
      value: metrics.reportsReady,
      href: "/app/employer/reports",
      definition: "Analysis finished and evidence is inspectable.",
    },
    {
      label: "Needs review",
      value: metrics.needsReview,
      href: "/app/employer/reports?review=needs",
      needsAction: true,
      definition: "Report ready with no decision recorded.",
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

      {attentionRows.length > 0 ? (
        <Panel className="mt-7">
          <PanelSection
            title="Needs attention"
            description="Ordered by whose turn it is. Every row states the rule that put it here."
            action={
              <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                {attentionRows.length}{" "}
                {attentionRows.length === 1 ? "item" : "items"}
              </span>
            }
          >
            <AttentionQueue rows={attentionRows} />
          </PanelSection>
        </Panel>
      ) : null}

      <Panel className={attentionRows.length > 0 ? "mt-6" : "mt-7"}>
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

      {hasInvited ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel>
            <PanelSection
              title="Recent activity"
              description="Recorded events only. Unsubmitted candidate work is never shown."
            >
              <ActivityFeed rows={activityRows} />
            </PanelSection>
          </Panel>

          <Panel>
            <PanelSection
              title="Recent reports"
              action={<SectionLink href="/app/employer/reports" label="All reports" />}
              bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
            >
              {reports.length === 0 ? (
                <p className="px-5 pb-1 text-app-body text-[var(--text-secondary)] lg:px-6">
                  No report has been produced yet. One appears here when a
                  candidate submits and analysis finishes.
                </p>
              ) : (
                <ul>
                  {reports.map((r) => (
                    <li
                      key={r.sessionId}
                      className="border-t border-[var(--border-subtle)]"
                    >
                      <Link
                        href={`/app/employer/assessments/report/${r.sessionId}`}
                        className="flex items-baseline gap-3 px-5 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] lg:px-6"
                      >
                        <span className="min-w-0 flex-1 truncate text-app-body text-[var(--text-primary)]">
                          {r.candidate}
                        </span>
                        <span className="shrink-0 text-app-meta text-[var(--text-secondary)]">
                          {r.bandLabel || "Analysed"}
                        </span>
                        <span
                          className="w-9 shrink-0 text-right font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]"
                          title={describeElapsed(r.completedAt, now)}
                        >
                          {formatElapsed(r.completedAt, now)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelSection>
          </Panel>
        </div>
      ) : null}

      <HealthPanel health={health} />
    </div>
  );
}
