import { useId } from "react";

/*
 * The Fydell mark: two interlocking rings, 1.44:1. The left ring runs blue to
 * violet, the right ring violet to red. The left ring passes over the right at
 * the top crossing and under it at the bottom, which is what makes the rings
 * read as linked rather than overlapping.
 *
 * Geometry is traced from public/brand/fydell-mark.png: ring centres 44 units
 * apart, centreline radius 41.3, band 17.4.
 */
const W = 144;
const H = 100;
const R = 41.3;
const BAND = 17.4;
const LX = 50;
const RX = 94;
const CY = 50;

export function Mark({
  size = 24,
  className,
  title,
}: {
  /** Rendered height in px. Width follows the 1.44:1 ratio. */
  size?: number;
  className?: string;
  /** Pass a title when the mark stands alone as the only label. */
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const left = `fyl${id}`;
  const right = `fyr${id}`;
  const clip = `fyc${id}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={Math.round((size * W) / H)}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      <defs>
        <linearGradient id={left} x1="10" y1="12" x2="88" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B6CFF" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id={right} x1="56" y1="12" x2="134" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#FF5A6E" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="58" y="0" width="28" height="36" />
        </clipPath>
      </defs>
      <circle cx={LX} cy={CY} r={R} stroke={`url(#${left})`} strokeWidth={BAND} />
      <circle cx={RX} cy={CY} r={R} stroke={`url(#${right})`} strokeWidth={BAND} />
      {/* Top crossing: the left ring comes back over the right one. */}
      <circle cx={LX} cy={CY} r={R} stroke={`url(#${left})`} strokeWidth={BAND} clipPath={`url(#${clip})`} />
    </svg>
  );
}

/**
 * Mark + lowercase wordmark. The wordmark is live text in the UI sans, so it
 * is always crisp and always "fydell", never "Fydell".
 */
export function Lockup({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.42) }}
    >
      <Mark size={Math.round(size * 0.96)} />
      <span
        style={{
          fontSize: size,
          lineHeight: 1,
          fontWeight: 510,
          letterSpacing: "-0.035em",
          color: "var(--text-primary)",
          transform: "translateY(-0.04em)",
        }}
      >
        fydell
      </span>
    </span>
  );
}
