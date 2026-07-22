"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import {
  AuthRequiredError,
  loginReturnUrl,
  patchSession,
  resolveSessionByToken,
  stageForStatus,
} from "@/lib/relay/session-client";

const CONSENT_VERSION = "relay-consent-2026-07-v1";

const RULES = [
  "This is a synthetic Forward Deployed Engineer (FDE) deployment for Northbeam Logistics — a simulated client, not a live production system.",
  "Runs in-browser for 55 minutes, real Python via Pyodide — requires Chrome or Edge (checked on the next screen).",
  "Every file save, command run, chat message, and submission is recorded as timestamped evidence.",
  "You may only run allowlisted commands inside the workspace: test, pytest, evals, preview, reconcile.",
  "Sensitive actions (refunds, account locks, legal escalation) require human approval — never auto-execute them.",
  "You'll get one immutable ship. Once you ship, your files are frozen for evidence review.",
  "No real customer data or systems are touched — Northbeam Logistics and its contacts are entirely synthetic.",
  "No overall candidate score is produced. Typing speed, prompt count, and time-in-file are not used as evidence.",
  "If you need a disability accommodation (extra time, assistive tech), stop and contact the inviting employer before starting — the timer must not begin until that is arranged.",
];

export default function RelayConsentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { sessionId: sid, status } = await resolveSessionByToken(token);
        const stage = stageForStatus(status);
        if (stage && stage !== "consent") {
          router.replace(`/s/${token}/${stage}`);
          return;
        }
        setSessionId(sid);
        setLoading(false);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.replace(loginReturnUrl(`/s/${token}/consent`));
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load session");
        setLoading(false);
      }
    })();
  }, [token, router]);

  async function acceptAndContinue() {
    if (!sessionId || accepting) return;
    setAccepting(true);
    setError(null);
    try {
      await patchSession(sessionId, "consent", { consentVersion: CONSENT_VERSION });
      router.push(`/s/${token}/preflight`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not record your consent: ${err.message}. Retry before continuing.`
          : "Could not record your consent. Retry before continuing."
      );
      setAccepting(false);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[680px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Before you start
      </p>
      <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        How Project Relay works
      </h1>
      <p className="mt-1.5 text-[13px] text-white/45">Northbeam Logistics · Synthetic FDE deployment</p>

      {error && (
        <p role="alert" className="mt-6 rounded-[10px] border border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2.5 text-[13.5px] text-[#fda4b0]">
          {error}
        </p>
      )}
      {error && !sessionId ? null : loading ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            Project Relay places you as a Forward Deployed Engineer on a 55-minute synthetic deployment
            for Northbeam Logistics, running real Python in your browser (Chrome or Edge, no install
            required). It produces work evidence for a human hiring decision — not a predicted
            job-performance score, personality profile, or automated hire/no-hire recommendation.
          </p>

          <ul className="mt-6 space-y-3">
            {RULES.map((rule) => (
              <li
                key={rule}
                className="flex gap-3 rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/80 px-4 py-3 text-[13.5px] leading-relaxed text-white/75"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BFF]" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={accepting}
            onClick={() => void acceptAndContinue()}
            className="mt-8 inline-flex h-11 items-center rounded-[9px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C] disabled:opacity-60"
          >
            {accepting ? "Recording consent…" : "I understand — continue to setup"}
          </button>
        </>
      )}
    </main>
  );
}
