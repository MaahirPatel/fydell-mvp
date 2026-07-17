"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Decision = {
  id: string;
  missionId: string;
  missionTitle: string;
  sessionId: string | null;
  fdeName: string;
  decision: string;
  structuredReason: string | null;
  evidenceGaps: string | null;
  createdAt: string;
};

const DECISION_LABEL: Record<string, string> = {
  advance: "Advance",
  hold: "Hold",
  decline: "Decline",
  hired: "Hired",
  withdrawn: "Withdrawn",
};

export default function EmployerDecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const d of decisions || []) {
      tally[d.decision] = (tally[d.decision] || 0) + 1;
    }
    return tally;
  }, [decisions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/decisions", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load decisions");
        setDecisions(data.decisions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load decisions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Decisions</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Your hiring decisions
      </h1>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
        Every decision you&apos;ve recorded against real evidence, across every mission.
      </p>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : decisions === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : decisions.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            No decisions yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Once you review evidence from a submitted mission and record advance, hold, or
            decline, it will show up here.
          </p>
          <Link
            href="/app/employer/evidence"
            className="mt-6 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Review evidence
          </Link>
        </section>
      ) : (
        <>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {Object.entries(counts).map(([key, count]) => (
              <li
                key={key}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3 py-1.5 text-[12px]"
              >
                <span className="font-semibold text-white">{count}</span>
                <span className="text-white/50">{DECISION_LABEL[key] || key}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {decisions.map((d) => (
            <li key={d.id}>
              <Link
                href={d.sessionId ? `/app/employer/evidence/${d.sessionId}` : `/app/employer/missions/${d.missionId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{d.missionTitle}</p>
                  <p className="mt-0.5 truncate text-white/45">{d.fdeName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-white/35">{new Date(d.createdAt).toLocaleDateString()}</span>
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-white/70">
                    {DECISION_LABEL[d.decision] || d.decision}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          </ul>
        </>
      )}
    </div>
  );
}
