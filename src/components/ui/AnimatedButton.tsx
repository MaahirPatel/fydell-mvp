import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

export default function AnimatedButton({ href, children, variant = "primary", className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300",
        variant === "primary" &&
          "h-9 bg-violet-accent px-4 text-white shadow-[0_0_32px_rgba(124,92,255,0.4)] hover:scale-[1.02] hover:brightness-110",
        variant === "ghost" &&
          "h-9 border border-white/[0.12] bg-white/[0.03] px-3.5 font-medium text-white/80 hover:border-white/20 hover:bg-white/[0.06]",
        className
      )}
    >
      {children}
    </Link>
  );
}
