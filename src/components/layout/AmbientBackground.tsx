"use client";

import { motion } from "motion/react";

export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Base background */}
      <div className="absolute inset-0 bg-[#050609]" />

      {/* Subtle blue hint — top-left, very faint */}
      <motion.div
        className="absolute left-[-10%] top-[4%] h-[480px] w-[600px] rounded-full blur-[180px]"
        style={{ background: "radial-gradient(circle, rgba(59,91,255,0.07), transparent 68%)" }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle warm-cool hint — top-right, barely visible */}
      <motion.div
        className="absolute right-[-8%] top-[-2%] h-[560px] w-[620px] rounded-full blur-[200px]"
        style={{ background: "radial-gradient(circle, rgba(100,70,200,0.05), transparent 70%)" }}
        animate={{ opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Faint grid — 2-3% opacity */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.28) 86%), linear-gradient(180deg, rgba(5,6,9,0.04), rgba(5,6,9,0.55))",
        }}
      />

      <div className="grain absolute inset-0" />
    </div>
  );
}
