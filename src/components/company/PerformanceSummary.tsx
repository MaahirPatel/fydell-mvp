import { BadgeCheck, CheckCircle2 } from "lucide-react";

const MINI_STATS = [
  { label: "Overall performance", value: "Top 28%" },
  { label: "Role fit", value: "Top 19%" },
  { label: "Risk of mis-hire", value: "Low", tone: "good" }
] as const;

const EVIDENCE = [
  { label: "Simulation score", value: "82/100" },
  { label: "Behavioral consistency", value: "High" },
  { label: "Decision quality", value: "Top 23%" },
  { label: "Completion time", value: "23 min" }
] as const;

const COMPETENCIES = [
  { label: "Problem solving", pct: 92 },
  { label: "Data analysis", pct: 88 },
  { label: "Communication", pct: 76 },
  { label: "Adaptability", pct: 72 },
  { label: "Business judgment", pct: 70 }
] as const;

const PEERS = [
  { label: "You", value: "Top 19%", pct: 81, highlight: true },
  { label: "Average", value: "50%", pct: 50, highlight: false }
] as const;

export default function PerformanceSummary() {
  return (
    <div className="hero-preview-frame relative w-full p-5 sm:p-6">
      <div className="relative z-[4]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <p className="text-[14px] font-bold tracking-[-0.02em] text-white">Performance summary</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3dd68c]/25 bg-[#3dd68c]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#3dd68c]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#3dd68c]" />
              Verified
            </span>
          </div>
          <span className="hidden text-[10px] font-semibold text-white/40 sm:inline">Candidate report</span>
        </div>

        {/* Mini stat row */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {MINI_STATS.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-black/25 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">{stat.label}</p>
              <p
                className={`mt-1.5 text-[15px] font-extrabold tracking-[-0.03em] ${
                  "tone" in stat && stat.tone === "good" ? "text-[#3dd68c]" : "text-white"
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
          {/* Evidence snapshot */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Evidence snapshot
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#3dd68c]">
                <BadgeCheck className="h-3 w-3" strokeWidth={1.9} />
                Verified
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {EVIDENCE.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-white/55">{row.label}</span>
                  <span className="tabular-nums font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate potential quadrant */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Candidate potential
            </p>
            <div className="relative mt-3 aspect-square w-full rounded-lg border border-white/[0.07] bg-[linear-gradient(135deg,rgba(124,92,255,.1),transparent)]">
              <span className="absolute left-1/2 top-0 h-full w-px bg-white/[0.07]" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-white/[0.07]" />
              <span
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#5b8cff] shadow-[0_0_14px_rgba(124,92,255,.8)]"
                style={{ left: "72%", top: "26%" }}
              />
              <span className="absolute bottom-1.5 left-2 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-white/30">
                Skill
              </span>
              <span className="absolute right-2 top-1.5 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-white/30">
                Potential
              </span>
            </div>
          </div>
        </div>

        {/* Score by competency */}
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Score by competency
          </p>
          <div className="mt-3 space-y-2.5">
            {COMPETENCIES.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-medium text-white/72">{row.label}</span>
                  <span className="tabular-nums font-bold text-white">{row.pct}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
          {/* Hiring recommendation donut */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "conic-gradient(#7c5cff 0% 91%, rgba(255,255,255,0.08) 91% 100%)"
              }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#070b16]">
                <span className="tabular-nums text-[14px] font-extrabold text-white">91%</span>
              </span>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Hiring recommendation
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.03em] text-[#3dd68c]">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} />
                Strong hire
              </p>
            </div>
          </div>

          {/* Peer comparison */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Peer comparison
            </p>
            <div className="mt-3 space-y-2.5">
              {PEERS.map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-medium text-white/72">{row.label}</span>
                    <span className="tabular-nums font-bold text-white">{row.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full ${
                        row.highlight
                          ? "bg-gradient-to-r from-[#7c5cff] to-[#5b8cff]"
                          : "bg-white/25"
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
