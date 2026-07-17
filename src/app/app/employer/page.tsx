"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StateRail from "@/components/fde/ui/StateRail";
import AttentionQueue, { type AttentionItem } from "@/components/fde/ui/AttentionQueue";
import ExecutionThread, { type ThreadEvent } from "@/components/fde/ui/ExecutionThread";
import EmptyMissionControl from "@/components/fde/ui/EmptyMissionControl";

type FocusMission = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  stageIndex: number;
  inviteCount: number;
  acceptedInviteCount: number;
  sessionCount: number;
  activeSessionCount: number;
  evidenceReadyCount: number;
  decisionCount: number;
};

type MissionControlData = {
  organizationId: string | null;
  organizationName: string;
  missions: Array<{ id: string; title: string; status: string; createdAt: string; invitationLimit: number }>;
  counts: {
    missionsTotal: number;
    missionsDraft: number;
    missionsUnderReview: number;
    missionsActive: number;
    invitesTotal: number;
    invitesPending: number;
    invitesAccepted: number;
    sessionsActive: number;
    sessionsAwaitingEvidence: number;
    sessionsEvidenceReady: number;
    decisionsTotal: number;
  };
  focusMission: FocusMission | null;
  blockers: AttentionItem[];
  events: ThreadEvent[];
  cta: { label: string; href: string };
};

const MISSION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Under review",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[22px] leading-none tabular-nums text-white" style={{ fontWeight: 560 }}>
        {value}
      </p>
    </div>
  );
}

export default function EmployerMissionControlPage() {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/mission-control", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Could not load mission control");
        setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load mission control");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-[14px] border border-[#fb7185]/30 bg-[#fb7185]/[0.06] px-5 py-4 text-[14px] font-medium text-[#fecdd3]">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-9 w-72 rounded bg-white/5" />
        <div className="h-24 rounded-[16px] bg-white/5" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="h-64 rounded-[16px] bg-white/5" />
          <div className="h-64 rounded-[16px] bg-white/5" />
        </div>
      </div>
    );
  }

  if (data.counts.missionsTotal === 0) {
    return <EmptyMissionControl orgName={data.organizationName} />;
  }

  const focus = data.focusMission;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Mission control
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            {data.organizationName}
          </h1>
        </div>
        <Link
          href={data.cta.href}
          className="group inline-flex h-11 items-center gap-2.5 rounded-[10px] bg-white px-5 text-[14px] font-semibold text-[#08090C] transition-[filter,transform] hover:-translate-y-px hover:brightness-95"
        >
          {data.cta.label}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Golden path
        </h2>
        <div className="mt-4">
          <StateRail currentIndex={focus?.stageIndex ?? 0} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
                Active mission
              </h2>
              {focus && (
                <Link
                  href={`/app/employer/missions/${focus.id}`}
                  className="text-[12px] text-white/55 transition-colors hover:text-white"
                >
                  View mission →
                </Link>
              )}
            </div>

            {focus ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[17px] font-semibold text-white">{focus.title}</p>
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/60">
                    {MISSION_STATUS_LABEL[focus.status] || focus.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Invited" value={focus.inviteCount} />
                  <StatCard label="Accepted" value={focus.acceptedInviteCount} />
                  <StatCard label="Working" value={focus.activeSessionCount} />
                  <StatCard label="Evidence ready" value={focus.evidenceReadyCount} />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[13.5px] text-white/50">No open mission right now.</p>
            )}
          </section>

          <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Recent activity
            </h2>
            <div className="mt-4">
              <ExecutionThread events={data.events} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Needs your attention
            </h2>
            <div className="mt-4">
              <AttentionQueue items={data.blockers} />
            </div>
          </section>

          <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Across all missions
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard label="Missions" value={data.counts.missionsTotal} />
              <StatCard label="Accepted invites" value={data.counts.invitesAccepted} />
              <StatCard label="In progress" value={data.counts.sessionsActive} />
              <StatCard label="Decisions" value={data.counts.decisionsTotal} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
