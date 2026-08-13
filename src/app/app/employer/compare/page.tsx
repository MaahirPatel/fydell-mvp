import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CompareClient from "@/components/employer/CompareClient";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Compare" };
export const dynamic = "force-dynamic";

/** Reached from Reports or a cohort. Comparing is an action, not a place. */
export default async function ComparePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fcompare");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="Compare"
        description="Two candidates on the same evaluation version, shown side by side. There is no ranking across evaluations or across companies."
        action={
          <ButtonLink href="/app/employer/reports" variant="secondary" size="sm">
            Back to reports
          </ButtonLink>
        }
      />
      <div className="mt-7">
        <CompareClient />
      </div>
    </div>
  );
}
