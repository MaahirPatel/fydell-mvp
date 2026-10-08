"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "./AuthShell";
import SignupForm, { type SignupPath } from "./SignupForm";
import DemoWorkspaceOption from "@/components/marketing/site/DemoWorkspaceOption";
import { withNext } from "@/lib/auth/safe-next";

export type SignupAudience = "applicant" | "invited" | "open";
/** Whether the demo workspace is offered: after the form, first, or not at all (invitations). */
export type SignupDemo = "offer" | "first" | "none";

const COPY: Record<SignupAudience, { title: string; description: string }> = {
  applicant: {
    title: "Create your account to apply",
    description: "You'll come straight back to the application. Nothing is shared until you send it.",
  },
  invited: {
    title: "Create your account to open your invitation",
    description: "You'll go straight to the task you were invited to. Before anything starts, you'll see exactly what is recorded.",
  },
  open: {
    title: "Create your Fydell account",
    description: "Engineers build a Builder Profile from real projects. Hiring teams invite candidates to real engineering work.",
  },
};

/**
 * Signup with the role choice on the form itself, so a new account lands in
 * the right first-run flow without an extra screen. The product panel follows
 * the choice: a Builder Profile for engineers, applicant review for hiring.
 */
export default function SignupView({
  audience,
  initialPath,
  next,
  partnerEnabled,
  demo = "none",
}: {
  audience: SignupAudience;
  initialPath: SignupPath | null;
  next: string | null;
  partnerEnabled: boolean;
  demo?: SignupDemo;
}) {
  const [path, setPath] = useState<SignupPath | null>(initialPath);
  const chooseRole = audience === "open";

  return (
    <AuthShell
      title={COPY[audience].title}
      description={COPY[audience].description}
      showcase={path === "employer" ? "employer" : "engineer"}
      headerAction={
        <Link
          href={withNext("/login", next)}
          className="inline-flex h-8 items-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[13px] font-medium text-[var(--text-primary)] transition-colors duration-100 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
        >
          Sign in
        </Link>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href={withNext("/login", next)} className="font-medium text-[var(--text-primary)] underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      {demo === "first" ? (
        <div className="mb-6">
          <DemoWorkspaceOption prominent />
          <p className="mt-6 text-[13px] text-[var(--text-secondary)]">Or create your account now.</p>
        </div>
      ) : null}
      <SignupForm next={next} path={path} onPathChange={setPath} chooseRole={chooseRole} partnerEnabled={partnerEnabled} />
      {demo === "offer" ? (
        <div className="mt-6">
          <DemoWorkspaceOption />
        </div>
      ) : null}
    </AuthShell>
  );
}
