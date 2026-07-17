"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stageForStatus } from "@/lib/relay/session-client";

type Session = {
  id: string;
  missionTitle: string;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  accepted: "Accepted — continue setup",
  preflight: "In setup",
  ready: "Ready to start",
  active: "In progress",
  recovering: "In progress (recovering)",
  submitted: "Submitted — evidence pending",
  processing: "Generating evidence",
  receipt_ready: "Evidence ready",
  technical_failure: "Technical failure — not billed",
  withdrawn: "Withdrawn",
};

const RESUMABLE_LABEL: Record<string, string> = {
  accepted: "Continue",
  preflight: "Continue",
  ready: "Continue",
  active: "Continue",
  recovering: "Continue",
  submitted: "View status",
  processing: "View status",
  receipt_ready: "View status",
  technical_failure: "View status",
  withdrawn: "View status",
};

export default function FdeSimulationsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fde/sessions", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load simulations");
        setSessions(data.sessions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load simulations");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Simulations</p>
      <h1 className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
        Your Project Relay sessions
      </h1>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
        Use the private link in your invitation email to resume fastest — or continue from here
        while you're signed in.
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
            No simulations yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            When you accept a mission invitation, your Project Relay session will show up here.
          </p>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {sessions.map((s) => {
            const stage = stageForStatus(s.status);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px]">
                <div>
                  <p className="font-medium text-white">{s.missionTitle}</p>
                  <p className="mt-0.5 text-white/45">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/55">{STATUS_LABEL[s.status] || s.status}</span>
                  {stage && (
                    <Link
                      href={`/s/${s.id}/${stage}`}
                      className="rounded-[8px] bg-[#F1F2F4] px-3 py-1.5 text-[12.5px] font-semibold text-[#08090C] transition hover:bg-white"
                    >
                      {RESUMABLE_LABEL[s.status] || "Open"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
