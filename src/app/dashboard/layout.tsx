import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getAuthenticatedUser, resolvePostLoginDestination } from "@/lib/auth/resolve-post-login";
import { getCompanySession, getAdminSession } from "@/lib/auth";

export const metadata = { title: "Fydell" };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  const company = await getCompanySession();
  const admin = await getAdminSession();

  if (!user && !company && !admin) {
    redirect("/login?next=/dashboard");
  }

  if (user?.email) {
    const dest = await resolvePostLoginDestination(user.email, user.id);
    if (dest.kind === "admin") redirect(dest.path);
    if (dest.kind === "onboarding") redirect(dest.path);
    if (dest.kind === "candidate") redirect(dest.path);
    if (dest.kind === "setup") redirect(`${dest.path}?reason=${dest.reason}`);
  }

  return <DashboardShell>{children}</DashboardShell>;
}
