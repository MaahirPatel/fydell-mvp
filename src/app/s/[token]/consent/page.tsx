"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import { resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";

const RULES = [
  "Every file save, command run, chat message, and submission is recorded as timestamped evidence.",
  "You may only run allowlisted commands inside the workspace: test, pytest, evals, preview.",
  "Sensitive actions (refunds, account locks, legal escalation) require human approval — never auto-execute them.",
  "You'll get one immutable submission. Once you submit, your files are frozen for evidence review.",
  "This is a simulation, not a live production system — no real customer data or systems are touched.",
  "No overall candidate score is produced. Typing speed, prompt count, and time-in-file are not used as evidence.",
  "If you need a disability accommodation (extra time, assistive tech), stop and contact the inviting employer before starting — the timer must not begin until that is arranged.",
];

export default function RelayConsentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await resolveSessionByToken(token);
        const stage = stageForStatus(status);
        if (stage && stage !== "consent") {
          router.replace(`/s/${token}/${stage}`);
          return;
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load session");
        setLoading(false);
      }
    })();
  }, [token, router]);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[680px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Before you start
      </p>
      <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        How Project Relay works
      </h1>

      {error ? (
        <p className="mt-6 text-[14px] text-[#fda4b0]">{error}</p>
      ) : loading ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            Project Relay is a 55-minute simulated deployment session, running real Python in your
            browser (no install required). It produces work evidence for a human hiring decision — not
            a predicted job-performance score, personality profile, or automated hire/no-hire
            recommendation.
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
            onClick={() => router.push(`/s/${token}/preflight`)}
            className="mt-8 inline-flex h-11 items-center rounded-[9px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C]"
          >
            I understand — continue to setup
          </button>
        </>
      )}
    </main>
  );
}
