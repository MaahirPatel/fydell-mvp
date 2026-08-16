import { cn } from "@/lib/cn";

/**
 * Compact semantic status. Deliberately not a pill: 4px radius, small, quiet.
 * Only use this where the state of a real object matters. Never decorative.
 */
export type StatusTone = "neutral" | "active" | "changed" | "risk" | "good";

const TONE: Record<StatusTone, string> = {
  neutral:
    "border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]",
  active:
    "border-[rgba(107,140,255,0.32)] bg-[rgba(107,140,255,0.1)] text-[#9db1ff]",
  changed:
    "border-[rgba(233,185,73,0.3)] bg-[rgba(233,185,73,0.1)] text-[#e9c46a]",
  risk: "border-[rgba(242,107,130,0.32)] bg-[rgba(242,107,130,0.1)] text-[#f593a5]",
  good: "border-[rgba(103,217,160,0.3)] bg-[rgba(103,217,160,0.1)] text-[#7fdfb0]",
};

export function StatusTag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Fixed height clipped longer labels like "Consented, not started" on
        // narrow viewports. The tag keeps its size but no longer wraps inside.
        "inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-[var(--radius-tag)] border px-1.5 text-[12px] font-medium leading-none",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default StatusTag;
