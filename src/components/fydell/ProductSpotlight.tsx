import { cn } from "@/lib/cn";

/**
 * Neutral light behind a product scene, so the window reads as lit rather than
 * pasted on. There is no brand-tinted variant: a blue wash behind a screenshot
 * is decoration, and on this site colour means something.
 */
export function ProductSpotlight({
  children,
  className,
  intensity = "default",
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: "default" | "soft";
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn(
          "product-spotlight",
          intensity === "soft" && "product-spotlight-soft",
        )}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
