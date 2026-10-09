import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import CreateRoleForm from "@/components/eng/CreateRoleForm";
import { engAdmin } from "@/lib/eng/context";
import { listRoleSummaries, pageMember } from "@/lib/eng/employer-view";
import { roleCan } from "@/lib/eng/permissions";
import { FOCUS_OPTIONS } from "@/lib/eng/roles";
export const metadata = { title: "Assessments" };
export const dynamic = "force-dynamic";

const STATUS_TONE = { draft: "neutral", published: "good", archived: "neutral" } as const;

export default async function EngineeringRolesPage() {
  const member = await pageMember();
  if (!member) {
    return (
      <div className="max-w-[880px]">
        <PageHeader title="Assessments" />
        <EmptyState className="mt-6" title="No active workspace" description="You are not an active member of a workspace. Accept a pending invitation on the Team page, or ask an owner to add you." />
      </div>
    );
  }
  const roles = await listRoleSummaries(engAdmin(), member.organizationId);
  const canManage = roleCan(member.role, "manage_roles");

  return (
    <div className="max-w-[1120px]">
      <PageHeader
        title="Assessments"
        description="Invite candidates to a published simulation. They work in their own editor, message the simulated team and submit their project. Your team reviews the evidence and releases the report."
        action={
          canManage && roles.length > 0 ? (
            <ButtonLink href="#new-assessment" variant="primary" size="sm">
              New assessment
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mt-7 grid gap-6">
        <Panel>
          <PanelSection title="Your assessments" description="Invite from an assessment's page. Every candidate stays on the simulation version they were invited to. Openings that people apply to are under Roles." />
          {roles.length === 0 ? (
            <div className="px-5 pb-5 lg:px-6">
              <EmptyState title="No assessments yet" description={canManage ? "Create a draft assessment, preview the task, then publish it to start inviting." : "An owner, admin or hiring manager can create the first assessment."} />
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Assessment</TH>
                <TH>Status</TH>
                <TH align="right">Invited</TH>
                <TH align="right">In progress</TH>
                <TH align="right">Reports released</TH>
              </THead>
              <TBody>
                {roles.map((role) => (
                  <TR key={role.id}>
                    <TDPrimary>
                      <Link href={`/app/employer/engineering/roles/${role.id}`} className="hover:underline">
                        {role.title}
                      </Link>
                    </TDPrimary>
                    <TD>
                      <StatusTag tone={STATUS_TONE[role.status]}>{role.status[0].toUpperCase() + role.status.slice(1)}</StatusTag>
                    </TD>
                    <TD align="right">{role.invited}</TD>
                    <TD align="right">{role.inProgress}</TD>
                    <TD align="right">{role.ready}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        <div className="grid items-start gap-6 md:grid-cols-2">
          {canManage ? (
            <div id="new-assessment" tabIndex={-1} className="scroll-mt-6 outline-none">
              <Panel>
                <PanelSection title="New assessment" description="Starts as a draft. You can edit it until you publish.">
                  <CreateRoleForm focusOptions={FOCUS_OPTIONS} />
                </PanelSection>
              </Panel>
            </div>
          ) : null}
          <Panel>
            <PanelSection title="Simulations" description="Each assessment attaches a published simulation from Work samples.">
              <p className="text-app-body leading-[1.6] text-[var(--text-secondary)]">
                Start from a simulation template reviewed by Fydell, use it as it is or adapt it to your product, then publish it once the checks pass.
              </p>
              <Link
                href="/app/employer/work-samples"
                className="mt-3 inline-block text-app-body font-medium text-[var(--accent-ink)] underline-offset-2 hover:underline"
              >
                Open work samples
              </Link>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}
