"use client";

import { motion } from "motion/react";
import {
  BarChart3,
  Brain,
  Layers,
  MessageSquare,
  Sparkles,
  Workflow
} from "lucide-react";
import { PLATFORM_FEATURES } from "@/lib/site-data";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/motion";

const ICONS = [Layers, Workflow, MessageSquare, Brain, BarChart3, Sparkles];

function PlatformWave() {
  return (
    <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 opacity-40" aria-hidden>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="pw" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(124,92,255,0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#pw)" />
        <path d="M20 120 Q60 80 100 100 T180 90" fill="none" stroke="rgba(124,92,255,0.25)" strokeWidth="2" />
        <path d="M10 140 Q70 100 110 120 T190 110" fill="none" stroke="rgba(94,234,212,0.15)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function PlatformGrid({ variant = "full" }: { variant?: "full" | "hero" }) {
  const isHero = variant === "hero";

  return (
    <div id="platform" className="relative">
      {isHero && <PlatformWave />}

      <div className="relative">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
          {isHero ? "Our platform" : "Platform"}
        </p>
        <h2
          className={cn(
            "mt-1 font-semibold leading-tight tracking-tight text-white",
            isHero ? "text-[15px]" : "headline text-[clamp(1.75rem,3vw,2.25rem)]"
          )}
        >
          The closest thing to the actual job.
        </h2>
        {!isHero && (
          <p className="body mt-3 max-w-xl text-[15px] leading-relaxed text-white/45">
            Not another assessment tool - a command center for how candidates actually work under
            real pressure.
          </p>
        )}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className={cn("relative mt-3 grid gap-2", isHero ? "grid-cols-2" : "mt-8 gap-4 sm:grid-cols-2 lg:grid-cols-3")}
      >
        {PLATFORM_FEATURES.map((f, i) => {
          const Icon = ICONS[i];
          return (
            <motion.div
              key={f.title}
              variants={staggerItem}
              className="group rounded-xl border border-white/[0.08] bg-[#0c1018]/80 p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-[#0e1220] hover:shadow-[0_8px_32px_rgba(124,92,255,0.08)]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-accent/15 text-violet-accent transition group-hover:bg-violet-accent/25">
                <Icon className="h-3 w-3" strokeWidth={1.75} />
              </div>
              <h3 className="mt-1.5 text-[10px] font-semibold text-white">{f.title}</h3>
              <p className="mt-0.5 text-[8px] leading-snug text-white/42">{f.body}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
