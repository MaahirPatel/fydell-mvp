import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { getRole } from "@/lib/hiring/roles";
import { listActiveMembers } from "@/lib/hiring/members";
import { ROLE_STATE_LABEL } from "@/lib/hiring/role-contract";
import { WorkspacePageHeader } from "@/components/employer/WorkspacePage";
import RoleIntakeForm from "@/components/employer/roles/RoleIntakeForm";
import { draftFromRole } from "@/components/employer/roles/draft";

export const metadata = { title: "Edit role" };
export const dynamic = "force-dynamic";

export default async function EditOpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/openings/${id}/edit`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const role = await getRole(org.organizationId, id);
  if (!role) notFound();
  if (role.state === "filled" || role.state === "closed") redirect(`/app/employer/openings/${id}`);
  const canManage = orgCan(org.role, "manage_candidates");
  const members = canManage ? await listActiveMembers(org.organizationId) : [];

  return (
    <div className="max-w-[880px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> /{" "}
        <Link href={`/app/employer/openings/${id}`} className="hover:underline">{role.title}</Link> / Edit
      </p>
      <WorkspacePageHeader
        className="mt-4"
        title="Edit role"
        description={`Requirements version ${role.requirementsVersion}. Changing the confirmed requirements starts a new version; earlier applications keep the version they saw.`}
      />
      <div className="mt-6">
        {canManage ? (
          <RoleIntakeForm
            roleId={role.id}
            initial={draftFromRole(role)}
            members={members}
            expectedUpdatedAt={role.updatedAt}
            requirementsVersion={role.requirementsVersion}
            stateLabel={ROLE_STATE_LABEL[role.state]}
          />
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">{capabilityDeniedMessage("manage_candidates")}</p>
        )}
      </div>
    </div>
  );
}
