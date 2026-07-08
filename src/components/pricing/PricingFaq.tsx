"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { PRICING_FAQ } from "@/lib/site-data";

export default function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {PRICING_FAQ.map((item, index) => {
        const isOpen = open === index;
        return (
          <div
            key={item.q}
            className={`rounded-[20px] border bg-white/[0.025] transition-colors duration-300 ${
              isOpen ? "border-[#7c5cff]/40" : "border-white/[0.09] hover:border-white/[0.16]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-[15.5px] font-bold tracking-[-0.02em] text-white">{item.q}</span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-[#c4b5fd] transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                <Plus className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-[14px] leading-[1.62] text-[#9aa4b8]">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="spotlight-card flex flex-col justify-between gap-4 rounded-[20px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(124,92,255,.1),rgba(255,255,255,.015))] p-6 sm:col-span-2">
        <div>
          <h3 className="text-[16px] font-bold tracking-[-0.02em] text-white">Still have questions?</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#9aa4b8]">Talk to our team.</p>
        </div>
        <Link
          href="/signup"
          className="btn-lift group inline-flex h-11 w-fit items-center gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[14px] font-bold text-white/88 hover:border-white/25 hover:bg-white/[0.07]"
        >
          Contact sales
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
