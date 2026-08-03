"use client";

/**
 * Candidate result page: polls until scoring completes, then shows the
 * evidence-backed result, share URL and the pilot feedback form.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MicroResultView } from "./MicroResultView";
import { FeedbackForm } from "./FeedbackForm";
import type { MicroResult } from "@/lib/simulations/micro-scoring";

interface ResultPayload {
  ready: boolean;
  failed?: boolean;
  result?: MicroResult;
  shareUrl?: string | null;
  credential?: { credential_number: string } | null;
}

export function MicroResultClient({ sessionId }: { sessionId: string }) {
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const attemptsRef = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/results/${sessionId}`);
      const data = (await res.json()) as ResultPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load your result");
      setPayload(data);
      setError(null);
      if (!data.ready) {
        attemptsRef.current += 1;
        // Retry scoring if it failed, then keep polling.
        if (data.failed && attemptsRef.current <= 3) {
          await fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(() => {});
        }
        if (attemptsRef.current < 20) setTimeout(() => void load(), 2500);
        else setError("Scoring is taking longer than expected. Refresh this page in a moment. Your work is safe.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your result");
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyShare = async () => {
    if (!payload?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(payload.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your result link:", payload.shareUrl);
    }
  };

  if (error && !payload?.ready) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-[14px] text-slate-700">{error}</p>
          <button
            onClick={() => {
              attemptsRef.current = 0;
              void load();
            }}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  if (!payload || !payload.ready || !payload.result) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" aria-hidden />
          <p className="mt-4 text-[15px] font-medium text-slate-800">Scoring your work…</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Your submission is saved. This usually takes a few seconds.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <MicroResultView result={payload.result} />

      {/* actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Link
          href="/simulations"
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-slate-800"
        >
          Return to simulations
        </Link>
        {payload.shareUrl && (
          <button
            onClick={() => void copyShare()}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Link copied ✓" : "Share result"}
          </button>
        )}
        <button
          onClick={() => {
            setShowFeedback(true);
            setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }}
          className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-2.5 text-[13.5px] font-semibold text-violet-700 hover:bg-violet-100"
        >
          Give feedback
        </button>
        {payload.credential && (
          <span className="ml-auto text-[12px] text-slate-400">
            Credential {payload.credential.credential_number}
          </span>
        )}
      </div>

      <div ref={feedbackRef} className="mt-5">
        {showFeedback && <FeedbackForm sessionId={sessionId} />}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#101a33] text-white">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center px-4">
          <Link href="/" className="text-[15px] font-bold tracking-tight">Fydell</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8">{children}</main>
    </div>
  );
}
