"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashPayload = {
  organizationName: string | null;
  roleTitle: string | null;
  pipeline: {
    invited: number;
    accepted: number;
    in_progress: number;
    submitted: number;
    report_ready: number;
  };
  invitesEnabled?: boolean;
};

export default function MeridianPage() {
  const [data, setData] = useState<DashPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pipeline = data?.pipeline;

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Work trial
      </p>
      <h1
        className="mt-1 text-[30px] text-white sm:text-[36px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Project Meridian
      </h1>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-white/55">
        A timed FP&A work trial. Candidates work through real finance problems; you review evidence
        after they submit. Nothing shows here until you invite someone.
      </p>

      {loading ? (
        <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white/5" />
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[18px] border border-white/10 bg-[#0A0C11]/90 p-6">
            <h2 className="text-[12px] uppercase tracking-[0.06em] text-white/45">Assigned role</h2>
            <p className="mt-2 text-[22px] text-white" style={{ fontWeight: 560 }}>
              {data?.roleTitle || "No role yet"}
            </p>
            <ul className="mt-5 space-y-3 text-[14px] text-white/60">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-[#3B5BFF]" />
                Server-timed session with autosave
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-[#3B5BFF]" />
                Evidence captured from how they work
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-[#3B5BFF]" />
                Report enters review after submission
              </li>
            </ul>
            <button
              type="button"
              onClick={() =>
                document.querySelector<HTMLButtonElement>("[data-invite-trigger]")?.click()
              }
              className="mt-7 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
            >
              Invite a candidate
            </button>
          </section>

          <section className="rounded-[18px] border border-white/10 bg-[#0A0C11]/90 p-6">
            <h2 className="text-[12px] uppercase tracking-[0.06em] text-white/45">Pipeline</h2>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Invited", pipeline?.invited ?? 0],
                  ["In progress", pipeline?.in_progress ?? 0],
                  ["Submitted", pipeline?.submitted ?? 0],
                  ["Reports ready", pipeline?.report_ready ?? 0],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[10px] border border-white/[0.06] px-3 py-2.5"
                >
                  <span className="text-[13px] text-white/55">{label}</span>
                  <span className="tabular-nums text-[18px] text-white" style={{ fontWeight: 560 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/candidates"
              className="mt-5 inline-flex text-[13px] text-white/55 hover:text-white"
            >
              Open candidates →
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
