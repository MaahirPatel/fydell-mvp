import { CANDIDATES } from "@/lib/site-data";
import type { CSSProperties } from "react";

type Candidate = (typeof CANDIDATES)[number];

export default function CandidateComparisonTable({
  candidates,
  variant = "compact"
}: {
  candidates: readonly Candidate[];
  variant?: "compact" | "table";
}) {
  if (variant === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.035] text-left text-xs font-medium text-white/44">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Top skill areas</th>
              <th className="px-4 py-3">Decision accuracy</th>
              <th className="px-4 py-3">Fit</th>
              <th className="px-4 py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, index) => (
              <tr key={c.name} className="border-b border-white/[0.065] last:border-b-0">
                <td className="px-4 py-4">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold ${index === 0 ? "bg-[#7c5cff] text-white" : "bg-white/[0.08] text-white/64"}`}>
                    {c.rank}
                  </span>
                </td>
                <td className="px-4 py-4 font-medium text-white">{c.name}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="relative h-9 w-9 rounded-full bg-[conic-gradient(#7c5cff_var(--score),rgba(255,255,255,0.08)_0)]" style={{ "--score": `${c.score * 3.6}deg` } as CSSProperties}>
                      <span className="absolute inset-1 rounded-full bg-[#070d1b]" />
                    </span>
                    <div>
                      <div className="font-mono text-lg text-white tabular-nums">{c.score}%</div>
                      <div className="text-xs text-white/36">{index === 0 ? "Top 10%" : index === 1 ? "Top 25%" : "Review band"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-[#7c5cff]/24 bg-[#7c5cff]/12 px-2 py-1 text-xs text-[#b8a9ff]">{c.skill}</span>
                    <span className="rounded-md border border-[#5b8cff]/20 bg-[#5b8cff]/10 px-2 py-1 text-xs text-[#9dbaff]">Evidence quality</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-white/78 tabular-nums">{Math.max(61, c.score - 2)}%</td>
                <td className="px-4 py-4 text-[#f5b942]">{"★".repeat(Math.max(3, 5 - index))}<span className="text-white/22">{"★".repeat(Math.min(2, index))}</span></td>
                <td className="px-4 py-4">
                  <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${c.score >= 80 ? "bg-[#3dd68c]/12 text-[#3dd68c]" : "bg-[#f5b942]/12 text-[#f5b942]"}`}>
                    {c.decision}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">Recent candidates</p>
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-[11px]">
            <span className="w-24 shrink-0 text-white/75">{c.name}</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  c.score === 0 ? "bg-white/15" : "bg-gradient-to-r from-violet-accent to-teal-accent"
                }`}
                style={{ width: `${Math.max(c.score, 3)}%` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-white/55 tabular-nums">{c.score}%</span>
            <span
              className={`hidden w-20 text-right text-[9px] sm:block ${
                c.score >= 80 ? "text-success" : c.score === 0 ? "text-white/25" : "text-white/40"
              }`}
            >
              {c.decision}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
