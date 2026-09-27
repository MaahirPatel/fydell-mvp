import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import CreateRoleForm from "@/components/eng/CreateRoleForm";
import { engAdmin } from "@/lib/eng/context";
import { listRoleSummaries, pageMember } from "@/lib/eng/employer-view";
import { roleCan } from "@/lib/eng/permissions";
import { FOCUS_OPTIONS } from "@/lib/eng/roles";
import { CURRENT_SCENARIO } from "@/lib/eng/scenarios";

export const metadata = { title: "Engineering tasks" };
export const dynamic = "force-dynamic";

const STATUS_TONE = { draft: "neutral", published: "good", archived: "neutral" } as const;

export default async function EngineeringRolesPage() {
  const member = await pageMember();
  if (!member) {
    return (
      <div className="max-w-[880px]">
        <PageHeader title="Engineering tasks" />
        <EmptyState className="mt-6" title="No active workspace" description="You are not an active member of a workspace. Accept a pending invitation on the Team page, or ask an owner to add you." />
      </div>
    );
  }
  const roles = await listRoleSummaries(engAdmin(), member.organizationId);
  const canManage = roleCan(member.role, "manage_roles");
  const scenario = CURRENT_SCENARIO;

  return (
    <div className="max-w-[1120px]">
      <PageHeader
        title="Engineering tasks"
        description="Invite backend candidates to one reviewed, practical task. They work locally in their own editor, talk to the team in a thread, handle one requirement change, and upload their project. Trusted checks run in isolation, and a qualified reviewer checks every finding before you see it."
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelSection title="Roles" description={`${member.organizationName}. Each role uses a pinned version of the task, so every candidate for it gets the same work.`} />
          {roles.length === 0 ? (
            <div className="px-5 pb-5 lg:px-6">
              <EmptyState title="No engineering roles yet" description={canManage ? "Create a draft role, preview the task, then publish it to start inviting." : "An owner, admin or hiring manager can create the first role."} />
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH align="right">Invited</TH>
                <TH align="right">In progress</TH>
                <TH align="right">Reports ready</TH>
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

        <div className="grid h-fit gap-6">
          {canManage ? (
            <Panel>
              <PanelSection title="New role" description="Starts as a draft. You can edit it until you publish.">
                <CreateRoleForm focusOptions={FOCUS_OPTIONS} />
              </PanelSection>
            </Panel>
          ) : null}
          <Panel>
            <PanelSection title="The task" description={`${scenario.title}, version ${scenario.version}`}>
              <p className="text-app-body leading-[1.6] text-[var(--text-secondary)]">{scenario.summary}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-app-meta">
                <div>
                  <dt className="text-[var(--text-tertiary)]">Target effort</dt>
                  <dd className="text-[var(--text-primary)]">About {scenario.targetMinutes} minutes</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-tertiary)]">Window</dt>
                  <dd className="text-[var(--text-primary)]">{scenario.defaultAllowedMinutes} minutes after Start</dd>
                </div>
              </dl>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}
