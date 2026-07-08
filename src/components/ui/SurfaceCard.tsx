import { cn } from "@/lib/cn";

export function SurfaceCard({
  children,
  className,
  glow = false,
  hover = true
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-surface-mid/80 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        glow && "shadow-[0_0_100px_rgba(124,92,255,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]",
        hover && "transition-all duration-500 hover:border-white/[0.12] hover:bg-surface-2/90",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-accent">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-instrument text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.03em] text-white",
        className
      )}
    >
      {children}
    </h2>
  );
}
