import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import EvaluationList from "@/components/employer/EvaluationList";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEmployerCatalog } from "../_lib/catalog";

export const metadata = { title: "Evaluations" };
export const dynamic = "force-dynamic";

export default async function EmployerEvaluationsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fassessments");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const catalog = await getEmployerCatalog();
  const count = catalog.reduce((n, role) => n + role.sims.length, 0);

  return (
    <div className="max-w-[900px]">
      <PageHeader
        title="Evaluations"
        description="Preview exactly what a candidate will see, then invite someone to it."
      />

      <div className="mt-7">
        {count === 0 ? (
          <EmptyState
            title="No evaluations are available yet"
            description="An evaluation has to be published before it appears here and before candidates can be invited to it."
          />
        ) : (
          <EvaluationList roles={catalog} />
        )}
      </div>
    </div>
  );
}
