import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Candidate workspace loading state. Mirrors the real layout so content
 * lands in place rather than pushing the page around when it arrives.
 */
export default function CandidateLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-[fydell-fade-in_120ms_both]">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-[34ch]" />

      <div className="mt-8 overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="px-5 py-5 lg:px-6">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-3/4" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading workspace</span>
    </div>
  );
}
