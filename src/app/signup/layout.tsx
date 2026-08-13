import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Fydell account and set up your company workspace.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
