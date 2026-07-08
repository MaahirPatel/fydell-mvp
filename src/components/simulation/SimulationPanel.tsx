"use client";

import { motion } from "motion/react";
import { BarChart3, FileText, Home, LayoutGrid, Play, Plus, Share2, Users } from "lucide-react";

const tabs = ["Overview", "Candidates", "Insights", "Benchmarking"];
const skills = [
  ["Financial Modeling", 92],
  ["Data Analysis", 88],
  ["Business Judgment", 84],
  ["Communication", 76],
  ["Stakeholder Management", 72]
];
const candidates = [
  ["Candidate A", "92%", "Financial Modeling", "91%", "Strong signal"],
  ["Candidate B", "88%", "Data Analysis", "86%", "Strong signal"],
  ["Candidate C", "82%", "Business Judgment", "78%", "Review"]
];

function TrendLine() {
  return (
    <svg viewBox="0 0 520 180" className="h-full w-full overflow-visible" aria-label="Simulation performance trend">
      <defs>
        <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trend-line" x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#5b8cff" />
          <stop offset="0.6" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#9b5cff" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((line) => (
        <line
          key={line}
          x1="0"
          x2="520"
          y1={34 + line * 38}
          y2={34 + line * 38}
          stroke="rgba(255,255,255,.055)"
        />
      ))}
      <path
        d="M12 150 L48 132 L76 138 L108 116 L136 122 L168 96 L196 102 L228 78 L260 88 L292 70 L324 76 L356 54 L388 62 L420 42 L452 50 L488 28 L512 32 L512 170 L12 170 Z"
        fill="url(#trend-fill)"
      />
      <motion.path
        d="M12 150 L48 132 L76 138 L108 116 L136 122 L168 96 L196 102 L228 78 L260 88 L292 70 L324 76 L356 54 L388 62 L420 42 L452 50 L488 28 L512 32"
        fill="none"
        stroke="url(#trend-line)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0.62, opacity: 0.75 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle cx="512" cy="32" r="5" fill="#7c5cff" stroke="#c4b5fd" strokeWidth="2" />
      {["May 1", "May 8", "May 15", "May 22", "May 29", "Jun 5"].map((label, index) => (
        <text key={label} x={18 + index * 92} y="178" fill="rgba(226,232,240,.48)" fontSize="11">
          {label}
        </text>
      ))}
    </svg>
  );
}

function PreviewPanel() {
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b18] p-3">
      <div className="grid h-[78px] grid-cols-[1.1fr_.85fr] gap-2">
        <div className="rounded-lg border border-white/[0.06] bg-gradient-to-br from-[#0d1730] to-[#090d1d] p-2">
          <div className="mb-2 h-2 w-16 rounded-full bg-white/12" />
          <div className="space-y-1.5">
            {[78, 92, 60, 86].map((width) => (
              <div key={width} className="h-1.5 rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#7c5cff]"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-gradient-to-br from-[#111636] to-[#080b18] p-2">
          <div className="flex h-full items-end gap-1.5">
            {[34, 46, 58, 72, 84].map((height) => (
              <span
                key={height}
                className="w-full rounded-t bg-gradient-to-t from-[#5b8cff] to-[#9b5cff]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label="Play simulation preview"
        className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-2xl backdrop-blur-xl transition hover:scale-105 hover:bg-white/18"
      >
        <Play className="h-4 w-4 fill-white" />
      </button>
    </div>
  );
}

export default function SimulationPanel({
  variant = "default"
}: {
  variant?: "default" | "hero" | "compact";
}) {
  const isHero = variant === "hero";

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={isHero ? "relative h-[500px] w-full" : "relative w-full"}
    >
      <div className={isHero ? "absolute right-0 top-0 w-[126%] origin-top-right scale-[0.78]" : "relative"}>
      <div
        className={`relative overflow-hidden border border-white/[0.12] bg-[linear-gradient(180deg,rgba(15,20,36,.96),rgba(7,10,20,.985))] shadow-[0_80px_180px_rgba(0,0,0,.7),0_0_100px_rgba(124,92,255,.18),inset_0_1px_0_rgba(255,255,255,.08)] ${
          isHero ? "premium-hero-panel rounded-[28px]" : "rounded-[24px]"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_0%,rgba(124,92,255,.14),transparent_40%)]" />
        <div className="relative grid min-h-[520px] grid-cols-[92px_1fr]">
          <aside className="border-r border-white/[0.075] bg-black/[0.22] p-4">
            <div className="mb-7 flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-[#67e8f9]" />
              <span className="-ml-1 h-3 w-3 rounded-full border-2 border-[#7c5cff]" />
            </div>
            <div className="space-y-3">
              {[Home, LayoutGrid, FileText, Users, BarChart3].map((Icon, index) => (
                <div
                  key={index}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    index === 1 ? "bg-[#7c5cff]/25 text-white" : "text-white/38"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-white">Financial Analyst Simulation</h3>
                  <span className="rounded-full border border-[#3dd68c]/25 bg-[#3dd68c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3dd68c]">
                    Active
                  </span>
                </div>
                <div className="mt-4 flex gap-7">
                  {tabs.map((tab, index) => (
                    <span
                      key={tab}
                      className={`relative pb-3 text-[12px] font-semibold ${
                        index === 0 ? "text-white" : "text-white/42"
                      }`}
                    >
                      {tab}
                      {index === 0 && (
                        <span className="absolute bottom-0 left-0 h-px w-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-white/[0.12] bg-white/[0.035] px-3 text-[11px] font-semibold text-white/72">
                  <Share2 className="h-3.5 w-3.5" />
                  Share report
                </button>
                <button className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-3 text-[11px] font-bold text-white shadow-[0_14px_36px_rgba(124,92,255,.32)]">
                  <Plus className="h-3.5 w-3.5" />
                  Add candidates
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-white/[0.075] bg-white/[0.026] p-4">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-bold text-white">Simulation performance</p>
                    <p className="mt-3 text-[10px] text-white/42">Average score</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-[36px] font-bold leading-none tracking-[-0.055em] text-white">86%</span>
                      <span className="rounded-full bg-[#3dd68c]/12 px-2 py-1 text-[11px] font-bold text-[#3dd68c]">
                        +24%
                      </span>
                    </div>
                  </div>
                  <span className="rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1 text-[10px] text-white/48">
                    Last 30 days
                  </span>
                </div>
                <div className="mt-1 h-[174px]">
                  <TrendLine />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.075] bg-white/[0.026] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-white">Top skill areas</p>
                  <span className="text-[10px] font-semibold text-[#9b8cff]">View all</span>
                </div>
                <div className="mt-4 space-y-3.5">
                  {skills.map(([skill, pct]) => (
                    <div key={skill}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-white/65">{skill}</span>
                        <span className="font-bold text-white">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_.75fr]">
              <div className="rounded-2xl border border-white/[0.075] bg-white/[0.026] p-4">
                <p className="mb-3 text-[12px] font-bold text-white">Top candidates</p>
                <div className="grid grid-cols-[1.1fr_.55fr_1.25fr_.85fr_1fr] border-b border-white/[0.06] pb-2 text-[10px] font-semibold text-white/38">
                  <span>Candidate</span>
                  <span>Score</span>
                  <span>Top skills</span>
                  <span>Accuracy</span>
                  <span>Recommendation</span>
                </div>
                <div className="divide-y divide-white/[0.055]">
                  {candidates.map((row, index) => (
                    <div
                      key={row[0]}
                      className="grid grid-cols-[1.1fr_.55fr_1.25fr_.85fr_1fr] items-center py-3 text-[11px]"
                    >
                      <span className="flex items-center gap-2 font-semibold text-white/85">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5b8cff]/18 text-[10px] text-[#9ab7ff]">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {row[0]}
                      </span>
                      <span className="font-bold text-white">{row[1]}</span>
                      <span className="text-[#9b8cff]">{row[2]}</span>
                      <span className="text-white/74">{row[3]}</span>
                      <span
                        className={`w-fit rounded-md px-2 py-1 text-[10px] font-bold ${
                          row[4] === "Review"
                            ? "border border-[#5b8cff]/20 bg-[#5b8cff]/10 text-[#9dbbff]"
                            : "border border-[#3dd68c]/20 bg-[#3dd68c]/10 text-[#3dd68c]"
                        }`}
                      >
                        {row[4]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.075] bg-white/[0.026] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-white">Simulation preview</p>
                  <span className="text-[10px] font-semibold text-[#9b8cff]">View scenario</span>
                </div>
                <p className="mt-4 text-[14px] font-bold tracking-[-0.02em] text-white">Forecast Analysis</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/54">
                  Build a revenue forecast, assess risks, and prepare a recommendation.
                </p>
                <PreviewPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-7 left-1/2 h-12 w-4/5 -translate-x-1/2 rounded-full bg-[#7c5cff]/18 blur-3xl" />
      </div>
    </motion.div>
  );
}
