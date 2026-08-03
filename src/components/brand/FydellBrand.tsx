import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

export default function FydellBrand({
  className = "",
  markSize = 34,
  wordmarkSize,
}: {
  className?: string;
  markSize?: number;
  wordmarkSize?: number;
}) {
  const textSize = wordmarkSize ?? Math.max(22, Math.round(markSize * 0.72));

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Fydell home"
    >
      <FydellMark
        width={markSize}
        className="shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
      />
      <span
        className="leading-none"
        style={{
          fontFamily:
            "var(--font-geist-sans), var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          fontSize: textSize,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          backgroundImage: "linear-gradient(115deg, #5B8CFF 0%, #7C8CFF 38%, #F26B82 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
      >
        fydell
      </span>
    </Link>
  );
}
