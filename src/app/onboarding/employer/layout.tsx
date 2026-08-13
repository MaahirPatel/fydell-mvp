import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your workspace",
  description: "Name your Fydell workspace and open your first evaluation.",
  robots: { index: false, follow: false },
};

export default function OnboardingEmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
