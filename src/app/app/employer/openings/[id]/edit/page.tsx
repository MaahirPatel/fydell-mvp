import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { getRole } from "@/lib/hiring/roles";
import { PageHeader } from "@/components/ui/PageHeader";
import RoleForm from "@/components/hiring/RoleForm";

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

  return (
    <div className="max-w-[760px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> /{" "}
        <Link href={`/app/employer/openings/${id}`} className="hover:underline">{role.title}</Link> / Edit
      </p>
      <PageHeader className="mt-4" title="Edit role" />
      <div className="mt-8">
        {orgCan(org.role, "manage_candidates") ? (
          <RoleForm roleId={role.id} initial={role} published={role.state !== "draft"} />
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">{capabilityDeniedMessage("manage_candidates")}</p>
        )}
      </div>
    </div>
  );
}
