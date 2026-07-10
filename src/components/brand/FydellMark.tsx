/**
 * Official Fydell interlocking-chain mark (transparent PNG).
 * Aspect ratio matches the cropped brand asset (~1300×901).
 */
export default function FydellMark({
  width = 38,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * (901 / 1300));

  return (
    <img
      src="/brand/fydell-mark.png"
      alt=""
      width={width}
      height={height}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
      style={{ width, height, objectFit: "contain" }}
      aria-hidden="true"
      draggable={false}
    />
  );
}
