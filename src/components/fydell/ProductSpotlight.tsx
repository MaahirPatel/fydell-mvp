import { cn } from "@/lib/cn";

/**
 * Graphite light behind a product scene. Brand tint is opt-in and faint.
 */
export function ProductSpotlight({
  children,
  className,
  intensity = "default",
  brand = false,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: "default" | "soft";
  brand?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn(
          "product-spotlight",
          intensity === "soft" && "product-spotlight-soft",
          brand && "product-spotlight-brand",
        )}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
