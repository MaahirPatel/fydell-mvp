import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

export default function FydellBrand({
  className = "",
  markSize = 38,
  sheen = false
}: {
  className?: string;
  markSize?: number;
  sheen?: boolean;
}) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Fydell home">
      <FydellMark
        width={markSize}
        className="shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
      />
      <span
        className={`font-bold leading-none ${sheen ? "wordmark-sheen" : "text-white"}`}
        style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.045em" }}
      >
        fydell
      </span>
    </Link>
  );
}
