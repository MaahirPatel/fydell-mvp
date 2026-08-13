"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/safe-next";

function ConfirmationRequiredContent() {
  const next = useSearchParams().get("next");

  return (
    <AuthShell
      title="Your account is ready"
      description="Sign in with the email and password you just created to continue."
    >
      <ButtonLink
        href={withNext("/login", next)}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Sign in
      </ButtonLink>
    </AuthShell>
  );
}

export default function ConfirmationRequiredPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <ConfirmationRequiredContent />
    </Suspense>
  );
}
