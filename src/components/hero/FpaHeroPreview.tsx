"use client";

import { CheckCircle2, Clock, AlertCircle, TrendingUp, FileText, Users } from "lucide-react";

const CANDIDATES = [
  {
    id: "Candidate 01",
    initials: "C1",
    status: "Complete",
    decision: "Advance",
    decisionColor: "text-emerald-400",
    decisionBg: "bg-emerald-400/10 border-emerald-400/20",
    evidenceScore: 87,
    time: "4h 12m",
    statusIcon: CheckCircle2,
    statusColor: "text-emerald-400",
  },
  {
    id: "Candidate 02",
    initials: "C2",
    status: "In progress",
    decision: null,
    decisionColor: "",
    decisionBg: "",
    evidenceScore: null,
    time: "2h 05m",
    statusIcon: Clock,
    statusColor: "text-amber-400",
  },
];

const SIGNALS = [
  { label: "Modeling discipline", value: 91 },
  { label: "Risk detection", value: 78 },
  { label: "Communication clarity", value: 85 },
];

export default function FpaHeroPreview() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#080C16] shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_60px_rgba(37,99,255,0.08)]"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563FF]/20 text-[#2563FF]">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Project Meridian</p>
            <p className="text-[11px] text-[#6F7A8C]">FP&A Analyst · Senior</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      </div>

      {/* Candidates section */}
      <div className="px-5 pt-4 pb-2">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6F7A8C]">
            <Users className="h-3 w-3" />
            Candidates
          </span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#A7B0C0]">2 invited</span>
        </div>

        <div className="space-y-2">
          {CANDIDATES.map((c) => {
            const StatusIcon = c.statusIcon;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 transition-colors duration-150 hover:bg-white/[0.05]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563FF]/15 text-[11px] font-bold text-[#2563FF]">
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white">{c.id}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <StatusIcon className={`h-3 w-3 ${c.statusColor}`} strokeWidth={2} />
                    <span className={`text-[11px] ${c.statusColor}`}>{c.status}</span>
                    <span className="text-[#6F7A8C]">·</span>
                    <span className="text-[11px] text-[#6F7A8C]">{c.time}</span>
                  </div>
                </div>
                {c.decision && (
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${c.decisionBg} ${c.decisionColor}`}>
                    {c.decision}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence quality */}
      <div className="mx-5 mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6F7A8C]">Evidence quality</span>
          <span className="text-[12px] font-semibold text-[#2563FF]">87 / 100</span>
        </div>
        <div className="space-y-2">
          {SIGNALS.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[#A7B0C0]">{s.label}</span>
                <span className="text-[11px] font-medium text-white">{s.value}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2563FF] to-[#7C3DFF]"
                  style={{ width: `${s.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports ready footer */}
      <div className="mx-5 mt-3 mb-4 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[#A7B0C0]" strokeWidth={1.7} />
          <span className="text-[12px] text-[#A7B0C0]">Report ready</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#2563FF]/15 px-2.5 py-1 text-[11px] font-semibold text-[#2563FF]">1 of 2</span>
          <span className="text-[11px] text-[#6F7A8C]">Advance · Hold · Reject</span>
        </div>
      </div>

      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(37,99,255,0.35), transparent 70%)" }}
        aria-hidden
      />
    </div>
  );
}
