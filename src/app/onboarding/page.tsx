import { redirect } from "next/navigation";
import { getCompanySession } from "@/lib/auth";
import { getUserById } from "@/lib/platform-store";
import OnboardingWizard from "@/components/platform/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await getCompanySession();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (user?.onboardingComplete) redirect("/dashboard");
  return <OnboardingWizard />;
}
