"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  PasswordInput,
} from "@/components/ui/Field";
import { safeAdminNext, safeNext, withNext } from "@/lib/auth/safe-next";
import { desktopAuthorizePath, isValidDesktopState } from "@/lib/auth/desktop-state";

/**
 * Errors are deliberately non-revealing: an unknown email and a wrong password
 * return the same message, so the form cannot be used to enumerate accounts.
 * Provider and network failures are distinguished because they are actionable.
 */
function humanizeLoginError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("not found") ||
    lower.includes("incorrect")
  ) {
    return "That email and password do not match. Check both and try again.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("timeout")) {
    return "We could not reach Fydell. Check your connection and try again.";
  }
  if (
    lower.includes("supabase") ||
    lower.includes("database") ||
    lower.includes("503") ||
    // Post-login resolution builds the admin client, so a refused project
    // reaches this form as the workspace copy. On a sign-in page that reads as
    // "your workspace is broken" when the accurate statement is that sign-in
    // itself cannot complete right now.
    lower.includes("workspace is temporarily unavailable")
  ) {
    return "Sign-in is temporarily unavailable. Try again shortly.";
  }
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We could not sign you in. Try again.";
  }
  return raw;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const returnPath = safeNext(rawNext);
  const justReset = searchParams.get("reset") === "1";
  // Desktop sign-in flow (W1): the desktop app opens /login?desktop=1&state=<opaque>.
  // After a successful sign-in the candidate is sent to the desktop authorize
  // endpoint, which issues the one-time code for the app. Inactive unless the
  // desktop opened this page with those exact params.
  const desktopState =
    searchParams.get("desktop") === "1" ? searchParams.get("state") : null;
  const desktopChallenge = desktopState ? searchParams.get("code_challenge") : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const hydrated = useHydrated();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: rawNext }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "email_not_confirmed" && typeof data.redirectTo === "string") {
        router.push(data.redirectTo);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      // An invited candidate returns to their invitation, not a generic
      // dashboard. Operators are always routed by the server.
      const isOperator = data.role === "platform_admin" || data.role === "admin";
      if (desktopState && isValidDesktopState(desktopState)) {
        // A full navigation: the authorize route answers with a redirect to the
        // fydell:// scheme, which client-side routing cannot follow.
        window.location.assign(desktopAuthorizePath(desktopState, desktopChallenge));
        setHandedOff(true);
        setLoading(false);
        return;
      }
      const adminReturn = isOperator ? safeAdminNext(rawNext) : null;
      if (adminReturn) {
        router.push(adminReturn);
        return;
      }
      if (returnPath && !isOperator) {
        router.push(returnPath);
        return;
      }
      router.push(
        typeof data.redirectTo === "string" && data.redirectTo
          ? data.redirectTo
          : "/app/employer",
      );
    } catch (err) {
      setError(humanizeLoginError(err instanceof Error ? err.message : "Something went wrong"));
      setLoading(false);
    }
  }

  if (handedOff && desktopState) {
    return (
      <div className="grid gap-4">
        <FormSuccess>
          You are signed in. Your browser will ask to open the Fydell app; allow it, then
          return to the app. You can close this tab.
        </FormSuccess>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() =>
            window.location.assign(desktopAuthorizePath(desktopState, desktopChallenge))
          }
        >
          Open the Fydell app again
        </Button>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={submit} className="grid gap-4">
      {justReset && !error ? (
        <FormSuccess>Password updated. Log in with your new password.</FormSuccess>
      ) : null}

      <Field label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoFocus
          disabled={loading}
          required
        />
      </Field>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="login-password"
            className="text-app-meta font-medium text-[var(--text-primary)]"
          >
            Password
          </label>
          <Link
            href={withNext("/forgot-password", rawNext)}
            className="text-app-meta text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="mt-1.5">
          <PasswordInput
            id="login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />
        </div>
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!hydrated}
        className="mt-1 w-full"
      >
        {loading ? "Logging in" : "Log in"}
      </Button>
    </form>
  );
}
