"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { StatusTag } from "@/components/ui/StatusTag";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * Real workspace creation.
 *
 * This route was a five-line `redirect("/app/employer")` stub, so a company
 * that signed up had no screen on which to name its workspace even though
 * self-serve signup and `completeEmployerOnboarding()` were both live.
 *
 * The organization write itself is unchanged: this posts to the existing
 * `/api/auth/role` employer path.
 */

function humanizeWorkspaceError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("reserved")) {
    return "That name is reserved. Choose a different workspace name.";
  }
  if (lower.includes("unauthorized") || lower.includes("401")) {
    return "Your session expired. Sign in again to finish setting up your workspace.";
  }
  if (lower.includes("not configured") || lower.includes("503")) {
    return "Workspace creation is temporarily unavailable. Try again shortly.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "We could not reach Fydell. Check your connection and try again.";
  }
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We could not create your workspace. Try again.";
  }
  return raw;
}

function OnboardingContent() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const [step, setStep] = useState<"workspace" | "evaluation">("workspace");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const name = companyName.trim();
    if (!name) {
      setFieldError("Enter your company name.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "employer",
          companyName: name,
          companyWebsite: companyWebsite.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setStep("evaluation");
    } catch (err) {
      setError(humanizeWorkspaceError(err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  if (step === "evaluation") {
    return (
      <AuthShell
        title="Your workspace is ready"
        description={`${companyName.trim()} is set up. One evaluation is available to you now.`}
        width="wide"
      >
        <div className="rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-medium text-[var(--text-primary)]">
                Operations performance investigation
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                Reported yield fell last period. The candidate separates a
                measurement change from real production risk and defends the
                conclusion with evidence you can open.
              </p>
            </div>
            <StatusTag tone="good">Ready</StatusTag>
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-[var(--border-subtle)] pt-4">
            <div>
              <dt className="text-[12px] text-[var(--text-tertiary)]">Duration</dt>
              <dd className="mt-0.5 text-[13.5px] tabular-nums text-[var(--text-primary)]">
                20 minutes
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-[var(--text-tertiary)]">Discipline</dt>
              <dd className="mt-0.5 text-[13.5px] text-[var(--text-primary)]">
                Data analysis
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-[var(--text-tertiary)]">Produces</dt>
              <dd className="mt-0.5 text-[13.5px] text-[var(--text-primary)]">
                Evidence report
              </dd>
            </div>
          </dl>
        </div>

        <ul className="mt-5 grid gap-2.5">
          {[
            "Invite a candidate by email from your workspace.",
            "They complete the evaluation in one sitting.",
            "You read the conclusion and open the evidence behind each claim.",
          ].map((line) => (
            <li
              key={line}
              className="flex items-start gap-2.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]"
            >
              <Check
                className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--fydell-good)]"
                strokeWidth={2}
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <ButtonLink
            href={next ?? "/app/employer"}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Go to your workspace
          </ButtonLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your workspace"
      description="Your workspace holds your evaluations, candidates and reports. Only people you invite can see it."
    >
      <form onSubmit={createWorkspace} className="grid gap-4">
        <Field
          label="Company name"
          htmlFor="workspace-name"
          error={fieldError}
          help="This is what your team and your candidates will see."
        >
          <Input
            id="workspace-name"
            name="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
            invalid={Boolean(fieldError)}
            autoFocus
            required
          />
        </Field>

        <Field label="Company website" htmlFor="workspace-website" optional>
          <Input
            id="workspace-website"
            name="url"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            autoComplete="url"
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
          {loading ? "Creating workspace" : "Create workspace"}
        </Button>

        <button
          type="button"
          onClick={() => router.push("/app/employer")}
          className="mt-1 justify-self-center text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
        >
          Skip for now
        </button>
      </form>
    </AuthShell>
  );
}

export default function OnboardingEmployerPage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <OnboardingContent />
    </Suspense>
  );
}
