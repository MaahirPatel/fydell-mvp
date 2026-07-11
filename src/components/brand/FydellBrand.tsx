import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

export default function FydellBrand({
  className = "",
  markSize = 34,
  wordmarkSize,
  sheen = false,
}: {
  className?: string;
  markSize?: number;
  /** Explicit wordmark size in px. Defaults to a readable scale from the mark. */
  wordmarkSize?: number;
  sheen?: boolean;
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
        className={`leading-none ${sheen ? "wordmark-sheen" : ""}`}
        style={{
          fontFamily: "var(--font-geist-sans), var(--font-inter), ui-sans-serif, system-ui, sans-serif",
          fontSize: textSize,
          fontWeight: 560,
          letterSpacing: "-0.045em",
          color: "#F4F5F7",
          background: "none",
          WebkitTextFillColor: "#F4F5F7",
        }}
      >
        fydell
      </span>
    </Link>
  );
}
