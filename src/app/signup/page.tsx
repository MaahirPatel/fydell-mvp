"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import WorkspacePreviewScene from "@/components/auth/WorkspacePreviewScene";
import { isCandidateDestination, withNext } from "@/lib/auth/safe-next";

function SignupContent() {
  const next = useSearchParams().get("next");
  const candidate = isCandidateDestination(next);

  return (
    <AuthShell
      title="Create your Fydell account"
      description={
        candidate
          ? "Create an account to open the evaluation you were invited to. Your progress is saved as you work."
          : "Set up your account, then create a workspace for your company."
      }
      /* A candidate arriving from an invitation is not creating a workspace, so
         showing them the employer setup path would be a lie about their next
         screen. */
      aside={candidate ? undefined : <WorkspacePreviewScene />}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={withNext("/login", next)}
            className="font-medium text-[var(--text-primary)] underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <SignupContent />
    </Suspense>
  );
}
