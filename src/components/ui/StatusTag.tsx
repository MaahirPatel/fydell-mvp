import { cn } from "@/lib/cn";

/**
 * Compact semantic status. Deliberately not a pill: 4px radius, small, quiet.
 * Only use this where the state of a real object matters. Never decorative.
 */
export type StatusTone = "neutral" | "active" | "changed" | "risk" | "good";

const TONE: Record<StatusTone, string> = {
  neutral:
    "border-[var(--border-default)] bg-[var(--surface-selected)] text-[var(--text-secondary)]",
  active:
    "border-[var(--border-default)] bg-[var(--field-blue)] text-[var(--ink-blue)]",
  changed:
    "border-[var(--border-default)] bg-[var(--status-attention-bg)] text-[var(--fydell-changed)]",
  risk: "border-[var(--border-default)] bg-[var(--surface-counter)] text-[var(--fydell-risk)]",
  good: "border-[var(--border-default)] bg-[var(--status-positive-bg)] text-[var(--fydell-good)]",
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
        "inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-[var(--radius-tag)] border px-1.5 text-app-meta font-medium leading-none",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default StatusTag;
