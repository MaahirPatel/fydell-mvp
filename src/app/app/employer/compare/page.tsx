import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CompareClient from "@/components/employer/CompareClient";

export const metadata = { title: "Compare candidates | Fydell" };
export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer/compare");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  return (
    <div className="max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-slate-900">Compare candidates</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Same organization, same cohort, same evaluation version only. No universal ranking.
          </p>
        </div>
        <Link href="/app/employer/cohort" className="text-[13.5px] font-medium text-[#3157D5]">
          Back to cohort
        </Link>
      </div>
      <div className="mt-8">
        <CompareClient />
      </div>
    </div>
  );
}
