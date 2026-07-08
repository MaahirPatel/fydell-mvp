"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  Plus,
  Search,
  Sparkles,
  Users,
  Wand2
} from "lucide-react";
import type { CompanyRole, GeneratedSimulation } from "@/lib/platform-types";

type CatalogSim = {
  id: string;
  title: string;
  role: string;
  roleColor: string;
  desc: string;
  candidates: string;
  avgScore: number;
  duration: number;
  featured?: boolean;
  bars: number[];
};

const CATALOG: CatalogSim[] = [
  {
    id: "financial-analyst",
    title: "Financial Analyst",
    role: "Finance",
    roleColor: "#67e8f9",
    desc: "Analyze financial data, build forecasts, and create valuation models.",
    candidates: "1,284",
    avgScore: 88,
    duration: 45,
    featured: true,
    bars: [38, 54, 46, 62, 50, 72, 64]
  },
  {
    id: "management-consultant",
    title: "Management Consultant",
    role: "Consulting",
    roleColor: "#9b5cff",
    desc: "Solve business problems, build frameworks, and present solutions.",
    candidates: "2,156",
    avgScore: 91,
    duration: 60,
    bars: [44, 58, 52, 70, 60, 78, 88]
  },
  {
    id: "security-analyst",
    title: "Security Analyst",
    role: "Information Security",
    roleColor: "#3dd68c",
    desc: "Investigate threats, analyze logs, and respond to incidents.",
    candidates: "978",
    avgScore: 84,
    duration: 45,
    bars: [50, 42, 64, 48, 70, 56, 66]
  },
  {
    id: "product-manager",
    title: "Product Manager",
    role: "Product",
    roleColor: "#5b8cff",
    desc: "Prioritize features, analyze metrics, and define product strategy.",
    candidates: "1,642",
    avgScore: 87,
    duration: 50,
    bars: [40, 52, 60, 50, 68, 62, 80]
  },
  {
    id: "operations-manager",
    title: "Operations Manager",
    role: "Operations",
    roleColor: "#f5b942",
    desc: "Optimize processes, manage resources, and improve operational efficiency.",
    candidates: "1,103",
    avgScore: 86,
    duration: 45,
    bars: [46, 56, 48, 64, 58, 72, 68]
  }
];

const FILTERS = ["All roles", "All difficulty", "All statuses"] as const;

const TOP_ROLES = [
  { name: "Management Consultant", score: 91, delta: 7 },
  { name: "Financial Analyst", score: 88, delta: 5 },
  { name: "Product Manager", score: 87, delta: 4 },
  { name: "Operations Manager", score: 86, delta: 5 },
  { name: "Security Analyst", score: 84, delta: 3 }
];

const SCORE_TREND = [
  { x: "Apr 12", v: 81 },
  { x: "Apr 26", v: 84 },
  { x: "May 10", v: 83 },
  { x: "May 24", v: 87 },
  { x: "Jun 7", v: 89 }
];

function MiniBars({ bars, color }: { bars: number[]; color: string }) {
  return (
    <div className="flex h-12 items-end gap-[5px]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-full rounded-t-[3px]"
          style={{
            height: `${h}%`,
            background: `linear-gradient(180deg, ${color}, ${color}33)`
          }}
        />
      ))}
    </div>
  );
}

function ScoreDonut({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="relative flex h-9 w-9 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.09) 0deg)` }}
      aria-hidden
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#070912] text-[11px] font-bold tabular-nums text-white">
        {value}
      </span>
    </span>
  );
}

function LineChart() {
  const w = 300;
  const h = 110;
  const pad = 8;
  const values = SCORE_TREND.map((p) => p.v);
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const stepX = (w - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / (max - min));
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[110px] w-full" role="img" aria-label="Average score trend">
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b8cff" />
            <stop offset="100%" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#scoreArea)" />
        <polyline points={line} fill="none" stroke="url(#scoreLine)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#0a0e1c" stroke="#9b5cff" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-white/40">
        {SCORE_TREND.map((p) => (
          <span key={p.x}>{p.x}</span>
        ))}
      </div>
    </div>
  );
}

export default function CompanyDashboard({
  companyName,
  roles,
  simulations
}: {
  companyName: string;
  roles: CompanyRole[];
  simulations: GeneratedSimulation[];
}) {
  const [query, setQuery] = useState("");

  const liveSims = simulations.slice(0, 3);
  const hasLive = liveSims.length > 0;

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (c) => c.title.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-7 pt-1">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-[-0.05em] text-white">Simulations</h1>
          <p className="mt-2 text-[15px] text-[#9aa4b8]">Realistic work simulations. Real insights. Better hires.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/platform/create" className="platform-btn-primary !h-11 gap-2 px-5 !text-sm">
            <Plus className="h-4 w-4" strokeWidth={1.7} />
            Create simulation
          </Link>
          <Link href="/platform/create" className="platform-btn-ghost !h-11 px-5 !text-sm">
            View templates
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[rgba(5,8,18,0.72)] px-3.5">
              <Search className="h-4 w-4 shrink-0 text-white/45" strokeWidth={1.7} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search simulations..."
                className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-3.5 text-sm font-semibold text-white/72 transition hover:border-white/[0.2] hover:text-white"
              >
                {f}
                <ChevronDown className="h-3.5 w-3.5 text-white/40" strokeWidth={1.7} />
              </button>
            ))}
            <button
              type="button"
              className="ml-auto flex h-11 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-3.5 text-sm font-semibold text-white/72 transition hover:border-white/[0.2] hover:text-white"
            >
              Most recent
              <ChevronDown className="h-3.5 w-3.5 text-white/40" strokeWidth={1.7} />
            </button>
          </div>

          {hasLive && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {liveSims.map((sim) => (
                <Link
                  key={sim.id}
                  href={`/platform/simulations/${sim.id}`}
                  className="group spotlight-card flex flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-white/[0.022] transition hover:-translate-y-1 hover:border-[#7c5cff]/40"
                >
                  <div className="relative h-36 overflow-hidden border-b border-white/[0.06] bg-[linear-gradient(135deg,rgba(91,140,255,.2),rgba(124,92,255,.08),rgba(0,0,0,.25))] p-4">
                    <span className="rounded-md bg-[#7c5cff]/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c4b5fd]">
                      Your simulation
                    </span>
                    <div className="absolute inset-x-4 bottom-4">
                      <MiniBars bars={[44, 58, 52, 70, 60, 78, 88]} color="#7c9bff" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8ea7ff]">{sim.role || "Simulation"}</p>
                    <h3 className="mt-1.5 text-[17px] font-extrabold tracking-[-0.03em] text-white">{sim.title}</h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-white/55">{sim.brief}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-white/65">
                      <Clock className="h-4 w-4 text-white/40" strokeWidth={1.7} />
                      <span className="tabular-nums">{sim.durationMinutes}</span> Min.
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.id}
                href="/simulation"
                className="group spotlight-card flex flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-white/[0.022] transition hover:-translate-y-1 hover:border-[#7c5cff]/40"
              >
                <div className="relative h-36 overflow-hidden border-b border-white/[0.06] bg-[linear-gradient(135deg,rgba(91,140,255,.16),rgba(124,92,255,.06),rgba(0,0,0,.3))] p-4">
                  {c.featured && (
                    <span className="absolute right-4 top-4 rounded-md bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(124,92,255,.4)]">
                      Featured
                    </span>
                  )}
                  <div className="absolute inset-x-4 bottom-4">
                    <MiniBars bars={c.bars} color={c.roleColor} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: c.roleColor }}>
                    {c.role}
                  </p>
                  <h3 className="mt-1.5 text-[17px] font-extrabold tracking-[-0.03em] text-white">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-white/55">{c.desc}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[13px] font-semibold text-white/65">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-white/40" strokeWidth={1.7} />
                      <span className="tabular-nums">{c.candidates}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ScoreDonut value={c.avgScore} color={c.roleColor} />
                      <span className="text-white/45">avg</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-white/40" strokeWidth={1.7} />
                      <span className="tabular-nums">{c.duration}</span> Min.
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            <Link
              href="/platform/create"
              className="group flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-white/[0.16] bg-white/[0.012] p-6 text-center transition hover:border-[#7c5cff]/45 hover:bg-white/[0.03]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] text-white transition group-hover:border-[#7c5cff]/45 group-hover:text-[#c4b5fd]">
                <Plus className="h-6 w-6" strokeWidth={1.7} />
              </span>
              <p className="text-[15px] font-extrabold tracking-[-0.02em] text-white">Create your own simulation</p>
              <p className="max-w-[220px] text-[13px] leading-relaxed text-white/50">
                Build a custom simulation tailored to your role.
              </p>
            </Link>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-white/[0.09] bg-white/[0.022] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Performance overview</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[13px] text-[#9aa4b8]">Average Score</p>
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-white tabular-nums">89%</p>
              </div>
              <span className="flex items-center gap-1 text-[13px] font-bold text-[#3dd68c]">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                6% vs last 30 days
              </span>
            </div>
            <div className="mt-4">
              <LineChart />
            </div>
          </section>

          <section className="rounded-[22px] border border-white/[0.09] bg-white/[0.022] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Completion rate</p>
            <div className="mt-4 flex items-center gap-5">
              <span
                className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#7c5cff 0deg 259.2deg, #5b8cff 259.2deg 324deg, rgba(255,255,255,0.08) 324deg 360deg)"
                }}
                aria-hidden
              >
                <span className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-[#070912]">
                  <span className="text-xl font-extrabold tabular-nums text-white">72%</span>
                </span>
              </span>
              <ul className="flex-1 space-y-2.5 text-[13px]">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#9aa4b8]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7c5cff]" />
                    Completed
                  </span>
                  <span className="font-bold tabular-nums text-white">72%</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#9aa4b8]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#5b8cff]" />
                    In progress
                  </span>
                  <span className="font-bold tabular-nums text-white">18%</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#9aa4b8]">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    Not started
                  </span>
                  <span className="font-bold tabular-nums text-white">10%</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-[22px] border border-white/[0.09] bg-white/[0.022] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Top roles</p>
            <p className="mt-1 text-[12px] text-white/40">By average score</p>
            <ul className="mt-4 space-y-3.5">
              {TOP_ROLES.map((r) => (
                <li key={r.name}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-white/82">{r.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold tabular-nums text-white">{r.score}%</span>
                      <span className="flex items-center gap-0.5 text-[12px] font-bold text-[#3dd68c]">
                        <ArrowUpRight className="h-3 w-3" strokeWidth={2.2} />
                        {r.delta}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#7c5cff]"
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="spotlight-card relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[linear-gradient(120deg,rgba(124,92,255,.18),rgba(91,140,255,.08),rgba(3,5,13,.4))] p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#7c5cff]/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#5b8cff] text-white shadow-[0_12px_32px_rgba(124,92,255,.45)]">
              <Wand2 className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.03em] text-white">
                Build better simulations with AI
                <Sparkles className="h-4 w-4 text-[#c4b5fd]" strokeWidth={1.7} />
              </h2>
              <p className="mt-1.5 max-w-[560px] text-[14px] leading-relaxed text-[#9aa4b8]">
                Use AI to generate role-specific scenarios, auto-grade responses, and surface deeper insights.
              </p>
            </div>
          </div>
          <Link href="/platform/simulations/new" className="platform-btn-primary !h-11 gap-2 px-5 !text-sm">
            <Sparkles className="h-4 w-4" strokeWidth={1.7} />
            Try AI simulation builder
          </Link>
        </div>
      </section>

      {roles.length > 0 && (
        <p className="text-center text-[12px] text-white/30">
          {roles.length} configured {roles.length === 1 ? "role" : "roles"} for {companyName?.trim() || "your workspace"}.
        </p>
      )}
    </div>
  );
}
