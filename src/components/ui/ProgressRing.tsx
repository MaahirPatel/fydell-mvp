import { cn } from "@/lib/cn";

/**
 * Completion of a small, countable set of steps. Not a percentage gauge and
 * not a chart: it exists so "3 of 4" is legible at a glance without reading.
 *
 * The ring turns green only when the set is genuinely finished, matching the
 * rule that green never means optimism.
 */
export function ProgressRing({
  value,
  total,
  size = 34,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(value, 0), safeTotal);
  const complete = clamped >= safeTotal;

  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (clamped / safeTotal);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped} of ${safeTotal} complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--viz-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? "var(--viz-done)" : "var(--viz-active)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: `stroke-dasharray var(--motion-panel) var(--ease), stroke var(--motion-panel) var(--ease)`,
          }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-medium tabular-nums leading-none text-[var(--text-secondary)]">
        {clamped}
      </span>
    </div>
  );
}

export default ProgressRing;
