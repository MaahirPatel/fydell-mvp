/**
 * Official Fydell interlocking-chain mark.
 * Uses the brand PNG with black-background knockout so rings render fully
 * (no crop box) on dark surfaces.
 */
export default function FydellMark({
  width = 38,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  // Official asset aspect ~ 1.55:1 (two interlocking rings)
  const height = Math.round(width * 0.64);

  return (
    <img
      src="/brand/fydell-chain-mark.png"
      alt=""
      width={width}
      height={height}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
      style={{
        width,
        height,
        objectFit: "contain",
        // Knock out the baked black plate so only the rings show on dark UI
        mixBlendMode: "screen",
      }}
      aria-hidden="true"
      draggable={false}
    />
  );
}
