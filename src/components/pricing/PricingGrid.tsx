"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Lock, Settings, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PRICING } from "@/lib/site-data";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const productStrip = [
  ["Private workspaces", "Isolated environments for team data and simulations.", ShieldCheck],
  ["Exportable reports", "Share structured evidence with hiring committees.", SlidersHorizontal],
  ["Admin controls", "Manage roles, access, and evaluation workflows.", Settings],
  ["Security-ready architecture", "Designed for controlled workspaces and review trails.", Lock]
] as const;

export default function PricingGrid() {
  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-24 lg:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-80 w-[760px] -translate-x-1/2 rounded-full bg-[#7c5cff]/12 blur-3xl" />

      <div className="relative mx-auto max-w-[1320px]">
        <Reveal className="mx-auto max-w-[800px] text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-6 text-[clamp(2.8rem,4.7vw,5.4rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
            Start with a pilot. <span className="text-gradient">Scale when you see signal.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[620px] text-[18px] leading-[1.65] text-[#9aa4b8]">
            Run one cohort, evaluate signal quality, then expand across roles, departments, and hiring teams.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid items-stretch gap-5 lg:grid-cols-3" amount={0.15}>
          {PRICING.map((plan) => (
            <StaggerItem key={plan.name} className="h-full">
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex h-full flex-col rounded-[24px] border p-8 ${
                  plan.highlight
                    ? "border-[#7c5cff]/55 bg-[linear-gradient(180deg,rgba(124,92,255,.18),rgba(15,20,36,.84)_42%,rgba(8,12,24,.96))] shadow-[0_28px_100px_rgba(124,92,255,.18)]"
                    : "border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-[#9b5cff]/45 bg-[#130d2b] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">
                    Most selected
                  </span>
                )}
                <h3 className="text-2xl font-extrabold tracking-[-0.04em] text-white">{plan.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#9aa4b8]">{plan.desc}</p>
                <div className="mt-8 flex items-end gap-2">
                  <span className="text-[42px] font-extrabold leading-none tracking-[-0.055em] text-white">
                    {plan.price}
                  </span>
                  {plan.period && <span className="pb-1 text-sm text-[#9aa4b8]">{plan.period}</span>}
                </div>
                <div className="mt-8 h-px bg-white/[0.08]" />
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-white/76">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea7ff]" strokeWidth={1.8} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`btn-lift group mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-bold ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#6f4cff] to-[#5b8cff] text-white shadow-[0_18px_54px_rgba(124,92,255,.35)]"
                      : "border border-white/[0.12] bg-white/[0.025] text-white/82 hover:bg-white/[0.055]"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-8 grid gap-4 rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-5 md:grid-cols-2 lg:grid-cols-4" delay={0.05}>
          {productStrip.map(([title, body, Icon]) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#7c5cff]/18 text-[#c4b5fd]">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#9aa4b8]">{body}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
