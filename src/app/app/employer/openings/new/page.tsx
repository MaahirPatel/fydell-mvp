import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { listActiveMembers } from "@/lib/hiring/members";
import { WorkspacePageHeader } from "@/components/employer/WorkspacePage";
import RoleIntakeForm from "@/components/employer/roles/RoleIntakeForm";
import { emptyIntakeDraft } from "@/components/employer/roles/draft";

export const metadata = { title: "New role" };
export const dynamic = "force-dynamic";

export default async function NewOpeningPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fopenings%2Fnew");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const canManage = orgCan(org.role, "manage_candidates");
  const members = canManage ? await listActiveMembers(org.organizationId) : [];

  return (
    <div className="max-w-[880px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> / New
      </p>
      <WorkspacePageHeader
        className="mt-4"
        title="New engineering role"
        description="Describe the actual work and what reviewers should look for. Saved as a draft; nothing is public until you publish it from the role page."
      />
      <div className="mt-6">
        {canManage ? (
          <RoleIntakeForm initial={emptyIntakeDraft(members.some((m) => m.userId === user.id) ? user.id : "")} members={members} />
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">{capabilityDeniedMessage("manage_candidates")}</p>
        )}
      </div>
    </div>
  );
}
