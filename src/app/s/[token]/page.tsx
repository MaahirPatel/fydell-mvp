"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";

type Preview = {
  email: string;
  status: string;
  missionTitle?: string;
  missionObjective?: string;
  expectedOutcome?: string;
  organizationName?: string;
  expiresAt: string;
};

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/fde/invites/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid invitation");
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid invitation");
      }
    })();
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fde/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/s/${token}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not accept");
      router.push(data.redirectTo || "/app/fde");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[680px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Mission invitation
      </h1>

      {error ? (
        <p className="mt-4 text-[14px] text-[#fda4b0]">{error}</p>
      ) : info ? (
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-white/60">
            {info.organizationName || "An employer"} invited you ({info.email}) to work on:
          </p>
          <div className="mt-6 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5">
            <h2 className="text-[18px] font-semibold text-white">{info.missionTitle}</h2>
            {info.missionObjective && (
              <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/70">
                {info.missionObjective}
              </p>
            )}
            {info.expectedOutcome && (
              <>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.06em] text-white/45">
                  Expected outcome
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/70">
                  {info.expectedOutcome}
                </p>
              </>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={accept}
              className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {busy ? "Accepting…" : "Accept invitation"}
            </button>
            <Link
              href={`/login?next=${encodeURIComponent(`/s/${token}`)}`}
              className="inline-flex h-10 items-center text-[13px] text-white/55"
            >
              Sign in first
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(`/s/${token}`)}`}
              className="inline-flex h-10 items-center text-[13px] text-white/55"
            >
              Need an account?
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-4 text-white/50">Loading invitation…</p>
      )}
    </main>
  );
}
