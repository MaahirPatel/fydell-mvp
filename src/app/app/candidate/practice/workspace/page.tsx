import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { PracticeTask } from "@/components/candidate/BuilderPractice";
import { PRACTICE_WORKSPACE } from "@/components/candidate/practice-paths";

export const metadata = { title: "Practice simulation workspace" };
export const dynamic = "force-dynamic";

export default async function PracticeWorkspacePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PRACTICE_WORKSPACE)}`);
  return <PracticeTask userId={user.id} />;
}
