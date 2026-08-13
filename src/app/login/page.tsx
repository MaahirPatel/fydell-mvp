"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { isCandidateDestination, withNext } from "@/lib/auth/safe-next";

function LoginContent() {
  const next = useSearchParams().get("next");
  const candidate = isCandidateDestination(next);

  return (
    <AuthShell
      title="Sign in to Fydell"
      description={
        candidate
          ? "Sign in and we will take you straight back to your evaluation."
          : undefined
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
