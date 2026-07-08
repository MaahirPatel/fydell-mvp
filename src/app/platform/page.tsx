import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanySession } from "@/lib/auth";
import { getUserById, listRolesForUser, listSimulationsForUser } from "@/lib/platform-store";
import { PlatformShell } from "@/components/platform/PlatformShell";
import PlatformLogoutButton from "@/components/platform/PlatformLogoutButton";
import CompanyDashboard from "@/components/platform/CompanyDashboard";

export default async function PlatformDashboard() {
  const session = await getCompanySession();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (!user?.onboardingComplete) redirect("/onboarding");

  const [roles, simulations] = await Promise.all([
    listRolesForUser(session.userId),
    listSimulationsForUser(session.userId)
  ]);

  return (
    <PlatformShell
      actions={
        <>
          <Link href="/platform/create" className="platform-btn-primary !h-9 !text-sm">
            + New simulation
          </Link>
          <PlatformLogoutButton />
        </>
      }
    >
      <CompanyDashboard
        companyName={user.companyName}
        roles={roles}
        simulations={simulations}
      />
    </PlatformShell>
  );
}
