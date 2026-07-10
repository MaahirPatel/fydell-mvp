import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

export default function FydellBrand({
  className = "",
  markSize = 32,
  sheen = false
}: {
  className?: string;
  markSize?: number;
  sheen?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Fydell home"
    >
      <FydellMark
        width={markSize}
        className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
      />
      <span
        className={`font-bold leading-none text-white ${sheen ? "wordmark-sheen" : ""}`}
        style={{
          fontSize: Math.max(18, Math.round(markSize * 0.72)),
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "#FFFFFF",
        }}
      >
        fydell
      </span>
    </Link>
  );
}
