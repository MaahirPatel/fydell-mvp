/**
 * Subtle hatch texture used behind low/medium-confidence findings so
 * uncertainty reads visually, not just through a text label. Intentionally
 * faint — this is a supporting cue, never a substitute for the stated
 * confidence and limitation text.
 */
export default function UncertaintyTexture({ confidence }: { confidence: string }) {
  if (confidence === "high") return null;
  const opacity = confidence === "low" ? 0.05 : 0.03;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={`uncertainty-hatch-${confidence}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#F4F5F7" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#uncertainty-hatch-${confidence})`} opacity={opacity} />
    </svg>
  );
}
