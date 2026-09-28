"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { isCandidateDestination, withNext } from "@/lib/auth/safe-next";

function SignupContent() {
  const params = useSearchParams();
  const next = params.get("next");
  const as = params.get("as");
  const candidate = isCandidateDestination(next);
  const audience = candidate ? "invited" : as === "developer" ? "developer" : as === "employer" ? "employer" : "unchosen";

  const copy = {
    invited: {
      title: "Create your Fydell account",
      description: "Create an account to open the assessment you were invited to. Your progress is saved as you work.",
    },
    developer: {
      title: "Create your developer account",
      description: "Your Engineering Passport starts here. No company workspace is created, and nothing is shared until you choose.",
    },
    employer: {
      title: "Create your hiring workspace",
      description: "Set up your account and company workspace, then define your first role.",
    },
    unchosen: {
      title: "Create your Fydell account",
      description: "You will choose whether you are a developer or hiring on the next step.",
    },
  }[audience];

  return (
    <AuthShell
      title={copy.title}
      description={copy.description}
      footer={
        <>
          Already have an account?{" "}
          <Link href={withNext("/login", next)} className="font-medium text-[var(--text-primary)] underline underline-offset-2">
            Sign in
          </Link>
          {audience === "developer" || audience === "employer" ? (
            <>
              {" · "}
              <Link href="/get-started" className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                {audience === "developer" ? "Hiring instead?" : "A developer instead?"}
              </Link>
            </>
          ) : null}
        </>
      }
    >
      <SignupForm path={audience === "developer" ? "fde" : audience === "employer" ? "employer" : undefined} />
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}>
      <SignupContent />
    </Suspense>
  );
}
