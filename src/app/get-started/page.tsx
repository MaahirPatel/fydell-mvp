import Link from "next/link";
import { ArrowRight, Code2, Users } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import DemoWorkspaceOption from "@/components/marketing/site/DemoWorkspaceOption";

export const metadata = {
  title: "Get started",
  description: "Create an Engineering Passport as a developer, or set up a hiring workspace for your team.",
  alternates: { canonical: "/get-started" },
};

const PATHS = [
  {
    href: "/signup?as=developer",
    icon: Code2,
    title: "I'm a developer",
    body: "Build an Engineering Passport from your public GitHub projects and simulations. Free, and private until you share it.",
    accent: "bg-[var(--field-teal)] text-[var(--ink-teal)]",
  },
  {
    href: "/signup?as=employer",
    icon: Users,
    title: "I'm hiring",
    body: "Create a workspace for your team, define a role, and invite candidates to a simulation.",
    accent: "bg-[var(--field-violet)] text-[var(--ink-violet)]",
  },
] as const;

export default function GetStartedPage() {
  return (
    <AuthShell
      title="How will you use Fydell?"
      description="Invited to an assessment by an employer? Open the link in your invitation instead."
      width="wide"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <ul className="grid gap-3">
        {PATHS.map(({ href, icon: Icon, title, body, accent }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-4 rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel)]"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${accent}`}>
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-app-body font-medium text-[var(--text-primary)]">{title}</span>
                <span className="mt-1 block text-app-body leading-[1.55] text-[var(--text-secondary)]">{body}</span>
              </span>
              <ArrowRight
                aria-hidden
                className="mt-2.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <DemoWorkspaceOption />
      </div>
    </AuthShell>
  );
}
