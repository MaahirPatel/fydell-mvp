import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { ROLES } from "@/lib/simulations/roles";
import ReportsList from "@/components/employer/ReportsList";
import { getReportRecords } from "../_lib/data";

export const metadata = { title: "Reports | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/reports");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const params = (await searchParams) || {};
  const initialReviewFilter =
    params.review === "needs" ? ("needs_review" as const) : ("all" as const);

  const records = await getReportRecords(org.organizationId);
  const roleOptions = ROLES.map((r) => ({ key: r.key, title: r.title }));

  return (
    <div className="max-w-[1080px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Reports</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Completed simulations with scores and evidence bands.
      </p>
      <ReportsList
        rows={records}
        roleOptions={roleOptions}
        initialReviewFilter={initialReviewFilter}
      />
    </div>
  );
}
