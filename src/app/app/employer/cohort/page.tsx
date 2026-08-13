import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CohortWorkspace from "@/components/employer/CohortWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Cohort" };
export const dynamic = "force-dynamic";

/**
 * A cohort belongs to an evaluation, so this is reached from Evaluations
 * rather than from the sidebar. The cohort's own name is rendered by
 * CohortWorkspace from real data.
 */
export default async function EmployerCohortPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fcohort");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  return (
    <div className="max-w-[1080px]">
      <PageHeader
        title="Cohort"
        description="A group of candidates working through one version of one evaluation."
      />
      <div className="mt-7">
        <CohortWorkspace organizationName={org.organizationName} />
      </div>
    </div>
  );
}
