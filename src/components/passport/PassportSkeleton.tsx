import "./passport.css";

export default function PassportSkeleton() {
  return (
    <div role="status" aria-label="Loading passport" className="pp">
      <div className="pp-head">
        <div className="flex items-center justify-between gap-3">
          <div className="passport-skeleton-bar h-3 w-44" />
          <div className="passport-skeleton-bar h-5 w-24" />
        </div>
        <div className="passport-skeleton-bar mt-5 h-8 w-72 max-w-full" />
        <div className="passport-skeleton-bar mt-3 h-3.5 w-80 max-w-full" />
        <div className="mt-4 border-t border-[var(--border-subtle)] py-3">
          <div className="passport-skeleton-bar h-3.5 w-64 max-w-full" />
        </div>
      </div>
      <div className="grid gap-px bg-[var(--border-subtle)] md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse bg-[var(--surface-raised)] motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
