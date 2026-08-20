import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { withNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = {
  title: "Create your workspace",
  description: "Name your Fydell workspace and open your first evaluation.",
  robots: { index: false, follow: false },
};

export default async function OnboardingEmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect(withNext("/login", "/onboarding/employer"));
  return children;
}
