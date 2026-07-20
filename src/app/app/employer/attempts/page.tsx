"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Attempt = {
  id: string;
  missionId: string;
  missionTitle: string;
  candidateName: string;
  candidateEmail: string | null;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  accepted: "Accepted",
  preflight: "Preflight",
  ready: "Ready",
  active: "Working",
  recovering: "Recovering",
  submitted: "Submitted",
  processing: "Generating evidence",
  receipt_ready: "Evidence ready",
  technical_failure: "Technical failure",
  withdrawn: "Withdrawn",
};

const EVIDENCE_VISIBLE = ["submitted", "processing", "receipt_ready"];

/** Candidate sessions / Project Relay attempts — not the simulation library. */
export default function EmployerAttemptsPage() {
  const [sessions, setSessions] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/simulations", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load attempts");
        setSessions(data.sessions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load attempts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Attempts
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            Candidate sessions
          </h1>
          <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
            Every real Project Relay attempt for your published missions — from invite through
            evidence. Preview walkthroughs are excluded.
          </p>
        </div>
        <Link
          href="/app/employer/simulations"
          className="inline-flex h-10 shrink-0 items-center rounded-[9px] border border-white/15 px-4 text-[13px] text-white/80"
        >
          Simulation library
        </Link>
      </div>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : sessions === null ? (
        <div className="mt-8 animate-pulse space-y-3" aria-busy="true">
          <div className="h-16 rounded-[14px] bg-white/5" />
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : sessions.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            No attempts yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Publish a simulation from the library, invite a candidate, and their Project Relay
            session will appear here.
          </p>
          <Link
            href="/app/employer/simulations"
            className="mt-6 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Open simulation library
          </Link>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {sessions.map((s) => {
            const href = EVIDENCE_VISIBLE.includes(s.status)
              ? `/app/employer/evidence/${s.id}`
              : `/app/employer/missions/${s.missionId}`;
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{s.missionTitle}</p>
                    <p className="mt-0.5 truncate text-white/45">
                      {s.candidateEmail || s.candidateName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/60">
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
