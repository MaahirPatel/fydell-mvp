export default function FydellMark({
  width = 38,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * 0.68);

  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <img
        src="/brand/fydell-chain-mark.png"
        alt=""
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: width * 1.35,
          height: width * 1.2,
          left: -width * 0.17,
          top: -width * 0.26,
          objectFit: "contain"
        }}
      />
    </span>
  );
}
