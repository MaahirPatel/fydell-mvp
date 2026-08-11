import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CohortWorkspace from "@/components/employer/CohortWorkspace";

export const metadata = { title: "Pilot cohort | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerCohortPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/cohort");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  return (
    <div className="max-w-[1080px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Pilot cohort</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        One Data Analyst evaluation for this organization. Invite candidates, track status, and open
        evidence reports. No fake analytics.
      </p>
      <div className="mt-8">
        <CohortWorkspace organizationName={org.organizationName} />
      </div>
    </div>
  );
}
