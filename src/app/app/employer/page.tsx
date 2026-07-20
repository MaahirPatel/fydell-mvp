"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StateRail from "@/components/fde/ui/StateRail";
import AttentionQueue, { type AttentionItem } from "@/components/fde/ui/AttentionQueue";
import ExecutionThread, { type ThreadEvent } from "@/components/fde/ui/ExecutionThread";
import EmptyMissionControl from "@/components/fde/ui/EmptyMissionControl";
import PilotWalkthrough from "@/components/fde/ui/PilotWalkthrough";

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
  priorityReviews?: Array<{
    sessionId: string;
    missionTitle: string;
    status: string;
    submittedAt: string | null;
    href: string;
  }>;
};

const MISSION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Under review",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04]"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">{label}</p>
      <p className="mt-1.5 text-[22px] leading-none tabular-nums text-white" style={{ fontWeight: 560 }}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-white/40">{hint}</p> : null}
    </Link>
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
      <div className="rounded-[14px] border border-[#fb7185]/30 bg-[#fb7185]/[0.06] px-5 py-4">
        <p className="text-[14px] font-medium text-[#fecdd3]">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-[13px] text-white/70 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-6" aria-busy="true">
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
    return (
      <>
        <EmptyMissionControl orgName={data.organizationName} />
        <PilotWalkthrough />
      </>
    );
  }

  const focus = data.focusMission;
  const activeMissions = data.missions.filter((m) =>
    ["draft", "under_review", "active", "paused"].includes(m.status)
  );
  const needsReview = data.counts.sessionsEvidenceReady;
  const completedAttempts =
    data.counts.sessionsEvidenceReady + data.counts.sessionsAwaitingEvidence;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            {data.organizationName}
          </p>
          <h1
            className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[32px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            {greetingForNow()}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-white/50">
            Build role-specific FDE simulations, invite candidates, and review evidence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/employer/simulations"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/15 px-4 text-[13px] font-medium text-white/80 hover:bg-white/[0.04]"
          >
            Use Fydell template
          </Link>
          <Link
            href="/app/employer/simulations/generate"
            className="group inline-flex h-11 items-center gap-2.5 rounded-[10px] bg-white px-5 text-[14px] font-semibold text-[#08090C] transition-[filter,transform] hover:-translate-y-px hover:brightness-95"
          >
            Generate simulation
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published missions"
          value={data.counts.missionsActive + data.counts.missionsDraft + data.counts.missionsUnderReview}
          href="/app/employer/missions"
          hint={`${data.counts.missionsActive} live`}
        />
        <StatCard
          label="Completed attempts"
          value={completedAttempts}
          href="/app/employer/evidence"
          hint="Submitted work samples"
        />
        <StatCard
          label="Needs review"
          value={needsReview}
          href="/app/employer/evidence"
          hint="Evidence ready for interview prep"
        />
        <StatCard
          label="In progress"
          value={data.counts.sessionsActive}
          href="/app/employer/attempts"
          hint="Candidates currently working"
        />
      </div>

      <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
            Priority review
          </h2>
          <Link href="/app/employer/evidence" className="text-[12px] text-white/50 hover:text-white">
            All evidence →
          </Link>
        </div>
        {data.blockers.length === 0 && needsReview === 0 ? (
          <p className="mt-4 text-[13.5px] text-white/50">
            Nothing needs review yet. Invite a candidate to a published simulation to collect
            evidence.
          </p>
        ) : (
          <div className="mt-4">
            <AttentionQueue items={data.blockers} />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
                Active simulations
              </h2>
              <Link
                href="/app/employer/missions"
                className="text-[12px] text-white/50 hover:text-white"
              >
                View all →
              </Link>
            </div>
            {activeMissions.length === 0 ? (
              <p className="mt-4 text-[13.5px] text-white/50">No simulations yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[11px] uppercase tracking-[0.06em] text-white/40">
                      <th className="pb-2 pr-3 font-medium">Simulation</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Updated</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMissions.slice(0, 8).map((m) => (
                      <tr key={m.id} className="border-b border-white/[0.05]">
                        <td className="py-3 pr-3">
                          <Link
                            href={`/app/employer/missions/${m.id}`}
                            className="font-medium text-white/90 hover:underline"
                          >
                            {m.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-3 text-white/55">
                          {MISSION_STATUS_LABEL[m.status] || m.status}
                        </td>
                        <td className="py-3 pr-3 text-white/45">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2 text-[12px]">
                            <Link
                              href={`/app/employer/missions/${m.id}`}
                              className="text-white/70 underline"
                            >
                              Open
                            </Link>
                            <Link
                              href={`/app/employer/missions/${m.id}/preview`}
                              className="text-white/50 underline"
                            >
                              Preview
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Focus path
            </h2>
            <div className="mt-4">
              <StateRail currentIndex={focus?.stageIndex ?? 0} />
            </div>
            {focus && (
              <p className="mt-4 text-[13px] text-white/60">
                Focused on{" "}
                <Link href={`/app/employer/missions/${focus.id}`} className="text-white underline">
                  {focus.title}
                </Link>
                {" · "}
                {focus.evidenceReadyCount} evidence ready · {focus.activeSessionCount} working
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Next action
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/65">
              {data.cta.label === "Create simulation"
                ? "Generate an FDE work simulation from your role preferences, publish it, then invite candidates."
                : "Continue the hiring loop from the recommended next step."}
            </p>
            <Link
              href={data.cta.href}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
            >
              {data.cta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5 sm:p-6">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Recent activity
            </h2>
            <div className="mt-4">
              {data.events.length === 0 ? (
                <p className="text-[13px] text-white/50">
                  Activity appears here when candidates start and submit simulations.
                </p>
              ) : (
                <ExecutionThread events={data.events} />
              )}
            </div>
          </section>
        </div>
      </div>

      <PilotWalkthrough />
    </div>
  );
}
