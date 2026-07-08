import Link from "next/link";
import { BookOpen, ChevronDown, LogOut, MessageSquare } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import CountdownTimer from "@/components/simulation/CountdownTimer";
import {
  FinancialTable,
  LiveInsights,
  MAIN_TABS,
  MarketStrip,
  METRICS,
  MetricCard,
  NotesPanel,
  ObjectivesList,
  ProgressDonut,
  ProgressSteps,
  RevenueEbitdaTrend,
  StepIndicator,
  TeamChat,
  UploadedFiles,
  ValuationRange
} from "@/components/simulation/SimParts";

const SECTION =
  "rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,20,36,0.9),rgba(7,10,20,0.95))]";
const RAIL_LABEL = "text-[10px] font-bold uppercase tracking-[0.2em] text-[#8fa2ff]";

export default function SimulationExperience() {
  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#03050d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_48%_-4%,rgba(124,92,255,0.16),transparent_36%),radial-gradient(circle_at_6%_22%,rgba(91,140,255,0.12),transparent_34%),linear-gradient(180deg,#03050d,#060914_55%,#02030a)]" />

      {/* TOP BAR */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.075] bg-[#03050d]/85 px-5 backdrop-blur-2xl">
        <div className="flex shrink-0 items-center gap-4">
          <FydellBrand markSize={34} />
        </div>

        <div className="hidden min-w-0 flex-col items-center gap-1.5 lg:flex">
          <h1 className="text-sm font-semibold tracking-[-0.02em]">Financial Analyst Simulation</h1>
          <StepIndicator />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 sm:flex">
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/36">Time Remaining</div>
            <CountdownTimer start={1438} />
          </div>
          <button className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 text-[13px] font-semibold text-white/82 transition hover:bg-white/[0.06] md:inline-flex">
            <BookOpen className="h-4 w-4" strokeWidth={1.7} />
            Resources
          </button>
          <Link
            href="/"
            className="btn-lift inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-3.5 text-[13px] font-semibold text-white shadow-[0_12px_34px_rgba(124,92,255,0.32)]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.7} />
            Exit simulation
          </Link>
        </div>
      </header>

      {/* BODY */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        {/* LEFT SIDEBAR */}
        <aside className={`scroll-slim hidden min-h-0 overflow-y-auto p-4 xl:block ${SECTION}`}>
          <p className={RAIL_LABEL}>Scenario</p>
          <h2 className="mt-2 text-xl font-semibold leading-tight tracking-[-0.04em]">Acquisition Analysis</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/62">
            Evaluate the acquisition of a premium consumer brands portfolio for $2.4B.
          </p>
          <button className="mt-2 text-[12px] font-semibold text-[#9b8cff] hover:text-[#b8a9ff]">Read full mandate</button>

          <div className="mt-6">
            <p className={RAIL_LABEL}>Objectives</p>
            <div className="mt-3">
              <ObjectivesList />
            </div>
          </div>

          <div className="mt-6">
            <p className={RAIL_LABEL}>Uploaded Files</p>
            <div className="mt-3">
              <UploadedFiles />
            </div>
          </div>
        </aside>

        {/* MAIN CENTER */}
        <main className={`scroll-slim min-h-0 overflow-y-auto p-4 ${SECTION}`}>
          {/* Tab row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.075] pb-3">
            <nav className="flex flex-wrap gap-1">
              {MAIN_TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`h-8 rounded-lg px-3 text-[13px] font-medium transition ${
                    i === 0
                      ? "bg-[#7c5cff]/22 text-white ring-1 ring-[#7c5cff]/35"
                      : "text-white/48 hover:bg-white/[0.05] hover:text-white/80"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 text-[12px] font-medium text-white/64">
              <span className="text-white/40">View as:</span> Consolidated
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.7} />
            </button>
          </div>

          {/* Metric cards */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
            {METRICS.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>

          {/* Valuation + Financial summary */}
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <ValuationRange />
            <FinancialTable />
          </div>

          {/* Trend chart */}
          <div className="mt-3">
            <RevenueEbitdaTrend />
          </div>

          {/* Notes / recommendation */}
          <div className="mt-3">
            <NotesPanel />
          </div>

          {/* Market environment */}
          <div className="mt-3">
            <MarketStrip />
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden min-h-0 flex-col gap-3 xl:flex">
          <section className={`flex min-h-0 flex-1 flex-col p-4 ${SECTION}`}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-[13px] font-semibold">
                <MessageSquare className="h-4 w-4 text-[#8fa2ff]" strokeWidth={1.7} />
                Team Chat
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-white/42">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#3dd68c]" />4 online
              </span>
            </div>
            <div className="mt-3 min-h-0 flex-1">
              <TeamChat />
            </div>
          </section>

          <section className={`p-4 ${SECTION}`}>
            <div className="flex items-center justify-between">
              <p className={RAIL_LABEL}>Simulation Progress</p>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <ProgressDonut size={84} value={58} />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-white">58% Complete</p>
                <p className="mt-0.5 text-[11px] text-white/45">Model phase in progress</p>
              </div>
            </div>
            <div className="mt-3">
              <ProgressSteps />
            </div>
          </section>

          <section className={`p-4 ${SECTION}`}>
            <p className={RAIL_LABEL}>Live Insights</p>
            <div className="mt-3">
              <LiveInsights />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
