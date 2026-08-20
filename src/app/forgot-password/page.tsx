"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import TurnstileField from "@/components/security/TurnstileField";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/Field";
import { withNext } from "@/lib/auth/safe-next";

function humanizeResetError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many requests. Wait a few minutes before trying again.";
  }
  if (lower.includes("captcha") || lower.includes("turnstile")) {
    return "The verification check did not complete. Reload the page and try again.";
  }
  if (lower.includes("invalid email") || lower.includes("email address")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach Fydell. Check your connection and try again.";
  }
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We could not send the reset link. Try again shortly.";
  }
  return raw;
}

function ForgotPasswordContent() {
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSent(true);
    } catch (err) {
      setError(humanizeResetError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  const backToSignIn = (
    <Link
      href={withNext("/login", next)}
      className="font-medium text-[var(--text-primary)] underline underline-offset-2"
    >
      Back to sign in
    </Link>
  );

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        description="If an account exists for that address, we have sent a link to choose a new password. The link expires in one hour."
        footer={backToSignIn}
      >
        <div className="grid gap-4">
          {/* Neutral by design: the response is identical whether or not the
              account exists, so this form cannot confirm who has an account. */}
          <FormSuccess>Reset link sent to {email}, if that account exists.</FormSuccess>
          <p className="text-[13px] leading-[1.6] text-[var(--text-secondary)]">
            Nothing arrived after a few minutes? Check your spam folder, then{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-medium text-[var(--text-primary)] underline underline-offset-2"
            >
              try a different address
            </button>
            .
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you sign in with and we will send you a link to choose a new password."
      footer={backToSignIn}
    >
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Work email" htmlFor="reset-email">
          <Input
            id="reset-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </Field>

        <TurnstileField onToken={setCaptchaToken} />

        {error ? <FormError>{error}</FormError> : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="mt-1 w-full"
        >
          {loading ? "Sending" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
