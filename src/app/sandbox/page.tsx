import type { Metadata } from "next";
import GuidedDemo from "@/components/sandbox/demo/GuidedDemo";

export const metadata: Metadata = {
  title: "Guided demo",
  description:
    "Walk through a Fydell hiring loop without an account: an engineer's Passport, a real engineering task with tests that run in your browser, and the hiring team's review of the work.",
};

export default function SandboxPage() {
  return <GuidedDemo />;
}
