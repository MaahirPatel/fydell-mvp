"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { isCandidateDestination, isEmployerDestination, safeNext, withNext } from "@/lib/auth/safe-next";

function LoginContent() {
  const next = useSearchParams().get("next");
  const safe = safeNext(next) ?? "";
  const candidate = isCandidateDestination(next);
  const applying = safe.startsWith("/jobs/");
  const passport = safe.startsWith("/app/candidate");
  const description = applying
    ? "Sign in to apply. You'll come straight back to the application, and nothing is shared until you send it."
    : passport
      ? "Sign in to your Passport."
      : candidate
        ? "Sign in and we'll take you straight back to your invitation."
        : isEmployerDestination(next)
          ? "Continue to the workspace where your team reviews candidates and their evidence."
          : "Sign in to your Builder Profile or your hiring workspace.";

  return (
    <AuthShell
      title="Sign in to Fydell"
      description={description}
      showcase={isEmployerDestination(next) ? "employer" : "engineer"}
      headerAction={
        <Link
          href={withNext("/signup", next)}
          className="inline-flex h-8 items-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[13px] font-medium text-[var(--text-primary)] transition-colors duration-100 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
        >
          Create account
        </Link>
      }
      footer={
        <>
          New to Fydell?{" "}
          <Link
            href={withNext("/signup", next)}
            className="font-medium text-[var(--text-primary)] underline underline-offset-2"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <LoginContent />
    </Suspense>
  );
}
