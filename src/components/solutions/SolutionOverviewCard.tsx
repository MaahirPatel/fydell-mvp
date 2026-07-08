import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";

const STATS = [
  { label: "Total simulations", value: "1,248", delta: "+18.6%", note: "vs last month", up: true },
  { label: "Completed", value: "932", delta: "+22.7%", note: "vs last month", up: true },
  { label: "Pass rate", value: "71%", delta: "+9.3%", note: "vs last month", up: true },
  { label: "Time to decision", value: "4.2d", delta: "-18%", note: "vs last month", up: true },
  { label: "Quality of hire", value: "84%", delta: "+12.4%", note: "projected", up: true }
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const THIS_YEAR = [128, 176, 152, 214, 238, 286];
const LAST_YEAR = [92, 124, 118, 158, 172, 198];
const CHART_MAX = 300;

const SKILLS = [
  { label: "Analytical reasoning", pct: 84 },
  { label: "Problem solving", pct: 78 },
  { label: "Communication", pct: 74 },
  { label: "Leadership", pct: 69 },
  { label: "Decision-making", pct: 66 }
] as const;

const RECENT = [
  { role: "Growth Marketing Manager", score: 90 },
  { role: "Senior Data Analyst", score: 88 },
  { role: "Customer Success Lead", score: 85 },
  { role: "Product Manager", score: 83 }
] as const;

export default function SolutionOverviewCard() {
  return (
    <div className="hero-preview-frame marketing-perspective ml-auto w-full max-w-[760px] origin-center">
      <div className="relative z-[4] flex h-full flex-col p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <p className="text-[13px] font-bold text-white">Solution overview</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3dd68c]/25 bg-[#3dd68c]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#3dd68c]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#3dd68c]" />
              Live
            </span>
          </div>
          <span className="hidden text-[10px] font-semibold text-white/40 md:inline">Last 30 days</span>
        </div>

        {/* Stat row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-black/25 p-2.5"
            >
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">
                {stat.label}
              </p>
              <p className="mt-1.5 tabular-nums text-[19px] font-extrabold leading-none text-white">
                {stat.value}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[9.5px] font-bold text-[#3dd68c]">
                {stat.up ? (
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                ) : (
                  <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
                )}
                {stat.delta}
                <span className="font-medium text-white/30">{stat.note}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
          {/* Bar chart */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Simulations completed
              </p>
              <div className="flex items-center gap-3 text-[9px] font-semibold text-white/45">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-gradient-to-b from-[#5b8cff] to-[#9b5cff]" />
                  This year
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-white/20" />
                  Last year
                </span>
              </div>
            </div>
            <div className="mt-4 h-[120px]">
              <svg viewBox="0 0 320 120" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
                <defs>
                  <linearGradient id="solBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8cff" />
                    <stop offset="100%" stopColor="#9b5cff" />
                  </linearGradient>
                </defs>
                {MONTHS.map((_, index) => {
                  const groupWidth = 320 / MONTHS.length;
                  const barWidth = 11;
                  const gap = 5;
                  const cx = index * groupWidth + groupWidth / 2;
                  const lastH = (LAST_YEAR[index] / CHART_MAX) * 108;
                  const thisH = (THIS_YEAR[index] / CHART_MAX) * 108;
                  return (
                    <g key={index}>
                      <rect
                        x={cx - barWidth - gap / 2}
                        y={120 - lastH}
                        width={barWidth}
                        height={lastH}
                        rx={2.5}
                        fill="rgba(255,255,255,0.16)"
                      />
                      <rect
                        className="hero-grow"
                        x={cx + gap / 2}
                        y={120 - thisH}
                        width={barWidth}
                        height={thisH}
                        rx={2.5}
                        fill="url(#solBar)"
                        style={{ transformOrigin: "center bottom", animationDelay: `${0.4 + index * 0.08}s` }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-1 flex justify-between text-[8.5px] font-medium text-white/30">
              {MONTHS.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          {/* Top skills assessed */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Top skills assessed
            </p>
            <div className="mt-3 space-y-2.5">
              {SKILLS.map((skill, index) => (
                <div key={skill.label}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-medium text-white/72">{skill.label}</span>
                    <span className="tabular-nums font-bold text-white">{skill.pct}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="hero-grow h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                      style={{ width: `${skill.pct}%`, animationDelay: `${0.6 + index * 0.1}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent simulations */}
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/25 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Recent simulations
            </p>
            <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-[#8ea7ff]">
              View all simulations
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {RECENT.map((item) => (
              <div
                key={item.role}
                className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]"
              >
                <span className="truncate font-semibold text-white">{item.role}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-white">{item.score}</span>
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                      style={{ width: `${item.score}%` }}
                    />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
