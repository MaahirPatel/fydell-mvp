"use client";

/**
 * Compact role family explorer: selectors swap one central panel.
 * Artifact-led, not six identical feature cards.
 */
import { useState } from "react";
import Link from "next/link";
import { TRY_CANDIDATE_HREF } from "@/lib/marketing/ctas";

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
      <div className="flex flex-row flex-wrap gap-2 lg:flex-col" role="tablist" aria-label="Roles">
        {roles.map((r, i) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`rounded-[10px] border px-4 py-3 text-left transition ${
              i === selected
                ? "border-[#3157D5]/40 bg-[#EEF2FF]"
                : "border-[#D9DEE7] bg-[#FCFCFA] hover:bg-white"
            }`}
          >
            <p
              className={`text-[13.5px] font-semibold ${
                i === selected ? "text-[#0B1020]" : "text-[#0B1020]/80"
              }`}
            >
              {r.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[#586273]">{r.pathway}</p>
          </button>
        ))}
      </div>

      <div className="rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[19px] font-semibold text-[#0B1020]">{role.title}</h3>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#586273]">
              {role.summary}
            </p>
          </div>
          <Link
            href={`/simulations/start/${role.featuredSlug}`}
            className="shrink-0 rounded-[9px] bg-[#3157D5] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2342A2]"
          >
            Try this role
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#586273]">
              Example problem
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#0B1020]">{role.exampleProblem}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#586273]">
              What we observe
            </p>
            <ul className="mt-2 space-y-1.5">
              {role.competencies.map((c) => (
                <li key={c} className="text-[13px] text-[#0B1020]">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#586273]">
              Tools in the simulation
            </p>
            <p className="mt-1 text-[12.5px] text-[#586273]">{role.tools.join(" · ")}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-[#D9DEE7] pt-4">
          <Link
            href={TRY_CANDIDATE_HREF}
            className="text-[13px] font-semibold text-[#3157D5] transition hover:text-[#2342A2]"
          >
            Browse all simulations →
          </Link>
        </div>
      </div>
    </div>
  );
}
