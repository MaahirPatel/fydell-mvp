"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import ResendConfirmation from "@/components/auth/ResendConfirmation";
import { withNext } from "@/lib/auth/safe-next";

function CheckEmailContent() {
  const params = useSearchParams();
  const next = params.get("next");
  const email = (params.get("email") ?? "").slice(0, 254);

  return (
    <AuthShell
      title="Confirm your email"
      description={
        email
          ? `We sent a confirmation link to ${email}. Open it to finish setting up your account. The link works once and expires after one hour.`
          : "Your account needs a confirmed email address before you can sign in. Enter it below and we will send a new link."
      }
      footer={
        <p className="text-app-meta text-[var(--text-secondary)]">
          Already confirmed?{" "}
          <Link href={withNext("/login", next)} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <p className="mb-4 text-app-meta text-[var(--text-secondary)]">Nothing arrived? Check spam, then ask for a new link.</p>
      <ResendConfirmation initialEmail={email} next={next} />
    </AuthShell>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}>
      <CheckEmailContent />
    </Suspense>
  );
}
