import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Every employer page is `force-dynamic`, so navigation always waits on a
 * round trip. Without this the whole canvas goes blank for the duration.
 *
 * The shape mirrors the real layout, page title then panel, so the content
 * lands in place rather than pushing the page around when it arrives.
 */
export default function EmployerLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-[fydell-fade-in_120ms_both]">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-3 h-4 w-[38ch]" />

      <div className="mt-8 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="px-5 py-5 lg:px-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--border-subtle)] sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--surface-raised)] px-5 py-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2.5 h-6 w-10" />
            </div>
          ))}
        </div>
        <div className="px-5 py-5 lg:px-6">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-4 h-2 w-full" />
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-3.5 w-28" />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
