"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";

export default function CandidateInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{
    email: string;
    roleTitle?: string;
    organizationName?: string;
    consentVersion: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/pilot/invites/${token}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || "Invalid invitation");
      else setInfo(data);
    })();
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pilot/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentAccepted: consent, fullName }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/candidate/invite/${token}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not accept");
      router.push(data.redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[720px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Work trial invitation
      </h1>
      {error ? (
        <p className="mt-4 text-[14px] text-[#fda4b0]">{error}</p>
      ) : info ? (
        <>
          <p className="mt-3 text-[14px] text-white/60">
            {info.organizationName || "An employer"} invited you to complete Project Meridian
            for {info.roleTitle || "an FP&A role"} ({info.email}).
          </p>
          <div className="mt-8 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5 text-[13px] leading-relaxed text-white/65">
            <p className="font-medium text-white">Before you begin</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Fydell records stage progress, document opens, model edits, assumptions, and your final recommendation as evidence.</li>
              <li>The hiring team and Fydell reviewers may see the evidence report after submission.</li>
              <li>This is an evidence-backed work sample — not a pass/fail personality diagnosis.</li>
              <li>Request accommodations or withdraw via admin@fydell.com.</li>
              <li>Consent version: {info.consentVersion}</li>
            </ul>
          </div>
          <label className="mt-6 block text-[13px] text-white/65">
            Full name
            <input
              className="platform-input mt-1.5"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="mt-4 flex items-start gap-2 text-[13px] text-white/70">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I understand what is recorded and agree to continue.
          </label>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!consent || busy}
              onClick={accept}
              className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {busy ? "Accepting…" : "Accept and continue"}
            </button>
            <Link href="/login" className="inline-flex h-10 items-center text-[13px] text-white/55">
              Sign in first
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-4 text-white/50">Loading invitation…</p>
      )}
    </main>
  );
}
