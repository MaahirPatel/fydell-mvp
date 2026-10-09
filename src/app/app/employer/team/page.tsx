import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { PendingMemberships, TeamManager, WorkspaceSwitcher } from "@/components/eng/TeamManager";
import { engAdmin } from "@/lib/eng/context";
import { pageMember } from "@/lib/eng/employer-view";
import { listMembers, pendingMemberships } from "@/lib/eng/members";
import { ROLE_LABELS, roleCan } from "@/lib/eng/permissions";
import { requireUser } from "@/lib/simulations/auth";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { isInboxVerified } from "@/lib/security/email-verification";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  const db = engAdmin();
  const pending = user ? await pendingMemberships(db, user.id) : [];
  const member = await pageMember();
  const workspaces = user
    ? ((await db.from("organization_members").select("organization_id, organizations(name)").eq("user_id", user.id).eq("status", "active")).data ?? []).map((r) => ({
        id: r.organization_id as string,
        name: ((r.organizations as { name?: string } | null)?.name) ?? "Workspace",
      }))
    : [];

  return (
    <div className="max-w-[880px]">
      <PageHeader
        title="Team"
        description="Who can see candidates and evidence in this workspace. Access is checked on every request, so a removed member loses access immediately."
        action={member ? <WorkspaceSwitcher current={member.organizationId} options={workspaces} /> : undefined}
      />
      <div className="mt-7 grid gap-6">
        {pending.length ? (
          <Panel>
            <PanelSection title="Invitations to other workspaces">
              <InboxVerificationGate email={user?.email.toLowerCase() ?? ""} verified={user ? await isInboxVerified(user) : false}>
                <PendingMemberships items={pending.map((p) => ({ id: p.id, organizationName: p.organizationName, roleLabel: ROLE_LABELS[p.role] }))} />
              </InboxVerificationGate>
            </PanelSection>
          </Panel>
        ) : null}
        {member ? (
          <Panel>
            <PanelSection title={member.organizationName} description={`You are ${ROLE_LABELS[member.role].toLowerCase()} here.`}>
              <TeamManager
                canManage={roleCan(member.role, "manage_members")}
                actorIsOwner={member.role === "owner"}
                members={(await listMembers(db, member.organizationId)).map((m) => ({
                  id: m.id,
                  email: m.email,
                  role: m.role,
                  status: m.status,
                  isSelf: m.user_id === member.userId,
                }))}
              />
            </PanelSection>
          </Panel>
        ) : (
          <EmptyState title="No active workspace" description="Accept an invitation above, or ask an owner to add you." />
        )}
      </div>
    </div>
  );
}
