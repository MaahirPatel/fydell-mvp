import { redirect } from "next/navigation";
import { getCompanySession } from "@/lib/auth";
import { getUserById } from "@/lib/platform-store";
import SimulationBuilder from "@/components/platform/SimulationBuilder";

export default async function CreateSimulationPage() {
  const session = await getCompanySession();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (!user?.onboardingComplete) redirect("/onboarding");
  return <SimulationBuilder />;
}
