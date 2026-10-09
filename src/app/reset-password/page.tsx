"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError, PasswordInput } from "@/components/ui/Field";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { withNext } from "@/lib/auth/safe-next";
import { MIN_PASSWORD, passwordProblem } from "@/lib/auth/password-policy";

const PASSWORD_RULE = `At least ${MIN_PASSWORD} characters, not a common password, and not your email address.`;

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
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setLinkState("valid");
        setAccountEmail(session?.user.email ?? "");
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
          setAccountEmail(data.session.user.email ?? "");
          return;
        }
        window.setTimeout(async () => {
          if (cancelled) return;
          const again = await supabase.auth.getSession();
          setLinkState(again.data.session ? "valid" : "invalid");
          setAccountEmail(again.data.session?.user.email ?? "");
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
    const weak = passwordProblem(password, accountEmail);
    if (weak) errors.password = weak;
    if (password !== confirm) errors.confirm = "Both passwords must match.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Sign out so the new password is used deliberately on the next log in.
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
          className="text-app-body text-[var(--text-secondary)]"
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
            Back to log in
          </Link>
        }
      >
        <Link
          href={withNext("/forgot-password", next)}
          className="inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[var(--surface-selected)] px-5 text-app-body font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="You will be logged out of other sessions and asked to log in with the new password."
    >
      <form method="post" onSubmit={submit} className="grid gap-4" noValidate>
        <Field
          label="New password"
          htmlFor="new-password"
          error={fieldErrors.password}
          help={PASSWORD_RULE}
        >
          <PasswordInput
            id="new-password"
            name="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "new-password-error" : "new-password-help"}
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
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.confirm)}
            aria-describedby={fieldErrors.confirm ? "confirm-password-error" : undefined}
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
