"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { cardHover } from "@/lib/motion";

export default function GlowCard({
  children,
  className,
  glow = false
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={cardHover}
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1018]/90 transition-colors hover:border-white/[0.14]",
        glow && "shadow-[0_0_40px_rgba(124,92,255,0.12)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
