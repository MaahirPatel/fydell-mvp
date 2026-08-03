import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import GuidedSimulationBuilder from "@/components/employer/GuidedSimulationBuilder";
import { getEmployerCatalog } from "../../_lib/catalog";

export const metadata = { title: "New simulation | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerNewSimulationPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/simulations/new");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const catalog = await getEmployerCatalog();

  return (
    <div className="max-w-[720px]">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-[#3157D5]">
        Start from template
      </p>
      <h1 className="mt-1 text-[24px] font-semibold text-slate-900">New simulation</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Pick a role flagship or another published simulation, preview the candidate brief, then
        invite. There is no open-ended AI generator.
      </p>
      <div className="mt-8">
        <GuidedSimulationBuilder roles={catalog} />
      </div>
    </div>
  );
}
