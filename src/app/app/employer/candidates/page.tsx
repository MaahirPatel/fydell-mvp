import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CandidatesTable from "@/components/employer/CandidatesTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInvitationRecords } from "../_lib/data";

export const metadata = { title: "Candidates" };
export const dynamic = "force-dynamic";

export default async function EmployerCandidatesPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fcandidates");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const records = await getInvitationRecords(org.organizationId, 200);

  return (
    <div className="max-w-[1180px]">
      <PageHeader
        title="Candidates"
        description="Everyone this workspace has invited, with where they are in the evaluation."
      />
      <div className="mt-7">
        <CandidatesTable rows={records} />
      </div>
    </div>
  );
}
