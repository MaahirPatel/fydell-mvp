import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CandidatesTable from "@/components/employer/CandidatesTable";
import { getInvitationRecords } from "../_lib/data";

export const metadata = { title: "Candidates | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerCandidatesPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/candidates");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const records = await getInvitationRecords(org.organizationId, 200);

  return (
    <div className="max-w-[1180px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Candidates</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Everyone you have invited to a simulation, with their progress and results.
      </p>
      <CandidatesTable rows={records} />
    </div>
  );
}
