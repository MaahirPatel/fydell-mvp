"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONSENT_COPY } from "@/lib/scenario";

interface Props {
  token: string;
  initialName: string;
  initialEmail: string;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConsentForm({ token, initialName, initialEmail }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = emailRe.test(email.trim());
  const canProceed = nameValid && emailValid && consent && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/apply/${token}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      router.push(`/apply/${token}/simulation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-ink-2">Full name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none transition-colors focus:border-blue"
          autoComplete="name"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-ink-2">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none transition-colors focus:border-blue"
          autoComplete="email"
        />
        {email.length > 0 && !emailValid && (
          <span className="text-sm text-coral">Enter a valid email address.</span>
        )}
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-teal"
        />
        <span className="text-sm leading-relaxed text-ink-2">{CONSENT_COPY}</span>
      </label>

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canProceed}
        className="mt-1 inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-navy px-7 font-semibold text-white shadow-[0_6px_16px_rgba(27,37,80,0.22)] transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:bg-teal enabled:hover:shadow-[0_10px_24px_rgba(20,184,166,0.32)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        Proceed to Simulation
      </button>
    </form>
  );
}
