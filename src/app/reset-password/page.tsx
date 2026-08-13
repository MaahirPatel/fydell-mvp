"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError, PasswordInput } from "@/components/ui/Field";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { withNext } from "@/lib/auth/safe-next";

type LinkState = "checking" | "valid" | "invalid";

function ResetPasswordContent() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setLinkState("valid");
        setError(null);
      }
    });

    (async () => {
      try {
        // Recovery links carry tokens in the URL hash; detectSessionInUrl parses them.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setLinkState("valid");
          return;
        }
        window.setTimeout(async () => {
          if (cancelled) return;
          const again = await supabase.auth.getSession();
          setLinkState(again.data.session ? "valid" : "invalid");
        }, 400);
      } catch {
        if (!cancelled) setLinkState("invalid");
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const errors: Record<string, string> = {};
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    if (password !== confirm) errors.confirm = "Both passwords must match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Sign out so the new password is used deliberately on the next sign-in.
      await supabase.auth.signOut();
      router.push(withNext("/login?reset=1", next));
    } catch (err) {
      setError(
        err instanceof Error && err.message.length < 160
          ? err.message
          : "We could not update your password. Request a new link and try again.",
      );
      setLoading(false);
    }
  }

  if (linkState === "checking") {
    return (
      <AuthShell title="Choose a new password">
        <p
          role="status"
          className="text-[14px] text-[var(--text-secondary)]"
        >
          Checking your reset link.
        </p>
      </AuthShell>
    );
  }

  if (linkState === "invalid") {
    return (
      <AuthShell
        title="This link has expired"
        description="Password reset links are valid for one hour and can only be used once. Request a new one and we will email it straight away."
        footer={
          <Link
            href={withNext("/login", next)}
            className="font-medium text-[var(--text-primary)] underline underline-offset-2"
          >
            Back to sign in
          </Link>
        }
      >
        <Link
          href={withNext("/forgot-password", next)}
          className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[#eceef1] px-5 text-[15px] font-medium text-[#0a0b0d] transition-colors hover:bg-white"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="You will be signed out of other sessions and asked to sign in with the new password."
    >
      <form onSubmit={submit} className="grid gap-4">
        <Field
          label="New password"
          htmlFor="new-password"
          error={fieldErrors.password}
          help="At least 8 characters."
        >
          <PasswordInput
            id="new-password"
            name="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            autoFocus
            required
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirm-password"
          error={fieldErrors.confirm}
        >
          <PasswordInput
            id="confirm-password"
            name="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.confirm)}
            required
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="mt-1 w-full"
        >
          {loading ? "Saving" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
