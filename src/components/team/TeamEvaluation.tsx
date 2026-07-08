"use client";

import { motion } from "motion/react";
import { Play, GitCompare, Brain, Users } from "lucide-react";
import { CANDIDATES, TEAM_FEATURES } from "@/lib/site-data";

const INSIGHTS = [
  { label: "Model accuracy", score: 91 },
  { label: "Communication", score: 84 },
  { label: "Judgment under pressure", score: 88 }
];

export default function TeamEvaluation() {
  return (
    <section id="teams" className="py-8">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">For hiring teams</p>
      <h2 className="headline mt-1 text-lg font-semibold text-white">Better decisions, together</h2>

      <ul className="mt-3 space-y-1">
        {TEAM_FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-[10px] text-white/48">
            <span className="text-success">Done</span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0e1a] shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/30 px-3 py-2">
          <span className="text-[10px] font-semibold text-white">Financial Analyst | Simulation cohort</span>
          <div className="flex gap-2">
            {["Overview", "Candidates", "Insights"].map((t, i) => (
              <span key={t} className={`text-[9px] ${i === 1 ? "text-white" : "text-white/35"}`}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="p-2.5">
          {CANDIDATES.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-2 border-b border-white/[0.04] py-1.5 last:border-0"
            >
              <span className="w-4 text-[9px] text-white/30">{c.rank}</span>
              <span className="w-20 shrink-0 text-[10px] font-medium text-white/80">{c.name}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${c.score}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-accent to-indigo-400"
                />
              </div>
              <span className="w-7 text-right font-mono text-[9px] tabular-nums text-white/55">{c.score}%</span>
              <span
                className={`w-14 text-right text-[8px] ${
                  c.decision === "Strong hire"
                    ? "text-success"
                    : c.decision === "Consider"
                      ? "text-white/35"
                      : "text-teal-accent/80"
                }`}
              >
                {c.decision}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04]">
          <div className="bg-[#0a0e1a] p-2.5">
            <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-white/32">
              <Brain className="h-3 w-3" />
              AI rationale
            </div>
            <div className="mt-2 space-y-1">
              {INSIGHTS.map((ins) => (
                <div key={ins.label} className="flex items-center justify-between text-[8px]">
                  <span className="text-white/45">{ins.label}</span>
                  <span className="font-mono text-violet-accent">{ins.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0a0e1a] p-2.5">
            <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-white/32">
              <GitCompare className="h-3 w-3" />
              Committee
            </div>
            <div className="mt-2 flex items-center gap-1">
              {["AK", "JL", "MR"].map((a) => (
                <span
                  key={a}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-accent/30 text-[7px] font-bold text-white"
                >
                  {a}
                </span>
              ))}
              <Users className="ml-1 h-3 w-3 text-white/30" />
              <span className="text-[8px] text-white/35">3 reviewers</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] bg-black/25 p-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/32">Candidate replay</p>
          <div className="relative mt-1.5 flex h-14 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-gradient-to-br from-violet-accent/10 to-black/40">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)" }} />
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur"
            >
              <Play className="h-2.5 w-2.5 fill-white text-white" />
            </motion.button>
            <span className="absolute bottom-1 right-2 font-mono text-[7px] text-white/30">18:42 / 25:00</span>
          </div>
        </div>
      </div>
    </section>
  );
}
