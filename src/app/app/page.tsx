import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";

export const dynamic = "force-dynamic";

/** Sends each signed-in person to their own home: a hiring workspace, or their Passport. */
export default async function AppIndexRedirectPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp");
  const org = await requireOrgMember(user.id);
  redirect(org ? "/app/employer" : "/app/candidate/work-record");
}
