"use client";

type AuroraVariant = "hero" | "section" | "report";

/**
 * Restrained Fydell light trails — SVG strokes only (no blur filters).
 * Respects prefers-reduced-motion via CSS.
 */
export default function FydellAurora({
  variant = "hero",
  className = "",
}: {
  variant?: AuroraVariant;
  className?: string;
}) {
  const opacity =
    variant === "hero" ? 0.55 : variant === "report" ? 0.4 : 0.35;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
      style={{ opacity }}
    >
      <svg
        className="fydell-aurora absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="fydell-aurora-a" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#21C7D9" stopOpacity="0" />
            <stop offset="35%" stopColor="#315CFF" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#7B5CFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E64C87" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fydell-aurora-b" x1="10%" y1="80%" x2="90%" y2="20%">
            <stop offset="0%" stopColor="#7B5CFF" stopOpacity="0" />
            <stop offset="45%" stopColor="#315CFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#21C7D9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="fydell-aurora-path fydell-aurora-path-a"
          d="M-40 720 C 220 640, 380 520, 560 480 S 920 520, 1180 360 S 1420 220, 1520 180"
          stroke="url(#fydell-aurora-a)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <path
          className="fydell-aurora-path fydell-aurora-path-b"
          d="M-20 780 C 260 700, 420 600, 640 560 S 980 580, 1220 420 S 1460 280, 1560 240"
          stroke="url(#fydell-aurora-b)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {variant === "hero" && (
          <path
            className="fydell-aurora-path fydell-aurora-path-c"
            d="M 80 820 C 340 760, 520 680, 740 640 S 1080 620, 1360 480"
            stroke="url(#fydell-aurora-a)"
            strokeWidth="0.75"
            strokeLinecap="round"
            opacity="0.55"
          />
        )}
      </svg>
    </div>
  );
}

export function FydellGrid({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage:
          "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.55) 0%, transparent 72%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.55) 0%, transparent 72%)",
      }}
    />
  );
}
