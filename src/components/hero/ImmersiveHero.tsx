"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import HeroDashboard from "@/components/hero/HeroDashboard";
import CountUp from "@/components/motion/CountUp";

const EASE = [0.16, 1, 0.3, 1] as const;

const METRICS = [
  { value: "70%", label: "Less time to hire" },
  { value: "89%", label: "Stronger hire quality" },
  { value: "2x", label: "Faster onboarding insight" }
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } }
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } }
};

const visual: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE, delay: 0.18 } }
};

export default function ImmersiveHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-[132px] pb-16 lg:pt-[150px] lg:pb-24">
      <div className="pointer-events-none absolute left-[2%] top-[14%] h-[420px] w-[520px] rounded-full bg-[#2563eb]/18 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-8%] top-[2%] h-[560px] w-[720px] rounded-full bg-[#7c5cff]/20 blur-[160px]" />

      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        <motion.div
          variants={reduce ? undefined : container}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "show"}
          className="grid items-center gap-12 lg:min-h-[600px] lg:grid-cols-[1fr_1.04fr] xl:gap-16"
        >
          <div className="relative z-10 max-w-[600px]">
            <motion.span variants={reduce ? undefined : item} className="eyebrow">
              AI-powered work simulations
            </motion.span>

            <motion.h1
              variants={reduce ? undefined : item}
              className="mt-6 text-white"
              style={{
                fontSize: "clamp(3.4rem, 6vw, 5.6rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.045em",
                fontWeight: 800
              }}
            >
              Hire with{" "}
              <span className="bg-gradient-to-r from-[#6fa4ff] via-[#8a8cff] to-[#a78bff] bg-clip-text text-transparent">
                conviction
              </span>
            </motion.h1>

            <motion.p
              variants={reduce ? undefined : item}
              className="mt-6 max-w-[520px] text-[18px] leading-[1.6] text-[rgba(226,232,240,0.82)]"
            >
              Fydell uses immersive work simulations to reveal how candidates think, decide, and
              perform. Hire on real evidence, not polished resumes.
            </motion.p>

            <motion.div
              variants={reduce ? undefined : item}
              className="mt-9 flex flex-wrap items-center gap-3.5"
            >
              <Link
                href="/signup"
                className="btn-lift group inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-6 text-[15px] font-semibold text-white shadow-[0_16px_44px_-12px_rgba(124,92,255,0.6)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]"
              >
                Book a demo
                <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={1.9} />
              </Link>
              <Link
                href="/simulation"
                className="btn-lift inline-flex h-12 items-center gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[15px] font-semibold text-white/88 transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.06]">
                  <Play className="h-3 w-3 fill-white text-white" />
                </span>
                See how it works
              </Link>
            </motion.div>

            <motion.dl
              variants={reduce ? undefined : item}
              className="mt-12 grid max-w-[520px] grid-cols-3 divide-x divide-white/[0.1]"
            >
              {METRICS.map((metric) => (
                <div key={metric.label} className="px-5 first:pl-0 last:pr-0">
                  <dt className="sr-only">{metric.label}</dt>
                  <dd>
                    <CountUp
                      value={metric.value}
                      className="block bg-gradient-to-r from-[#7fd0ff] via-[#7fa6ff] to-[#a78bff] bg-clip-text text-[2.4rem] font-extrabold leading-none tracking-[-0.04em] text-transparent tabular-nums"
                    />
                    <span className="mt-2 block text-[13px] leading-snug text-white/65">{metric.label}</span>
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div variants={reduce ? undefined : visual} className="relative">
            <div
              className="pointer-events-none absolute -inset-10 rounded-[40px] opacity-90 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at 55% 40%, rgba(124,92,255,0.28), transparent 62%), radial-gradient(ellipse at 12% 60%, rgba(91,140,255,0.22), transparent 58%)"
              }}
              aria-hidden
            />
            <div className="hero-preview-frame relative h-[440px] w-full sm:h-[500px] lg:h-[540px]">
              <HeroDashboard />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
