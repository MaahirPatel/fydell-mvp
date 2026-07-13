"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Pipeline = {
  invited: number;
  accepted: number;
  in_progress: number;
  submitted: number;
  report_ready: number;
};

type ActivityRow = {
  id: string;
  name: string;
  email: string;
  invitation: string;
  session: string;
  report: string;
};

type DashPayload = {
  organizationName: string | null;
  roleTitle: string | null;
  pipeline: Pipeline;
  activity: ActivityRow[];
  invitesEnabled?: boolean;
  error?: string;
};

const EMPTY_PIPELINE: Pipeline = {
  invited: 0,
  accepted: 0,
  in_progress: 0,
  submitted: 0,
  report_ready: 0,
};

export default function DashboardOverview() {
  const [data, setData] = useState<DashPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load dashboard.");
          setData(null);
        } else {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Network error loading dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-5 py-6">
        <h1 className="text-[20px] text-white" style={{ fontWeight: 560 }}>
          Analytics unavailable
        </h1>
        <p className="mt-2 text-[14px] text-white/70">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Retry
        </button>
      </div>
    );
  }

  const pipeline = data?.pipeline || EMPTY_PIPELINE;
  const hasRole = Boolean(data?.roleTitle);
  const hasCandidates = (data?.activity?.length || 0) > 0;
  const metrics = [
    ["Invited", pipeline.invited],
    ["In progress", pipeline.in_progress],
    ["Submitted", pipeline.submitted],
    ["Reports ready", pipeline.report_ready],
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Analytics
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            {data?.organizationName || "Your workspace"}
          </h1>
          <p className="mt-2 max-w-[48ch] text-[14px] leading-relaxed text-white/55">
            Live activity only. This stays empty until you invite real candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            document.querySelector<HTMLButtonElement>("[data-invite-trigger]")?.click()
          }
          className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Invite candidate
        </button>
      </div>

      {!hasRole ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            Finish a few setup questions
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Tell us about your company and first role, then explore Project Meridian and invite
            candidates.
          </p>
          <Link
            href="/onboarding/employer"
            className="mt-6 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Continue setup
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div
                key={label}
                className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">{label}</p>
                <p
                  className="mt-2 text-[32px] tabular-nums text-white"
                  style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
                  Recent candidates
                </h2>
                <Link
                  href="/dashboard/candidates"
                  className="text-[12px] text-white/55 hover:text-white"
                >
                  View all
                </Link>
              </div>
              {!hasCandidates ? (
                <div className="mt-6 rounded-[12px] border border-dashed border-white/12 px-4 py-12 text-center">
                  <p className="text-[15px] text-white/75" style={{ fontWeight: 520 }}>
                    No candidates yet
                  </p>
                  <p className="mx-auto mt-2 max-w-[36ch] text-[13px] leading-relaxed text-white/45">
                    Invite someone to Project Meridian. Names only appear here after you invite
                    them.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-white/[0.06]">
                  {data!.activity.slice(0, 6).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]"
                    >
                      <div>
                        <p className="font-medium text-white">{row.name}</p>
                        <p className="text-white/45">{row.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-white/50">
                        <span>{row.invitation}</span>
                        <span>{row.session}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[16px] border border-white/[0.1] bg-gradient-to-br from-[#12162a] to-[#0A0C11] p-5">
              <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Work trial</p>
              <h2
                className="mt-2 text-[22px] text-white"
                style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
              >
                Project Meridian
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                Your FP&A work trial for{" "}
                <span className="text-white/80">{data?.roleTitle}</span>. Candidates complete real
                finance work; you see evidence when they submit.
              </p>
              <Link
                href="/dashboard/meridian"
                className="mt-5 inline-flex h-9 items-center rounded-[8px] border border-white/15 bg-white/[0.04] px-3 text-[12.5px] font-semibold text-white hover:bg-white/[0.08]"
              >
                Open Project Meridian
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
