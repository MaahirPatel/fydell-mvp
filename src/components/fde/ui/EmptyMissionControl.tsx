"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

/** Honest empty Mission Control — shows Fydell template + generate, never fake candidates. */
export default function EmptyMissionControl({ orgName }: { orgName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useFlagship() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/simulations/use-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "fydell-enterprise-analytics-deployment-recovery",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not use template");
      router.push(data.redirectTo || `/app/employer/missions/${data.mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use template");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-gradient-to-b from-[#0E1118] to-[#0A0C11] px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,91,255,0.12),transparent_55%)]" />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            {orgName} Mission Control
          </p>
          <h2
            className="mt-2 max-w-[36ch] text-[26px] text-white sm:text-[30px]"
            style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
          >
            Build role-specific FDE simulations, invite candidates, review evidence
          </h2>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
            Your workspace stays empty of candidates until you invite someone. Start with a proven
            Fydell template or generate a new simulation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app/employer/simulations/generate"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[14px] font-semibold text-[#08090C]"
            >
              <Sparkles className="h-4 w-4" />
              Generate simulation
            </Link>
            <Link
              href="/app/employer/simulations"
              className="inline-flex h-11 items-center rounded-[10px] border border-white/15 px-5 text-[14px] text-white/80"
            >
              Open simulation library
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/90 p-5 sm:p-6">
          <span className="rounded-[6px] border border-[#B8C4FF]/35 bg-[#3B5BFF]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B8C4FF]">
            Fydell Template
          </span>
          <h3 className="mt-3 text-[18px] text-white" style={{ fontWeight: 560 }}>
            Enterprise Analytics Deployment Recovery
          </h3>
          <p className="mt-1 text-[12px] text-white/45">
            Forward Deployed Engineer · Mid-to-senior · 75–90 min · AI allowed and observed
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
            Recover a failing enterprise analytics deployment, find the real root cause across
            config and identity boundaries, restore service safely, and communicate a credible
            rollout plan. Runs on the Project Relay candidate workspace.
          </p>
          {error && <p className="mt-3 text-[13px] text-[#fda4b0]">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={useFlagship}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {busy ? "Publishing…" : "Use template & invite"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <Link
              href="/app/employer/simulations"
              className="inline-flex h-10 items-center rounded-[9px] border border-white/15 px-4 text-[13px] text-white/75"
            >
              View blueprint
            </Link>
          </div>
        </section>

        <section className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/90 p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">
            Setup checklist
          </p>
          <ol className="mt-3 space-y-2.5 text-[13px] text-white/65">
            <li>1. Adopt or generate a simulation</li>
            <li>2. Preview the candidate workspace</li>
            <li>3. Publish the mission</li>
            <li>4. Invite your first candidate</li>
            <li>5. Review evidence after submit</li>
          </ol>
          <p className="mt-4 text-[11.5px] leading-relaxed text-white/40">
            Metrics appear only after real published missions and attempts exist — no sample data.
          </p>
        </section>
      </div>
    </div>
  );
}
