"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, PasswordInput } from "@/components/ui/Field";
import { isEmployerDestination, safeNext, withNext } from "@/lib/auth/safe-next";
import { MIN_PASSWORD, passwordProblem } from "@/lib/auth/password-policy";
import s from "./auth.module.css";

export type SignupPath = "employer" | "fde" | "partner";

/** Where a new account goes when no destination was carried in. */
export const FIRST_RUN: Record<SignupPath, string | null> = {
  fde: "/onboarding/engineer",
  employer: "/onboarding/employer",
  partner: null,
};

function humanizeAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Log in instead.";
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return "That password is too easy to guess. Choose a less common one.";
  }
  if (lower.includes("reserved")) {
    return "That company name is reserved. Use your company's full name.";
  }
  if (lower.includes("invalid email") || lower.includes("email address")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach Fydell. Check your connection and try again.";
  }
  if (lower.includes("database not configured") || lower.includes("supabase") || lower.includes("not configured")) {
    return "Account creation is temporarily unavailable. Try again shortly.";
  }
  // Never surface raw provider dumps.
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We could not create your account. Check your details and try again.";
  }
  return raw.replace(/\b(S|s)ign(ing)? in\b/g, (_m, s: string, ing: string | undefined) => `${s === "S" ? "L" : "l"}og${ing ? "ging" : ""} in`);
}

const CHOICES: { path: SignupPath; title: string; body: string }[] = [
  { path: "fde", title: "I'm an engineer", body: "Build a Builder Profile from your projects and take tasks you're invited to." },
  { path: "employer", title: "I'm hiring", body: "Create a workspace, publish an engineering role and invite candidates." },
];

const PARTNER_CHOICE = {
  path: "partner" as const,
  title: "I'm a partner",
  body: "Refer candidates or companies. Partner access is reviewed before it is granted.",
};

export default function SignupForm({
  next,
  path,
  onPathChange,
  chooseRole,
  partnerEnabled = false,
}: {
  /** Raw `next` from the URL; validated here. */
  next: string | null;
  path: SignupPath | null;
  onPathChange?: (path: SignupPath) => void;
  /** False for invited candidates and applicants, who are never asked. */
  chooseRole: boolean;
  partnerEnabled?: boolean;
}) {
  const router = useRouter();
  const returnPath = safeNext(next);
  const employerReturn = isEmployerDestination(returnPath);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const hydrated = useHydrated();

  const choices = partnerEnabled ? [...CHOICES, PARTNER_CHOICE] : CHOICES;
  const longEnough = password.length >= MIN_PASSWORD;
  const passwordIssue = longEnough ? passwordProblem(password, email) : null;
  const passwordOk = longEnough && !passwordIssue;
  const remaining = Math.max(0, MIN_PASSWORD - password.length);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (chooseRole && !path) nextErrors.path = "Choose how you'll use Fydell.";
    if (!name.trim()) nextErrors.name = "Enter your full name.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    const weak = passwordProblem(password, email);
    if (weak) nextErrors.password = weak;
    if (path === "employer" && !companyName.trim()) nextErrors.companyName = "Enter your company name.";
    if (!acceptedTerms) nextErrors.acceptedTerms = "Accept the terms and privacy notice to continue.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function clearField(key: string) {
    if (!fieldErrors[key]) return;
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || redirecting) return;
    if (!validate()) return;
    setLoading(true);
    setError(null);
    // An invitation destination means this is a candidate, so they never pass
    // through role selection or workspace onboarding.
    const sentPath: SignupPath | null = returnPath && !employerReturn ? (path ?? "fde") : path;
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: sentPath,
          name,
          email,
          password,
          companyName: sentPath === "employer" ? companyName : undefined,
          next: returnPath ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; redirectTo?: string; needsConfirmation?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      setRedirecting(true);
      if (data.needsConfirmation && data.redirectTo) {
        router.push(data.redirectTo);
        return;
      }
      if (returnPath && !employerReturn) {
        router.push(returnPath);
        return;
      }
      if (employerReturn && returnPath) {
        router.push(data.redirectTo === "/signup/role" ? withNext("/onboarding/employer", returnPath) : returnPath);
        return;
      }
      const firstRun = sentPath ? FIRST_RUN[sentPath] : null;
      router.push(firstRun ?? data.redirectTo ?? "/signup/role");
    } catch (err) {
      setError(humanizeAuthError(err instanceof Error ? err.message : "Something went wrong"));
      setLoading(false);
    }
  }

  const busy = loading || redirecting;

  return (
    <form method="post" onSubmit={submit} className="grid gap-4" noValidate aria-busy={busy || undefined}>
      {chooseRole ? (
        <fieldset aria-describedby={fieldErrors.path ? "signup-path-error" : undefined}>
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">How will you use Fydell?</legend>
          <div className={`mt-1.5 grid gap-2 ${choices.length === 2 ? "sm:grid-cols-2" : ""}`}>
            {choices.map((choice) => (
              <label key={choice.path} className={s.choice}>
                <input
                  type="radio"
                  name="signup-path"
                  value={choice.path}
                  checked={path === choice.path}
                  onChange={() => {
                    onPathChange?.(choice.path);
                    clearField("path");
                  }}
                  disabled={busy}
                />
                <span className={s.radioDot} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-app-body font-medium text-[var(--text-primary)]">{choice.title}</span>
                  <span className="mt-0.5 block text-app-meta leading-[1.5] text-[var(--text-secondary)]">{choice.body}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.path ? (
            <p id="signup-path-error" className="mt-1.5 text-app-meta text-[var(--fydell-risk)]">
              {fieldErrors.path}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <Field label="Full name" htmlFor="signup-name" error={fieldErrors.name}>
        <Input
          id="signup-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearField("name");
          }}
          autoComplete="name"
          invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
          disabled={busy}
          required
        />
      </Field>

      {path === "employer" ? (
        <Field label="Company name" htmlFor="signup-company" error={fieldErrors.companyName} help="Your workspace name. Candidates see it on invitations.">
          <Input
            id="signup-company"
            name="organization"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              clearField("companyName");
            }}
            autoComplete="organization"
            invalid={Boolean(fieldErrors.companyName)}
            aria-describedby={fieldErrors.companyName ? "signup-company-error" : "signup-company-help"}
            disabled={busy}
            required
          />
        </Field>
      ) : null}

      <Field label={path === "employer" ? "Work email" : "Email"} htmlFor="signup-email" error={fieldErrors.email}>
        <Input
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearField("email");
          }}
          autoComplete="email"
          spellCheck={false}
          invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          disabled={busy}
          required
        />
      </Field>

      <div>
        <label htmlFor="signup-password" className="text-app-meta font-medium text-[var(--text-primary)]">
          Password
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="signup-password"
            name="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearField("password");
            }}
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            aria-describedby="signup-password-rule"
            disabled={busy}
            required
          />
        </div>
        <p
          id="signup-password-rule"
          className={`mt-1.5 flex items-center gap-1.5 text-app-meta leading-[1.5] ${
            fieldErrors.password || passwordIssue ? "text-[var(--fydell-risk)]" : passwordOk ? "text-[var(--status-positive-ink)]" : "text-[var(--text-secondary)]"
          }`}
          aria-live="polite"
        >
          <span
            aria-hidden
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
              passwordOk ? "border-transparent bg-[var(--status-positive-ink)] text-[var(--surface-raised)]" : "border-current"
            }`}
          >
            {passwordOk ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
          </span>
          {fieldErrors.password ?? passwordIssue ?? `At least ${MIN_PASSWORD} characters, not a common password, and not your email address`}
          {!longEnough && password.length > 0 && !fieldErrors.password ? ` · ${remaining} more` : null}
        </p>
      </div>

      <div>
        <label className="flex items-start gap-3 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              clearField("acceptedTerms");
            }}
            className="auth-check"
            aria-describedby={fieldErrors.acceptedTerms ? "signup-terms-error" : undefined}
            disabled={busy}
            required
          />
          <span>
            I agree to the{" "}
            <a href="/terms" className="text-[var(--text-primary)] underline underline-offset-2">
              terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[var(--text-primary)] underline underline-offset-2">
              privacy notice
            </a>
            .
          </span>
        </label>
        {fieldErrors.acceptedTerms ? (
          <p id="signup-terms-error" className="mt-1.5 text-app-meta text-[var(--fydell-risk)]">
            {fieldErrors.acceptedTerms}
          </p>
        ) : null}
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!hydrated} className="mt-1 w-full">
        {redirecting ? "Opening your account" : loading ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
