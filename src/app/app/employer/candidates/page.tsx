import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CandidatesTable from "@/components/employer/CandidatesTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInvitationRecords } from "../_lib/data";

export const metadata = { title: "Candidates" };
export const dynamic = "force-dynamic";

export default async function EmployerCandidatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fcandidates");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  // Home's attention queue links here filtered to one person, so the row it was
  // talking about is the row you land on.
  const params = (await searchParams) || {};
  const initialQuery = typeof params.q === "string" ? params.q : "";

  const records = await getInvitationRecords(org.organizationId, 200);

  // When every invitation is to the same evaluation the table drops that
  // column, so the page header has to carry the fact instead.
  const evaluations = new Set(records.map((r) => r.simulation).filter(Boolean));
  const only = evaluations.size === 1 ? [...evaluations][0] : null;

  return (
    <div>
      <PageHeader
        title="Candidates"
        description={
          only
            ? `Everyone this workspace has invited to ${only}, with where they have reached.`
            : "Everyone this workspace has invited, with where they have reached."
        }
      />
      <div className="mt-7">
        <CandidatesTable rows={records} initialQuery={initialQuery} />
      </div>
    </div>
  );
}
