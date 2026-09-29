import type { ReactNode } from "react";

/**
 * Pages load finished: content is never animated in on navigation or scroll.
 * These wrappers keep their call sites stable and render plain containers.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string; delay?: number; y?: number; once?: boolean }) {
  return <div className={className}>{children}</div>;
}

export function Stagger({ children, className }: { children: ReactNode; className?: string; once?: boolean; amount?: number }) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
