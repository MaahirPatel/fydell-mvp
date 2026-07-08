import { BookOpen, LogOut, MessageSquare } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import {
  FinancialTable,
  LiveInsights,
  MAIN_TABS,
  METRICS,
  MetricCard,
  ObjectivesList,
  ProgressDonut,
  ProgressSteps,
  RevenueEbitdaTrend,
  StepIndicator,
  TeamChat,
  UploadedFiles,
  ValuationRange
} from "@/components/simulation/SimParts";

const RAIL_LABEL = "text-[7px] font-bold uppercase tracking-[0.18em] text-[#8fa2ff]";

export default function HeroDashboard() {
  return (
    <div className="relative z-[4] flex h-full flex-col overflow-hidden bg-[#03050d] text-white">
      {/* Top bar */}
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-white/[0.075] bg-[#03050d]/85 px-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <FydellMark width={20} />
          <span className="text-[12px] font-bold tracking-[-0.04em] text-white">fydell</span>
        </div>
        <div className="hidden min-w-0 flex-col items-center gap-1 md:flex">
          <span className="text-[9px] font-semibold tracking-[-0.01em] text-white/85">Financial Analyst Simulation</span>
          <StepIndicator compact />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-md border border-white/[0.09] bg-white/[0.035] px-1.5 py-0.5 sm:inline-flex">
            <span className="text-[6px] font-semibold uppercase tracking-[0.14em] text-white/36">Time</span>
            <span className="tabular-nums font-mono text-[9px] font-bold text-white">23:58</span>
          </span>
          <span className="hidden h-5 items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.035] px-1.5 text-[8px] font-semibold text-white/72 lg:inline-flex">
            <BookOpen className="h-2.5 w-2.5" strokeWidth={1.7} />
            Resources
          </span>
          <span className="inline-flex h-5 items-center gap-1 rounded-md bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-1.5 text-[8px] font-semibold text-white">
            <LogOut className="h-2.5 w-2.5" strokeWidth={1.7} />
            Exit
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-[120px_1fr_150px] gap-2 p-2">
        {/* Left rail */}
        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
          <div>
            <p className={RAIL_LABEL}>Scenario</p>
            <h2 className="mt-1 text-[12px] font-semibold leading-tight tracking-[-0.03em]">Acquisition Analysis</h2>
            <p className="mt-1 text-[7.5px] leading-snug text-white/55">
              Evaluate the acquisition of a premium consumer brands portfolio for $2.4B.
            </p>
            <span className="mt-1 inline-block text-[7.5px] font-semibold text-[#9b8cff]">Read full mandate</span>
          </div>
          <div>
            <p className={RAIL_LABEL}>Objectives</p>
            <div className="mt-1">
              <ObjectivesList compact />
            </div>
          </div>
          <div className="min-h-0">
            <p className={RAIL_LABEL}>Uploaded Files</p>
            <div className="mt-1">
              <UploadedFiles compact />
            </div>
          </div>
        </aside>

        {/* Center */}
        <main className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
          <div className="flex items-center gap-1 border-b border-white/[0.07] pb-1.5">
            {MAIN_TABS.slice(0, 6).map((tab, i) => (
              <span
                key={tab}
                className={`rounded px-1.5 py-0.5 text-[7.5px] font-medium ${
                  i === 0 ? "bg-[#7c5cff]/22 text-white ring-1 ring-[#7c5cff]/35" : "text-white/45"
                }`}
              >
                {tab}
              </span>
            ))}
            <span className="ml-auto rounded border border-white/[0.09] bg-white/[0.035] px-1.5 py-0.5 text-[7px] text-white/55">
              View as: Consolidated
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {METRICS.map((m) => (
              <MetricCard key={m.label} metric={m} compact />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <ValuationRange compact />
            <FinancialTable compact />
          </div>

          <div className="min-h-0">
            <RevenueEbitdaTrend compact />
          </div>
        </main>

        {/* Right rail */}
        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
            <p className="inline-flex items-center gap-1 text-[9px] font-semibold">
              <MessageSquare className="h-2.5 w-2.5 text-[#8fa2ff]" strokeWidth={1.7} />
              Team Chat
            </p>
            <div className="mt-1.5 min-h-0 flex-1 overflow-hidden">
              <TeamChat compact />
            </div>
          </section>

          <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
            <p className={RAIL_LABEL}>Progress</p>
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressDonut size={44} value={58} />
              <div>
                <p className="text-[9px] font-bold text-white">58% Complete</p>
              </div>
            </div>
            <div className="mt-1.5">
              <ProgressSteps compact />
            </div>
          </section>

          <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
            <p className={RAIL_LABEL}>Live Insights</p>
            <div className="mt-1.5">
              <LiveInsights compact />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
