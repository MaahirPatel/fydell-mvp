"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormError,
  Input,
  PasswordInput,
} from "@/components/ui/Field";
import {
  isEmployerDestination,
  safeNext,
  withNext,
} from "@/lib/auth/safe-next";

export type SignupPath = "employer" | "fde" | "partner";

/**
 * Account creation fields only.
 *
 * The page owns the heading, the description and the sign-in link. Previously
 * both this component and the page rendered "Create your account" and
 * "Already have an account?", producing duplicate headings and two competing
 * sign-in links, only one of which preserved the intended destination.
 */

function humanizeAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("least"))) {
    return "Use a password with at least 8 characters.";
  }
  if (lower.includes("invalid email") || lower.includes("email address")) {
    return "Enter a valid work email address.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach Fydell. Check your connection and try again.";
  }
  if (lower.includes("database not configured") || lower.includes("supabase")) {
    return "Account creation is temporarily unavailable. Try again shortly.";
  }
  // Never surface raw provider dumps.
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We could not create your account. Check your details and try again.";
  }
  return raw;
}

export default function SignupForm({ path }: { path?: SignupPath }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = safeNext(searchParams.get("next"));
  const employerReturn = isEmployerDestination(returnPath);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your full name.";
    if (!email.trim() || !email.includes("@")) next.email = "Enter a valid work email.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (path === "employer" && !companyName.trim()) {
      next.companyName = "Enter your company name.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // An invitation destination means this is a candidate, so they never
          // pass through employer role selection or workspace onboarding.
          path: returnPath && !employerReturn ? (path ?? "fde") : path,
          name,
          email,
          password,
          companyName: path === "employer" ? companyName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      if (returnPath && !employerReturn) {
        router.push(returnPath);
        return;
      }
      if (employerReturn && returnPath) {
        router.push(
          data.redirectTo === "/signup/role"
            ? withNext("/onboarding/employer", returnPath)
            : returnPath,
        );
        return;
      }
      router.push(data.redirectTo || "/onboarding/employer");
    } catch (err) {
      setError(humanizeAuthError(err instanceof Error ? err.message : "Something went wrong"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label="Full name" htmlFor="signup-name" error={fieldErrors.name}>
        <Input
          id="signup-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (fieldErrors.name ? validate() : undefined)}
          placeholder="Jane Doe"
          autoComplete="name"
          invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
          required
        />
      </Field>

      {path === "employer" ? (
        <Field
          label="Company name"
          htmlFor="signup-company"
          error={fieldErrors.companyName}
        >
          <Input
            id="signup-company"
            name="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company"
            autoComplete="organization"
            invalid={Boolean(fieldErrors.companyName)}
            aria-describedby={
              fieldErrors.companyName ? "signup-company-error" : undefined
            }
            required
          />
        </Field>
      ) : null}

      <Field label="Work email" htmlFor="signup-email" error={fieldErrors.email}>
        <Input
          id="signup-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => (fieldErrors.email ? validate() : undefined)}
          placeholder="you@company.com"
          autoComplete="email"
          invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="signup-password"
        error={fieldErrors.password}
        help="At least 8 characters."
      >
        <PasswordInput
          id="signup-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
          autoComplete="new-password"
          invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "signup-password-error" : "signup-password-help"
          }
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
        {loading ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
