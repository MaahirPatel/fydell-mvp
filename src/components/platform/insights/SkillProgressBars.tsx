"use client";

import { SKILL_AREAS } from "@/lib/site-data";

export default function SkillProgressBars() {
  return (
    <div className="space-y-3">
      {SKILL_AREAS.map((s) => (
        <div key={s.skill}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-white/70">{s.skill}</span>
            <span className="font-mono text-white/50 tabular-nums">{s.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-accent to-teal-accent"
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
