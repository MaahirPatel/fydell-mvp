import { cn } from "@/lib/cn";

/**
 * Loading placeholders that preserve the structure of what is arriving, so the
 * layout does not jump when data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[6px] bg-[rgba(255,255,255,0.06)]",
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Table loading state that keeps the column rhythm of the real table. */
export function SkeletonTable({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-40" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}
