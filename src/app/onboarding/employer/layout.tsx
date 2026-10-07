import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { withNext } from "@/lib/auth/safe-next";

// Requires authentication at request time; cannot be statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up hiring",
  description: "Create your Fydell workspace, your first engineering role and your first candidate invitation.",
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
