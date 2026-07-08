"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Building2, CheckCircle2, Send, Star, Users, type LucideIcon } from "lucide-react";
import { PRICING } from "@/lib/site-data";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";

const PLAN_ICONS: Record<string, LucideIcon> = {
  Pilot: Send,
  Team: Users,
  Enterprise: Building2
};

export default function PricingCards() {
  return (
    <Stagger className="grid items-stretch gap-5 lg:grid-cols-3" amount={0.15}>
      {PRICING.map((plan) => {
        const Icon = PLAN_ICONS[plan.name] ?? Send;
        return (
          <StaggerItem key={plan.name} className="h-full">
            <motion.article
              whileHover={{ y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`relative flex h-full flex-col rounded-[24px] border p-8 ${
                plan.highlight
                  ? "border-[#7c5cff]/55 bg-[linear-gradient(180deg,rgba(124,92,255,.2),rgba(15,20,36,.86)_44%,rgba(8,12,24,.96))] shadow-[0_30px_110px_rgba(124,92,255,.22)] lg:-translate-y-2"
                  : "border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))]"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#9b5cff]/45 bg-[#130d2b] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">
                  <Star className="h-3 w-3 fill-[#c4b5fd] text-[#c4b5fd]" strokeWidth={1.7} />
                  Most popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    plan.highlight
                      ? "border-[#7c5cff]/40 bg-[#7c5cff]/22 text-[#c4b5fd]"
                      : "border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <h3 className="text-xl font-extrabold tracking-[-0.04em] text-white">{plan.name}</h3>
              </div>
              <p className="mt-4 min-h-10 text-[14px] leading-relaxed text-[#9aa4b8]">{plan.desc}</p>

              <div className="mt-7 flex items-end gap-2">
                <span className="text-[44px] font-extrabold leading-none tracking-[-0.055em] text-white">
                  {plan.price}
                </span>
                {plan.period && <span className="pb-1.5 text-[14px] text-[#9aa4b8]">{plan.period}</span>}
              </div>
              {plan.billing && (
                <p className="mt-2 text-[12.5px] font-medium text-white/45">{plan.billing}</p>
              )}

              <div className="mt-7 h-px bg-white/[0.08]" />

              <ul className="mt-7 flex-1 space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[14px] leading-relaxed text-white/78">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea7ff]" strokeWidth={1.8} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`btn-lift mt-8 flex h-12 w-full items-center justify-center rounded-xl text-[14px] font-bold ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] text-white shadow-[0_18px_54px_rgba(124,92,255,.35)] hover:brightness-110"
                    : "border border-white/[0.12] bg-white/[0.025] text-white/85 hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
