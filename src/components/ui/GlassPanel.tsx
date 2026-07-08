import { cn } from "@/lib/cn";

export function GlassPanel({
  children,
  className,
  glow = false
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-[#0a0e1a]/80 backdrop-blur-md",
        glow && "shadow-[0_0_40px_rgba(124,92,255,0.12)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export default GlassPanel;
