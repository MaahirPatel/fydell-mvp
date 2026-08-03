"use client";

/**
 * Section 2 of the landing page: six compact role selectors that swap the
 * content of one central panel. No stacked role sections.
 */
import { useState } from "react";
import Link from "next/link";

export interface RoleExplorerRole {
  key: string;
  title: string;
  pathway: string;
  summary: string;
  exampleProblem: string;
  tools: string[];
  competencies: string[];
  simulations: { slug: string; title: string }[];
  featuredSlug: string;
}

export default function RoleExplorer({ roles }: { roles: RoleExplorerRole[] }) {
  const [selected, setSelected] = useState(0);
  const role = roles[selected];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Selectors */}
      <div className="flex flex-row flex-wrap gap-2 lg:flex-col" role="tablist" aria-label="Roles">
        {roles.map((r, i) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              i === selected
                ? "border-violet-500/50 bg-violet-500/10"
                : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <p className={`text-[13.5px] font-semibold ${i === selected ? "text-white" : "text-white/75"}`}>
              {r.title}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">{r.pathway}</p>
          </button>
        ))}
      </div>

      {/* Central panel */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[19px] font-semibold text-white">{role.title}</h3>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-white/60">
              {role.summary}
            </p>
          </div>
          <Link
            href={`/simulations/start/${role.featuredSlug}`}
            className="shrink-0 rounded-[9px] bg-violet-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-violet-400"
          >
            Try a simulation
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Example problem
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{role.exampleProblem}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
              What we observe
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {role.competencies.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-white/65"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Tools in the simulation
            </p>
            <p className="mt-1 text-[12.5px] text-white/55">{role.tools.join(" · ")}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Five available simulations
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {role.simulations.map((s, i) => (
              <li key={s.slug}>
                <Link
                  href={`/simulations/start/${s.slug}`}
                  className="group flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2 transition hover:border-violet-500/40 hover:bg-violet-500/5"
                >
                  <span className="text-[11px] font-mono text-white/30">{i + 1}</span>
                  <span className="text-[13px] text-white/75 group-hover:text-white">{s.title}</span>
                  <span className="ml-auto text-[10.5px] text-white/30">5 min</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
