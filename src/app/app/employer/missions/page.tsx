"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Mission = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Under review",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

export default function EmployerMissionsPage() {
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fde/missions", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load missions");
        setMissions(data.missions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load missions");
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
            Missions
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            Published deployments
          </h1>
          <p className="mt-2 max-w-[56ch] text-[14px] text-white/50">
            Missions are published uses of a simulation — invite settings, status, and candidate
            funnel. Blueprints live in the Simulation Library.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/employer/simulations"
            className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Simulation library
          </Link>
          <Link
            href="/app/employer/simulations/generate"
            className="inline-flex h-10 items-center rounded-[9px] border border-white/15 px-4 text-[13px] text-white/75"
          >
            Generate
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : missions === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : missions.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            No missions yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Adopt Enterprise Analytics Deployment Recovery or generate a simulation, then publish
            it as a mission to invite candidates.
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
          {missions.map((mission) => (
            <li key={mission.id}>
              <Link
                href={`/app/employer/missions/${mission.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] transition hover:bg-white/[0.03]"
              >
                <span className="font-medium text-white">{mission.title}</span>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/60">
                  {STATUS_LABEL[mission.status] || mission.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
