"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ALL_SIMULATIONS } from "@/lib/simulations/content";
import { ROLES } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import { PILOT_EVALUATION_SLUG } from "@/lib/simulations/content/micro-ops-yield";

type FilterKey = "all" | RoleKey;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  ...ROLES.map((r) => ({ key: r.key as FilterKey, label: r.title })),
];

function roleTitle(key: RoleKey): string {
  return ROLES.find((r) => r.key === key)?.title ?? key;
}

function SceneMark({ slug, company }: { slug: string; company: string }) {
  const isPilot = slug === PILOT_EVALUATION_SLUG;
  return (
    <div
      className="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[#0c0d11]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_40%)]" />
      <div className="absolute left-4 top-4 right-4">
        <p className="truncate text-[11px] text-white/35">{company}</p>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-[72%] rounded-sm bg-white/[0.08]" />
          <div className="h-1.5 w-[54%] rounded-sm bg-white/[0.06]" />
          <div className="h-1.5 w-[63%] rounded-sm bg-white/[0.05]" />
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 top-10 w-[2px] ${
          isPilot ? "bg-[var(--fydell-evidence-selected)]" : "bg-white/15"
        }`}
      />
      <div className="absolute bottom-4 left-4 right-4 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
        <p className="text-[11px] text-white/45">
          {isPilot ? "Evidence tray · yield investigation" : "Work trial · inspectable result"}
        </p>
      </div>
    </div>
  );
}

export default function SimulationsFeed() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const items = useMemo(() => {
    const list =
      filter === "all"
        ? [...ALL_SIMULATIONS]
        : ALL_SIMULATIONS.filter((s) => s.roleKey === filter);
    return list.sort((a, b) => {
      if (a.slug === PILOT_EVALUATION_SLUG) return -1;
      if (b.slug === PILOT_EVALUATION_SLUG) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [filter]);

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2"
          aria-label="Filter simulations by role"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`text-[13.5px] transition-colors ${
                  active ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </nav>
        <p className="text-[12.5px] tabular-nums text-white/35">
          {items.length === 1 ? "1 simulation" : `${items.length} simulations`}
        </p>
      </div>

      <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((sim) => (
          <article key={sim.slug} className="group flex flex-col">
            <Link
              href={`/simulations/start/${sim.slug}`}
              className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--fydell-evidence-selected)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-canvas)]"
            >
              <SceneMark slug={sim.slug} company={sim.companyName} />
              <h2 className="mt-5 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-white group-hover:text-white">
                {sim.title}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/45 line-clamp-3">
                {sim.tagline}
              </p>
              <p className="mt-4 text-[12.5px] text-white/30">
                {roleTitle(sim.roleKey)}
                {" · "}
                {sim.durationMinutes} min
                {sim.slug === PILOT_EVALUATION_SLUG ? " · October pilot evaluation" : ""}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
