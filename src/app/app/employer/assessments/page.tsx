import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import SimulationLibrary from "@/components/employer/SimulationLibrary";
import { getEmployerCatalog } from "../_lib/catalog";

export const metadata = { title: "Simulations | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerSimulationsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/assessments");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/onboarding/employer");

  const catalog = await getEmployerCatalog();

  return (
    <div className="max-w-[1080px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Simulations</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Thirty curated five-minute simulations, five for each role. Preview any of them, then
        invite a candidate.
      </p>
      <div className="mt-6">
        <SimulationLibrary roles={catalog} />
      </div>
    </div>
  );
}
