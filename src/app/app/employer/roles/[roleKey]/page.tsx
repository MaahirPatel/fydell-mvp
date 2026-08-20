import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getEmployerCatalog } from "../../_lib/catalog";
import { getInvitationRecords } from "../../_lib/data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import EvaluationDetail from "@/components/employer/EvaluationDetail";
import CandidatesTable from "@/components/employer/CandidatesTable";

export const dynamic = "force-dynamic";

const TABS = ["overview", "candidates", "evaluation", "evidence", "outcomes"] as const;
type RoleTab = (typeof TABS)[number];

export default async function EmployerRoleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleKey: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  const [{ roleKey }, query, catalog] = await Promise.all([params, searchParams, getEmployerCatalog()]);
  const role = catalog.find((item) => item.key === roleKey);
  if (!role) notFound();
  const tab = TABS.includes(query.tab as RoleTab) ? (query.tab as RoleTab) : "overview";
  const invitations = await getInvitationRecords(org.organizationId, 400);
  const roleInvitations = invitations.filter((item) => item.roleKey === role.key);
  const evaluation = role.sims[0] ?? null;

  return (
    <div>
      <PageHeader
        title={role.title}
        description="The role is the hiring container. Candidate work, evidence, and outcomes stay attached to it."
        meta={<span className="text-app-meta text-[var(--text-secondary)]">Hiring</span>}
      />

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]" aria-label="Role">
        {TABS.map((item) => (
          <Link
            key={item}
            href={`/app/employer/roles/${role.key}?tab=${item}`}
            aria-current={tab === item ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b px-3 py-2.5 text-app-body font-medium capitalize ${
              tab === item
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item}
          </Link>
        ))}
      </nav>

      <div className="mt-7">
        {tab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel>
              <PanelSection title="What this person does" description={evaluation?.tagline ?? "Role calibration is not complete."} />
              <PanelSection title="Evidence Fydell needs">
                {evaluation ? (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {evaluation.competencies.map((competency) => (
                      <li key={competency} className="py-2.5 text-app-body text-[var(--text-secondary)]">
                        {competency}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-app-body text-[var(--text-secondary)]">No evaluation is attached yet.</p>
                )}
              </PanelSection>
            </Panel>
            <Panel>
              <PanelSection title="Current hiring activity">
                <dl className="divide-y divide-[var(--border-subtle)]">
                  <div className="flex justify-between py-2.5 text-app-body">
                    <dt className="text-[var(--text-secondary)]">Candidates</dt>
                    <dd className="tabular-nums text-[var(--text-primary)]">{roleInvitations.length}</dd>
                  </div>
                  <div className="flex justify-between py-2.5 text-app-body">
                    <dt className="text-[var(--text-secondary)]">Ready for evidence review</dt>
                    <dd className="tabular-nums text-[var(--text-primary)]">
                      {roleInvitations.filter((item) => item.reportReady).length}
                    </dd>
                  </div>
                </dl>
              </PanelSection>
            </Panel>
          </div>
        ) : null}

        {tab === "candidates" ? <CandidatesTable rows={roleInvitations} /> : null}
        {tab === "evaluation" && evaluation ? (
          <EvaluationDetail
            sim={evaluation}
            roleKey={role.key}
            roleTitle={role.title}
            unpublished={role.sims.filter((item) => !item.templateId).map((item) => item.title)}
            usage={{
              invited: roleInvitations.length,
              inProgress: roleInvitations.filter((item) => item.progress === "In progress").length,
              completed: roleInvitations.filter((item) => item.status === "completed").length,
              reportsReady: roleInvitations.filter((item) => item.reportReady).length,
            }}
          />
        ) : null}
        {tab === "evidence" ? (
          <Panel>
            <PanelSection
              title="Role evidence"
              description="Published candidate evidence for this role appears in the Evidence workspace."
            >
              <Link href="/app/employer/evidence" className="text-app-body text-[var(--action-ink)] hover:underline">
                Open evidence
              </Link>
            </PanelSection>
          </Panel>
        ) : null}
        {tab === "outcomes" ? (
          <Panel>
            <PanelSection
              title="Role outcomes"
              description="Interview and hiring findings remain attached to this role without turning into unsupported prediction claims."
            >
              <Link href="/app/employer/outcomes" className="text-app-body text-[var(--action-ink)] hover:underline">
                Open outcomes
              </Link>
            </PanelSection>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
