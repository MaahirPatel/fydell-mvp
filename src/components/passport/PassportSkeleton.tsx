export default function PassportSkeleton() {
  return (
    <div role="status" aria-label="Loading passport" className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-3)]">
      <div className="passport-cover px-6 pb-6 pt-5 sm:px-8">
        <div className="h-3 w-40 rounded bg-white/15" />
        <div className="mt-5 h-9 w-72 max-w-full rounded bg-white/15" />
        <div className="mt-3 h-3.5 w-56 rounded bg-white/10" />
      </div>
      <div className="grid gap-3 p-6 sm:p-8 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[12px] bg-[var(--surface-hover)] motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
