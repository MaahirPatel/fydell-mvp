import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { WorkspacePageHeader, WorkspaceSection } from "@/components/employer/WorkspacePage";
import { orgCan } from "@/lib/orgs/capabilities";
import ActivityFeed from "@/components/employer/ActivityFeed";
import AttentionQueue from "@/components/employer/AttentionQueue";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
import { AppliedAiDemoModule } from "@/components/employer/AppliedAiDemoModule";
import { describeElapsed, formatElapsed } from "@/lib/time/elapsed";
import {
  getInvitationRecords,
  getOperationalSnapshot,
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
      <WorkspaceSection
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
                    row.tone === "risk" ? "var(--fydell-risk)" : "var(--fydell-changed)",
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
      </WorkspaceSection>
    </Panel>
  );
}

const SETUP_STEPS = [
  {
    title: "Choose a simulation",
    detail:
      "Start from a validated role model for Backend & API or Applied AI, use it as reviewed, or adapt it to your product.",
    href: "/app/employer/work-samples/new",
    cta: "Create simulation",
  },
  {
    title: "Open a role",
    detail: "Describe the engineering role and attach the published simulation candidates will complete.",
    href: "/app/employer/engineering",
    cta: "Create role",
  },
  {
    title: "Invite candidates",
    detail:
      "Candidates work in the Fydell desktop app, in their own editor. Your team reviews the evidence before anything is released.",
    href: "/app/employer/roles",
    cta: "View roles",
  },
] as const;

function GettingStarted({ className, canManage }: { className?: string; canManage: boolean }) {
  return (
    <Panel className={className}>
      <div className="px-5 py-6 lg:px-7 lg:py-7">
        <h2 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--text-primary)]">
          Run your first practical assessment
        </h2>
        <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[1.55] text-[var(--text-secondary)]">
          Three steps from an empty workspace to evidence your team can review.
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {SETUP_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[13px] font-semibold tabular-nums text-[var(--accent-ink)]"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-1 flex-1 text-[14px] leading-[1.5] text-[var(--text-secondary)]">{step.detail}</p>
              {canManage ? (
                <Link
                  href={step.href}
                  className="mt-4 text-[14px] font-medium text-[var(--accent-ink)] underline-offset-2 hover:underline"
                >
                  {step.cta}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
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

  const [invitations, reports, snapshot] = await Promise.all([
    getInvitationRecords(org.organizationId, 200),
    getReportRecords(org.organizationId, 5),
    getOperationalSnapshot(org.organizationId, now),
  ]);
  const health = await getWorkspaceHealth(org.organizationId, invitations);

  const canManage = orgCan(org.role, "manage_candidates");
  const hasInvited = invitations.length > 0;
  const hasResults = reports.length > 0;

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

  return (
    <div>
      <WorkspacePageHeader
        title="Today"
        action={
          canManage ? (
            <ButtonLink href="/app/employer/engineering" variant="primary" size="sm">
              Create engineering role
            </ButtonLink>
          ) : undefined
        }
        description={
          hasResults
            ? "Review the candidate evidence that is ready and prepare the next interview."
            : hasInvited
              ? "Candidate work is underway. Fydell will surface the next decision when evidence is ready."
              : "Set up a simulation, open a role, and invite your first candidates."
        }
      />

      {attentionRows.length > 0 ? (
        <Panel className="mt-7">
          <WorkspaceSection
            title="Needs attention"
            description="Ordered by whose turn it is and how long the work has been waiting."
            action={
              <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                {attentionRows.length}{" "}
                {attentionRows.length === 1 ? "item" : "items"}
              </span>
            }
          >
            <AttentionQueue rows={attentionRows} />
          </WorkspaceSection>
        </Panel>
      ) : null}

      {!hasInvited ? (
        <GettingStarted className={attentionRows.length > 0 ? "mt-6" : "mt-7"} canManage={canManage} />
      ) : (
        <Panel className={attentionRows.length > 0 ? "mt-6" : "mt-7"}>
          <WorkspaceSection
            title="Active roles"
            action={
              <SectionLink href="/app/employer/roles" label="All roles" />
            }
          >
            <CandidatePipeline invitations={invitations} />
          </WorkspaceSection>
        </Panel>
      )}

      <AppliedAiDemoModule className="mt-6" />

      {hasInvited ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <WorkspaceSection
              title="Ready for review"
              action={<SectionLink href="/app/employer/evidence" label="All evidence" />}
              bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
            >
              {reports.length === 0 ? (
                <p className="px-5 pb-1 text-app-body text-[var(--text-secondary)] lg:px-6">
                  No candidate evidence is ready yet. It appears here after
                  submitted work has been analysed.
                </p>
              ) : (
                <ul>
                  {reports.map((r) => (
                    <li
                      key={r.sessionId}
                      className="border-t border-[var(--border-subtle)]"
                    >
                      <Link
                        href={`/app/employer/candidates/${r.sessionId}`}
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
            </WorkspaceSection>
          </Panel>

          <Panel>
            <WorkspaceSection
              title="Recent activity"
              description="Recorded events only. Unsubmitted candidate work is never shown."
            >
              <ActivityFeed rows={activityRows} />
            </WorkspaceSection>
          </Panel>
        </div>
      ) : null}

      <HealthPanel health={health} />
    </div>
  );
}
