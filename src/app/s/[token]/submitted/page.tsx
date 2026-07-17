"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";
import { fetchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";

const STATUS_COPY: Record<string, string> = {
  submitted: "Your submission is queued for evidence review.",
  processing: "We're generating your evidence findings now.",
  receipt_ready: "Your evidence findings are ready — issue a work receipt from your dashboard.",
  technical_failure: "This session was flagged as a technical failure and won't be billed.",
  withdrawn: "This session was withdrawn.",
};

export default function RelaySubmittedPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resolved = await resolveSessionByToken(token);
        const stage = stageForStatus(resolved.status);
        if (stage === "consent") return router.replace(`/s/${token}/consent`);
        if (stage === "preflight") return router.replace(`/s/${token}/preflight`);
        if (stage === "workspace") return router.replace(`/s/${token}/workspace`);

        const data = await fetchSession(resolved.sessionId);
        setStatus(data.session.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load session");
      }
    })();
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[560px] flex-col items-center justify-center bg-[#050609] px-5 py-8 text-center text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Submitted
      </h1>

      {error ? (
        <p className="mt-4 text-[14px] text-[#fda4b0]">{error}</p>
      ) : (
        <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-white/60">
          {status ? STATUS_COPY[status] || "Your session has been recorded." : "Loading…"}
        </p>
      )}

      <p className="mt-8 text-[13px] text-white/40">
        Nothing else is required from you right now. Work receipts stay in your control — you
        decide who sees the evidence from this session.
      </p>

      <Link
        href="/app/fde/receipts"
        className="mt-8 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
      >
        Go to my receipts
      </Link>
    </main>
  );
}
