"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

/**
 * Single scroll-reveal element. Animates transform + opacity only, collapses to
 * static under prefers-reduced-motion. Motivation: progressive disclosure of
 * content as the reader scrolls, establishing reading hierarchy.
 * Content is visible by default so above-the-fold never ships blank if IO stalls.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true
}: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0.001, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
};

/**
 * Parent for staggered child reveals. Children must be wrapped in <StaggerItem>.
 * Motivation: sequenced entrance communicates list grouping and draws the eye
 * across cards in reading order.
 */
export function Stagger({ children, className, once = true, amount = 0.2 }: StaggerProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
