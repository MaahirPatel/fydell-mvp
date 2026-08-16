import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import EvaluationList from "@/components/employer/EvaluationList";
import EvaluationDetail from "@/components/employer/EvaluationDetail";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEmployerCatalog } from "../_lib/catalog";
import { getInvitationRecords } from "../_lib/data";

export const metadata = { title: "Evaluations" };
export const dynamic = "force-dynamic";

export default async function EmployerEvaluationsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fassessments");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const catalog = await getEmployerCatalog();
  const entries = catalog.flatMap((role) =>
    role.sims.map((sim) => ({ sim, roleKey: role.key, roleTitle: role.title })),
  );
  const published = entries.filter((e) => e.sim.templateId);
  const unpublished = entries.filter((e) => !e.sim.templateId);

  if (entries.length === 0) {
    return (
      <div className="max-w-[900px]">
        <PageHeader
          title="Evaluations"
          description="Preview exactly what a candidate will see, then invite someone to it."
        />
        <div className="mt-7">
          <EmptyState
            title="No evaluations are available yet"
            description="An evaluation has to be published before it appears here and before candidates can be invited to it."
          />
        </div>
      </div>
    );
  }

  // One released evaluation is the real case today, and a one-row list is a
  // worse answer than showing the evaluation itself.
  if (published.length === 1) {
    const only = published[0];
    const invitations = await getInvitationRecords(org.organizationId, 400);
    const mine = invitations.filter((i) => i.simulation === only.sim.title);

    return (
      <div>
        <PageHeader
          title="Evaluations"
          description="This is exactly what a candidate sees. It is maintained by Fydell and cannot be edited from a workspace."
          meta={
            <span className="text-app-body font-medium text-[var(--text-primary)]">
              {only.sim.title}
            </span>
          }
        />
        <div className="mt-7">
          <EvaluationDetail
            sim={only.sim}
            roleKey={only.roleKey}
            roleTitle={only.roleTitle}
            unpublished={unpublished.map((e) => e.sim.title)}
            usage={{
              invited: mine.length,
              inProgress: mine.filter((i) => i.progress === "In progress").length,
              completed: mine.filter((i) => i.status === "completed").length,
              reportsReady: mine.filter((i) => i.reportReady).length,
            }}
          />
        </div>
        <p className="mt-8 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
          Solutions Engineer and Sales Engineer evaluations are coming later.
          They are not published catalogs.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px]">
      <PageHeader
        title="Evaluations"
        description="Preview exactly what a candidate will see, then invite someone to it."
      />
      <div className="mt-7">
        <EvaluationList roles={catalog} />
      </div>
    </div>
  );
}
