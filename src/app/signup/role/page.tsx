"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, UserRound, Handshake, ArrowRight } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { partnerSignupEnabled } from "@/lib/auth/flags";
import { isCandidateDestination, safeNext, withNext } from "@/lib/auth/safe-next";

type Role = "employer" | "fde" | "partner";

function SignupRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  // An invited candidate should never be asked how they intend to use Fydell.
  const invitedCandidate = isCandidateDestination(next);

  const [selected, setSelected] = useState<Role | null>(null);
  const [firmName, setFirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const showPartner = partnerSignupEnabled();

  async function submitRole(role: Role, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (role === "fde" && next) {
        router.push(next);
        return;
      }
      router.push(data.redirectTo || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  // Resolve the candidate role silently and continue to the invitation.
  useEffect(() => {
    if (!invitedCandidate || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submitRole("fde");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedCandidate]);

  if (invitedCandidate) {
    return (
      <AuthShell title="Opening your evaluation">
        <p role="status" className="text-[14px] text-[var(--text-secondary)]">
          One moment while we take you to your invitation.
        </p>
        {error ? (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        ) : null}
      </AuthShell>
    );
  }

  const choices: {
    role: Role;
    icon: typeof Building2;
    title: string;
    body: string;
  }[] = [
    {
      role: "employer",
      icon: Building2,
      title: "I am hiring",
      body: "Create a workspace, invite candidates to an evaluation, and review the evidence behind their conclusions.",
    },
    {
      role: "fde",
      icon: UserRound,
      title: "I am a candidate",
      body: "Complete evaluations you are invited to and keep a record of the work you produced.",
    },
    ...(showPartner
      ? [
          {
            role: "partner" as Role,
            icon: Handshake,
            title: "I am a partner",
            body: "Refer candidates or companies into the network. Partner access is reviewed before it is granted.",
          },
        ]
      : []),
  ];

  return (
    <AuthShell
      title="How will you use Fydell?"
      description="This decides where you land. You can change it later in settings."
      width="wide"
    >
      <div className="grid gap-2.5">
        {choices.map(({ role, icon: Icon, title, body }) => (
          <div key={role}>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (role === "employer") {
                  router.push(withNext("/onboarding/employer", next));
                  return;
                }
                if (role === "fde") {
                  void submitRole("fde");
                  return;
                }
                setSelected((prev) => (prev === role ? null : role));
              }}
              disabled={loading}
              aria-expanded={role === "partner" ? selected === role : undefined}
              className="group flex w-full items-start gap-4 rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-4 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel)] disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-default)]">
                <Icon
                  className="h-4 w-4 text-[var(--text-secondary)]"
                  strokeWidth={1.7}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-[var(--text-primary)]">
                  {title}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  {body}
                </span>
              </span>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.7}
                aria-hidden
              />
            </button>

            {role === "partner" && selected === "partner" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRole("partner", { firmName: firmName.trim() || undefined });
                }}
                className="mt-2.5 grid gap-3 rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-4"
              >
                <Field label="Firm or organisation" htmlFor="partner-firm" optional>
                  <Input
                    id="partner-firm"
                    name="organization"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="Your firm"
                    autoComplete="organization"
                    autoFocus
                  />
                </Field>
                <Button type="submit" variant="primary" loading={loading}>
                  {loading ? "Submitting" : "Request partner access"}
                </Button>
              </form>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-5">
          <FormError>{error}</FormError>
        </div>
      ) : null}
    </AuthShell>
  );
}

export default function SignupRolePage() {
  return (
    <Suspense
      fallback={<div className="min-h-[100dvh] bg-[var(--surface-canvas)]" />}
    >
      <SignupRoleContent />
    </Suspense>
  );
}
