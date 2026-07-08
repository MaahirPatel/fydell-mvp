"use client";

import { motion } from "motion/react";
import { smoothReveal } from "@/lib/motion";
import { cn } from "@/lib/cn";

export default function SectionWrapper({
  id,
  children,
  className,
  border = false
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}) {
  return (
    <motion.section
      id={id}
      {...smoothReveal}
      className={cn(
        "relative py-16 lg:py-20",
        border && "border-t border-white/[0.06]",
        className
      )}
    >
      <div className="mx-auto max-w-[1520px] px-5 lg:px-8">{children}</div>
    </motion.section>
  );
}
