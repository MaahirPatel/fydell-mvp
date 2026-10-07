"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "./AuthShell";
import SignupForm, { type SignupPath } from "./SignupForm";
import { withNext } from "@/lib/auth/safe-next";

export type SignupAudience = "applicant" | "invited" | "open";

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
 * the right first-run flow without an extra screen. The aside follows the
 * choice: an engineer sees how a project is added, a hiring team sees the
 * task their candidates receive.
 */
export default function SignupView({
  audience,
  initialPath,
  next,
  partnerEnabled,
  engineerAside,
  employerAside,
}: {
  audience: SignupAudience;
  initialPath: SignupPath | null;
  next: string | null;
  partnerEnabled: boolean;
  engineerAside: React.ReactNode;
  employerAside: React.ReactNode;
}) {
  const [path, setPath] = useState<SignupPath | null>(initialPath);
  const chooseRole = audience === "open";
  const aside = path === "employer" ? employerAside : path === "partner" ? null : engineerAside;

  return (
    <AuthShell
      title={COPY[audience].title}
      description={COPY[audience].description}
      aside={aside ?? undefined}
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
      <SignupForm next={next} path={path} onPathChange={setPath} chooseRole={chooseRole} partnerEnabled={partnerEnabled} />
    </AuthShell>
  );
}
