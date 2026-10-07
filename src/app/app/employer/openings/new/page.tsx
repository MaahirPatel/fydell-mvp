import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { PageHeader } from "@/components/ui/PageHeader";
import RoleForm from "@/components/hiring/RoleForm";

export const metadata = { title: "New role" };
export const dynamic = "force-dynamic";

export default async function NewOpeningPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fopenings%2Fnew");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const canManage = orgCan(org.role, "manage_candidates");

  return (
    <div className="max-w-[760px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> / New
      </p>
      <PageHeader className="mt-4" title="New role" description="Saved as a draft. Nothing is public until you publish it from the role's page." />
      <div className="mt-8">
        {canManage ? (
          <RoleForm initial={null} />
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">{capabilityDeniedMessage("manage_candidates")}</p>
        )}
      </div>
    </div>
  );
}
