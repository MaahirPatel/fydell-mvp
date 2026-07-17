"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EvidenceSession = {
  id: string;
  missionId: string;
  missionTitle: string;
  fdeName: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Awaiting evidence",
  processing: "Generating evidence",
  receipt_ready: "Evidence ready",
};

export default function EmployerEvidencePage() {
  const [sessions, setSessions] = useState<EvidenceSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/evidence", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load evidence");
        setSessions(data.sessions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load evidence");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Evidence</p>
      <h1 className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
        Mission sessions
      </h1>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
        Review evidence from FDEs who submitted their mission simulation, and record a decision.
      </p>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : sessions === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : sessions.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            Nothing to review yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Once an invited FDE submits their mission simulation, it will show up here.
          </p>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/employer/evidence/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] transition hover:bg-white/[0.03]"
              >
                <div>
                  <p className="font-medium text-white">{s.missionTitle}</p>
                  <p className="mt-0.5 text-white/45">{s.fdeName}</p>
                </div>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/60">
                  {STATUS_LABEL[s.status] || s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
