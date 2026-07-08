"use client";

import Link from "next/link";
import { ArrowRight, Clock, Gauge, Zap } from "lucide-react";
import GlowCard from "@/components/ui/GlowCard";
import { SIMULATIONS, WHAT_TO_EXPECT } from "@/lib/site-data";
import { cn } from "@/lib/cn";

const TABS = ["All", "Investment Banking", "Consulting", "Engineering"];

function SimPreview({ industry }: { industry: string }) {
  const palettes: Record<string, string> = {
    "Investment Banking": "from-indigo-900/40 via-violet-900/20 to-[#0a0e1a]",
    Cybersecurity: "from-violet-900/30 via-slate-900/20 to-[#0a0e1a]",
    Product: "from-cyan-900/25 via-violet-900/15 to-[#0a0e1a]",
    Consulting: "from-blue-900/30 via-indigo-900/15 to-[#0a0e1a]",
    Healthcare: "from-emerald-900/25 via-slate-900/20 to-[#0a0e1a]",
    Sales: "from-amber-900/20 via-violet-900/15 to-[#0a0e1a]"
  };

  return (
    <div className={`absolute inset-0 bg-gradient-to-t ${palettes[industry] ?? palettes.Consulting}`}>
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      <svg className="absolute bottom-0 w-full opacity-25" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 80 L0 50 L40 45 L80 55 L120 35 L160 48 L200 30 L240 42 L280 25 L320 38 L360 20 L400 35 L400 80 Z" fill="rgba(124,92,255,0.15)" />
      </svg>
    </div>
  );
}

export default function SimulationMarketplace() {
  const featured = SIMULATIONS.find((s) => s.featured)!;
  const others = SIMULATIONS.filter((s) => !s.featured);

  return (
    <section id="demos" className="py-8">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">Simulation marketplace</p>
      <h2 className="headline mt-1 text-lg font-semibold text-white">Try a live simulation</h2>

      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-medium transition",
              i === 0
                ? "bg-violet-accent/25 text-violet-200 ring-1 ring-violet-accent/30"
                : "bg-white/[0.04] text-white/38 hover:bg-white/[0.07]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3">
        <GlowCard glow className="p-0">
          <div className="relative h-32">
            <SimPreview industry={featured.industry} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 z-10">
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-violet-accent/25 px-1.5 py-0.5 text-[8px] text-violet-200">
                  {featured.difficulty}
                </span>
                <span className="flex items-center gap-0.5 rounded bg-black/40 px-1.5 py-0.5 text-[8px] text-white/60">
                  <Clock className="h-2.5 w-2.5" />
                  {featured.duration}
                </span>
                <span className="flex items-center gap-0.5 rounded bg-violet-accent/20 px-1.5 py-0.5 text-[8px] text-[#8eb0ff]">
                  <Zap className="h-2.5 w-2.5" />
                  {featured.pressure}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-white">{featured.title}</p>
              <p className="text-[9px] text-white/45">{featured.subtitle}</p>
            </div>
          </div>
          <div className="border-t border-white/[0.06] p-2.5">
            <div className="flex flex-wrap gap-1">
              {featured.components.map((c) => (
                <span key={c} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[7px] text-white/45">
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[9px] text-white/40">
                Deliverables: {featured.deliverables.join(" | ")}
              </p>
              <Link
                href="/simulation"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-violet-accent px-2.5 text-[9px] font-semibold text-white hover:brightness-110"
              >
                Launch
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </GlowCard>

        {others.map((sim) => (
          <div
            key={sim.id}
            className="group flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
          >
            <div>
              <p className="text-[10px] font-medium text-white/75 group-hover:text-white">{sim.title}</p>
              <p className="text-[8px] text-white/35">{sim.industry}</p>
            </div>
            <div className="flex items-center gap-2 text-[8px] text-white/30">
              <Gauge className="h-3 w-3" />
              {sim.difficulty}
              <span>{sim.duration}</span>
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/35">What to expect</p>
          <ul className="mt-2 space-y-1">
            {WHAT_TO_EXPECT.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[9px] text-white/50">
                <span className="h-1 w-1 rounded-full bg-teal-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
