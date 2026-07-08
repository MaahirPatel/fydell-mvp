import { ArrowRight, Clock } from "lucide-react";

const HISTOGRAM = [18, 34, 52, 72, 88, 96, 78, 54, 32, 16];

const SKILL_OUTCOMES = [
  { label: "Problem solving", value: 0.71 },
  { label: "Communication", value: 0.64 },
  { label: "Analytical thinking", value: 0.59 }
] as const;

export default function FeaturedGuideCard() {
  return (
    <article className="glass-card flex h-full flex-col p-7 lg:p-9">
      <span className="caption text-[#9faeff]">Featured guide</span>
      <h3 className="mt-4 text-[clamp(1.7rem,2.6vw,2.4rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-white">
        The definitive guide to work simulations in hiring
      </h3>
      <p className="mt-4 max-w-[560px] text-[15px] leading-[1.62] text-[#9aa4b8]">
        A comprehensive playbook for designing, validating, and scaling simulations that predict
        performance and drive fairer hiring outcomes.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-lift group inline-flex h-11 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-6 text-[14.5px] font-bold text-white shadow-[0_14px_42px_rgba(124,92,255,0.35)] hover:brightness-110"
        >
          Read the guide
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/55">
          <Clock className="h-4 w-4" strokeWidth={1.7} />
          35 min read
        </span>
      </div>

      {/* Metric tiles */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {/* Predictive validity */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Predictive validity
          </p>
          <div className="mt-2 flex items-end justify-between">
            <span className="tabular-nums text-[24px] font-extrabold leading-none text-white">0.61</span>
            <span className="rounded-md bg-[#3dd68c]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#3dd68c]">
              High validity
            </span>
          </div>
          <div className="mt-3 h-[34px]">
            <svg viewBox="0 0 140 40" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(124,92,255,0.32)" />
                  <stop offset="100%" stopColor="rgba(124,92,255,0)" />
                </linearGradient>
                <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5b8cff" />
                  <stop offset="100%" stopColor="#9b5cff" />
                </linearGradient>
              </defs>
              <path d="M0 32 L20 28 L40 30 L60 22 L80 18 L100 12 L120 9 L140 4 L140 40 L0 40 Z" fill="url(#sparkFill)" />
              <path
                d="M0 32 L20 28 L40 30 L60 22 L80 18 L100 12 L120 9 L140 4"
                fill="none"
                stroke="url(#sparkLine)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Candidate performance distribution */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Candidate performance distribution
          </p>
          <div className="mt-3 flex h-[58px] items-end gap-[3px]">
            {HISTOGRAM.map((value, index) => (
              <span
                key={index}
                className="flex-1 rounded-sm bg-gradient-to-b from-[#5b8cff] to-[#9b5cff]"
                style={{ height: `${value}%`, opacity: 0.45 + (value / 100) * 0.55 }}
              />
            ))}
          </div>
        </div>

        {/* Adverse impact ratio */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Adverse impact ratio
          </p>
          <div className="mt-2 flex items-end justify-between">
            <span className="tabular-nums text-[24px] font-extrabold leading-none text-white">0.82</span>
            <span className="rounded-md bg-[#3dd68c]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#3dd68c]">
              Within range
            </span>
          </div>
          <div className="relative mt-4 h-1.5 rounded-full bg-white/[0.07]">
            {/* acceptable range band (0.8 - 1.25 normalized to 0-1.5 scale) */}
            <span
              className="absolute top-0 h-full rounded-full bg-[#3dd68c]/25"
              style={{ left: "53%", width: "30%" }}
            />
            {/* marker at 0.82 */}
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#3dd68c]"
              style={{ left: "55%" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[8.5px] font-medium text-white/30">
            <span>0</span>
            <span>0.8</span>
            <span>1.25</span>
          </div>
        </div>

        {/* Top skill outcomes */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Top skill outcomes
          </p>
          <div className="mt-3 space-y-2.5">
            {SKILL_OUTCOMES.map((skill) => (
              <div key={skill.label}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-medium text-white/72">{skill.label}</span>
                  <span className="tabular-nums font-bold text-white">{skill.value.toFixed(2)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                    style={{ width: `${skill.value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
