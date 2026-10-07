import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { withNext } from "@/lib/auth/safe-next";

// Requires authentication at request time; cannot be statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up your Builder Profile",
  description: "Add your basics and your first project to your Fydell Builder Profile.",
  robots: { index: false, follow: false },
};

export default async function OnboardingEngineerLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect(withNext("/login", "/onboarding/engineer"));
  return children;
}
