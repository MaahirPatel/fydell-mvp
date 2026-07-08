"use client";

import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Home,
  Layers3,
  Play,
  Share2,
  UserPlus,
  Users,
  Workflow
} from "lucide-react";
import HiringSignalChart from "@/components/platform/insights/HiringSignalChart";
import SkillProgressBars from "@/components/platform/insights/SkillProgressBars";
import CandidateComparisonTable from "@/components/platform/insights/CandidateComparisonTable";
import { CANDIDATES } from "@/lib/site-data";

const NAV = [
  { icon: Home, label: "Home" },
  { icon: Layers3, label: "Dashboard" },
  { icon: Workflow, label: "Simulations" },
  { icon: Users, label: "Candidates" },
  { icon: BarChart3, label: "Analytics" },
  { icon: FileText, label: "Reports" }
];

const DECISIONS = [
  ["00:04", "Reviewed financial materials", "Completed"],
  ["00:11", "Identified cost saving opportunity", "Optimal"],
  ["00:18", "Evaluated market expansion", "Review"],
  ["00:28", "Assessed financing options", "Optimal"],
  ["00:37", "Built forecast model", "Optimal"]
];

const SUMMARY = [
  {
    title: "Top strengths observed",
    rows: ["Strong financial modeling skills", "Solid data interpretation", "Analytical problem solving"]
  },
  {
    title: "Risk flags",
    rows: ["Inconsistent business judgment", "Missed key assumptions", "Weak stakeholder prioritization"]
  },
  {
    title: "Observed behaviors",
    rows: ["Structured problem solvers", "Data-driven decisions", "Clear communicators"]
  }
];

export default function RoleInsightsDashboard() {
  return (
    <div className="grid min-h-[760px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#050914] shadow-[0_32px_120px_rgba(0,0,0,0.42)] lg:grid-cols-[238px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/[0.075] bg-[linear-gradient(180deg,rgba(8,13,26,0.98),rgba(4,7,16,0.98))] p-5 lg:block">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/34">Overview</div>
        <div className="mt-5 space-y-1.5">
          {NAV.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition ${
                index === 3
                  ? "border border-[#7c5cff]/25 bg-[#7c5cff]/16 text-[#b8a9ff]"
                  : "text-white/52 hover:bg-white/[0.045] hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-10 text-[11px] font-bold uppercase tracking-[0.22em] text-white/34">Current report</div>
        <div className="mt-4 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-4">
          <p className="text-sm font-semibold text-white">Senior Financial Analyst</p>
          <p className="mt-1 text-xs text-white/45">Candidate review</p>
          <div className="mt-4 h-2 rounded-full bg-white/[0.08]">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#5b8cff] to-[#7c5cff]" />
          </div>
          <p className="mt-3 text-xs text-white/45">4 candidates reviewed</p>
        </div>
      </aside>

      <main className="min-w-0 bg-[radial-gradient(circle_at_80%_0%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,rgba(9,14,27,0.96),rgba(5,8,18,0.98))]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.075] px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.045em] text-white">Senior Financial Analyst</h2>
              <span className="rounded-full border border-[#3dd68c]/25 bg-[#3dd68c]/10 px-3 py-1 text-xs font-semibold text-[#3dd68c]">Active</span>
            </div>
            <nav className="mt-6 flex gap-8 text-sm">
              {["Overview", "Candidates", "Compare", "Insights", "Benchmarking"].map((tab, index) => (
                <span
                  key={tab}
                  className={`relative pb-3 ${index === 1 ? "text-[#9b8cff]" : "text-white/48"}`}
                >
                  {tab}
                  {index === 1 && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#7c5cff]" />}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm font-semibold text-white/78 transition hover:bg-white/[0.06]">
              <Share2 className="h-4 w-4" />
              Share report
            </button>
            <Link
              href="/platform/create"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-4 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(124,92,255,0.28)]"
            >
              <UserPlus className="h-4 w-4" />
              Invite candidates
            </Link>
          </div>
        </header>

        <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">Candidate Review</h3>
                  <p className="mt-1 text-sm text-white/48">Simulation results ranked by overall performance.</p>
                </div>
                <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white/72">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070d1b]">
                <CandidateComparisonTable candidates={CANDIDATES} variant="table" />
              </div>
            </article>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">Signal trend</h3>
                  <span className="text-sm text-[#9b8cff]">Last 30 days</span>
                </div>
                <div className="mt-4">
                  <HiringSignalChart />
                </div>
              </article>
              <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Skill evidence</h3>
                <div className="mt-4">
                  <SkillProgressBars />
                </div>
              </article>
            </div>

            <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">Insights summary</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {SUMMARY.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-white/[0.07] bg-[#081222]/70 p-4">
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <div className="mt-4 space-y-3">
                      {card.rows.map((row, index) => (
                        <div key={row} className="flex items-start gap-2 text-sm text-white/58">
                          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${card.title === "Risk flags" ? "text-[#f5b942]" : "text-[#3dd68c]"}`} />
                          <span>{row}</span>
                          <span className="ml-auto text-xs text-white/36">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <aside className="space-y-4">
            <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">Candidate replay</h3>
              <p className="mt-1 text-sm text-white/48">Review a candidate simulation.</p>
              <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#060914] p-3 text-sm text-white/72">Candidate A</div>
              <button className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] text-sm font-semibold text-white">
                <Play className="h-4 w-4 fill-white" />
                Play simulation
              </button>
              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#081222] text-center">
                {[
                  ["45", "Decisions"],
                  ["75 min", "Duration"],
                  ["12", "Sections"]
                ].map(([value, label]) => (
                  <div key={label} className="border-r border-white/[0.06] p-3 last:border-r-0">
                    <div className="text-lg font-semibold text-white">{value}</div>
                    <div className="text-xs text-white/42">{label}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">Decision log</h3>
              <p className="mt-1 text-sm text-white/48">Key decisions and outcomes.</p>
              <div className="mt-5 space-y-4">
                {DECISIONS.map(([time, label, status]) => (
                  <div key={time} className="grid grid-cols-[46px_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-mono text-white/42">{time}</span>
                    <span className="text-white/70">{label}</span>
                    <span className={status === "Review" ? "text-[#f5b942]" : "text-[#3dd68c]"}>{status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">Insights for Candidate A</h3>
              <p className="mt-3 text-sm leading-7 text-white/62">
                Demonstrates strong analytical rigor and accuracy in financial modeling. Consistently makes data-driven decisions and communicates tradeoffs clearly.
              </p>
              <Link href="/platform" className="mt-4 inline-flex text-sm font-semibold text-[#9b8cff]">
                View detailed insights
              </Link>
            </article>
          </aside>
        </div>
      </main>
    </div>
  );
}
