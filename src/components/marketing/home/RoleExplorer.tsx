"use client";

/**
 * Role picker for /roles - neutral selection (border + bg), no violet fog or pill clouds.
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
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-row flex-wrap gap-1.5 lg:flex-col" role="tablist" aria-label="Roles">
        {roles.map((r, i) => {
          const active = i === selected;
          return (
            <button
              key={r.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(i)}
              className={`relative rounded-[10px] border px-3.5 py-2.5 text-left transition ${
                active
                  ? "border-white/25 bg-white/[0.08] pl-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-[var(--fydell-evidence)]"
                  : "border-[var(--border-subtle)] bg-transparent hover:bg-white/[0.04]"
              }`}
            >
              <p className={`text-[13.5px] font-medium ${active ? "text-white" : "text-white/70"}`}>
                {r.title}
              </p>
              <p className="mt-0.5 text-[12px] text-white/40">{r.pathway}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-semibold text-white">{role.title}</h3>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-white/55">
              {role.summary}
            </p>
          </div>
          <Link
            href={`/simulations/start/${role.featuredSlug}`}
            className="shrink-0 rounded-[6px] bg-[var(--fydell-action)] px-3.5 py-2 text-[13px] font-medium text-[#090A0D] transition hover:brightness-[0.97]"
          >
            Try a simulation
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[10px] border border-[var(--border-subtle)] p-4">
            <p className="text-[12px] font-medium text-white/45">Example problem</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{role.exampleProblem}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border-subtle)] p-4">
            <p className="text-[12px] font-medium text-white/45">What we observe</p>
            <ul className="mt-2 space-y-1 text-[12.5px] text-white/60">
              {role.competencies.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] font-medium text-white/45">Tools in the simulation</p>
            <p className="mt-1 text-[12.5px] text-white/55">{role.tools.join(" · ")}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[12px] font-medium text-white/45">Available simulations</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {role.simulations.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/simulations/start/${s.slug}`}
                  className="block rounded-[6px] px-2 py-1.5 text-[13px] text-white/65 transition hover:bg-white/[0.04] hover:text-white"
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
