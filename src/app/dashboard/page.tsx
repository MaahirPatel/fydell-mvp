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
  href?: string;
};

type DashPayload = {
  organizationName: string | null;
  roleTitle: string | null;
  pipeline: Pipeline;
  activity: ActivityRow[];
  approvalStatus?: string;
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
        <div className="h-24 rounded-xl bg-white/5" />
        <div className="h-48 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-5 py-6">
        <h1 className="text-[20px] text-white" style={{ fontWeight: 560 }}>
          Dashboard unavailable
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Overview
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[32px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            {data?.organizationName || "Your workspace"}
          </h1>
          <p className="mt-2 text-[14px] text-white/55">
            Live hiring activity for your organization. No sample candidates.
          </p>
        </div>
        {hasRole ? (
          <Link
            href="/dashboard/roles"
            className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Invite candidates
          </Link>
        ) : (
          <Link
            href="/onboarding/employer"
            className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Complete setup
          </Link>
        )}
      </div>

      {data?.approvalStatus === "pending" ? (
        <div className="mt-6 rounded-[12px] border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-[13px] text-[#FCD34D]">
          Workspace is pending Fydell approval. You can finish setup, but candidate
          invitations stay disabled until an administrator activates your organization.
        </div>
      ) : null}

      {!hasRole ? (
        <section className="mt-8 rounded-[16px] border border-dashed border-white/15 bg-[#0A0C11] px-6 py-12 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            Set up your first finance role
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Define the role, confirm first-90-day outcomes, and use Project Meridian to
            invite your first candidates.
          </p>
          <Link
            href="/onboarding/employer"
            className="mt-6 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Create role
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-8 grid gap-2 sm:grid-cols-5">
            {(
              [
                ["Invited", pipeline.invited],
                ["Accepted", pipeline.accepted],
                ["In progress", pipeline.in_progress],
                ["Submitted", pipeline.submitted],
                ["Report ready", pipeline.report_ready],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11] px-3 py-3"
              >
                <p className="text-[11px] uppercase tracking-[0.05em] text-white/45">{label}</p>
                <p className="mt-1 text-[24px] tabular-nums text-white" style={{ fontWeight: 560 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
                Active role · {data?.roleTitle}
              </h2>
              <Link href="/dashboard/candidates" className="text-[12px] text-white/60 hover:text-white">
                View candidates
              </Link>
            </div>

            {!hasCandidates ? (
              <div className="mt-6 rounded-[12px] border border-dashed border-white/12 px-4 py-10 text-center text-[13px] text-white/55">
                No candidates invited yet.{" "}
                {data?.invitesEnabled === false
                  ? "Invitations unlock after organization approval."
                  : "Invite your first candidate to start the work trial."}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {data!.activity.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
                    <div>
                      <p className="font-medium text-white">{row.name}</p>
                      <p className="text-white/45">{row.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-white/55">
                      <span>Invite: {row.invitation}</span>
                      <span>Session: {row.session}</span>
                      <span>Report: {row.report}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
