import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  className?: string;
};

export function GlowButton({ children, href, onClick, variant = "primary", className }: Props) {
  const base = cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-semibold transition-all duration-300",
    "hover:scale-[1.02] active:scale-[0.98]",
    variant === "primary" &&
      "bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-600 text-white shadow-[0_0_60px_rgba(124,92,255,0.4)]",
    variant === "ghost" &&
      "border border-white/15 bg-white/[0.04] text-white/90 hover:border-white/25 hover:bg-white/[0.07]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      {children}
    </button>
  );
}
