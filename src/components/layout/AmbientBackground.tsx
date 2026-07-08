"use client";

import { motion } from "motion/react";

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#03050d]" />
      <motion.div
        className="absolute left-[-18%] top-[6%] h-[520px] w-[680px] rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle, rgba(91,140,255,0.18), transparent 68%)" }}
        animate={{ opacity: [0.35, 0.58, 0.35] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-12%] top-[0] h-[660px] w-[760px] rounded-full blur-[165px]"
        style={{ background: "radial-gradient(circle, rgba(124,92,255,0.2), transparent 70%)" }}
        animate={{ opacity: [0.32, 0.55, 0.32] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "72px 72px"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.36) 82%), linear-gradient(180deg, rgba(3,5,13,0.05), rgba(3,5,13,0.72))"
        }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
