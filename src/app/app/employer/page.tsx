import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import ActivityFeed from "@/components/employer/ActivityFeed";
import AttentionQueue from "@/components/employer/AttentionQueue";
import CandidatePipeline from "@/components/employer/CandidatePipeline";
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

  const [invitations, reports, snapshot] = await Promise.all([
    getInvitationRecords(org.organizationId, 200),
    getReportRecords(org.organizationId, 5),
    getOperationalSnapshot(org.organizationId, now),
  ]);
  const health = await getWorkspaceHealth(org.organizationId, invitations);

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
      <PageHeader
        className="border-b border-[var(--border-subtle)] pb-6"
        title="Today"
        description={
          hasResults
            ? "Review the candidate evidence that is ready and prepare the next interview."
            : hasInvited
              ? "Candidate work is underway. Fydell will surface the next decision when evidence is ready."
              : "Start with an open role, or experience the complete workflow in Sandbox."
        }
      />

      {attentionRows.length > 0 ? (
        <Panel className="mt-7">
          <PanelSection
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
          </PanelSection>
        </Panel>
      ) : null}

      {!hasInvited ? (
        <Panel className={attentionRows.length > 0 ? "mt-6" : "mt-7"}>
          <PanelSection
            title="Start with an open role"
            description="Tell Fydell who you need. We will define the work and help verify the candidates worth interviewing."
          >
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/employer/roles"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
              >
                Create role
              </Link>
              <Link
                href="/sandbox"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)]"
              >
                Explore Sandbox
              </Link>
            </div>
          </PanelSection>
        </Panel>
      ) : (
        <Panel className={attentionRows.length > 0 ? "mt-6" : "mt-7"}>
          <PanelSection
            title="Active roles"
            action={
              <SectionLink href="/app/employer/roles" label="All roles" />
            }
          >
            <CandidatePipeline invitations={invitations} />
          </PanelSection>
        </Panel>
      )}

      {hasInvited ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel>
            <PanelSection
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
            </PanelSection>
          </Panel>

          <Panel>
            <PanelSection
              title="Recent activity"
              description="Recorded events only. Unsubmitted candidate work is never shown."
            >
              <ActivityFeed rows={activityRows} />
            </PanelSection>
          </Panel>
        </div>
      ) : null}

      <HealthPanel health={health} />
    </div>
  );
}
