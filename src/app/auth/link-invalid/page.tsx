"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/safe-next";

function LinkInvalidContent() {
  const next = useSearchParams().get("next");

  return (
    <AuthShell
      title="This link is no longer valid"
      description="Confirmation and recovery links expire after one hour and can only be used once. Request a new one and we will email it straight away."
    >
      <div className="flex flex-wrap gap-3">
        <ButtonLink
          href={withNext("/forgot-password", next)}
          variant="primary"
          size="lg"
        >
          Request a new link
        </ButtonLink>
        <ButtonLink href={withNext("/login", next)} variant="secondary" size="lg">
          Back to sign in
        </ButtonLink>
      </div>
    </AuthShell>
  );
}

export default function LinkInvalidPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <LinkInvalidContent />
    </Suspense>
  );
}
