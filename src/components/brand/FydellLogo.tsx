/**
 * The official Fydell lockup: interlocking mark and wordmark, extracted from
 * public/brand/fydell-logo-full.png by scripts/generate-brand-logo.mjs.
 * Use this wherever the brand name appears as a logo; use FydellMark only
 * where space allows the mark alone.
 */
const RATIO = 952 / 248;

export default function FydellLogo({
  height = 26,
  tone = "light",
  className = "",
}: {
  height?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <img
      src={tone === "dark" ? "/brand/fydell-lockup-on-dark.png" : "/brand/fydell-lockup.png"}
      alt="Fydell"
      width={Math.round(height * RATIO)}
      height={height}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{ height, width: Math.round(height * RATIO) }}
      draggable={false}
    />
  );
}
