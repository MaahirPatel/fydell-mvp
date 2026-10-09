import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import OwnerProfile from "@/components/profile/OwnerProfile";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function DeskProfilePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Fdesk%2Fprofile");
  return <OwnerProfile user={user} />;
}
