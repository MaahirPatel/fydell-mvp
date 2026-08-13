import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { ROLES } from "@/lib/simulations/roles";
import ReportsList from "@/components/employer/ReportsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getReportRecords } from "../_lib/data";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function EmployerReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Freports");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const params = (await searchParams) || {};
  const initialReviewFilter =
    params.review === "needs" ? ("needs_review" as const) : ("all" as const);

  const records = await getReportRecords(org.organizationId);
  const roleOptions = ROLES.map((r) => ({ key: r.key, title: r.title }));

  return (
    <div className="max-w-[1080px]">
      <PageHeader
        title="Reports"
        description="Completed evaluations. Open one to read the conclusion and the evidence behind it."
      />
      <div className="mt-7">
        <ReportsList
          rows={records}
          roleOptions={roleOptions}
          initialReviewFilter={initialReviewFilter}
        />
      </div>
    </div>
  );
}
