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
        className="leading-none text-white"
        style={{
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          fontSize: textSize,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        fydell
      </span>
    </Link>
  );
}
