import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { CandidateShell } from "./CandidateShell";

type Current = "profile" | "work" | "applications" | "assessments" | "settings";

/**
 * Route-level loading state for candidate pages. The header stays put and the
 * body keeps the rough shape of the page that is arriving, so nothing jumps
 * when the data lands.
 */
export function CandidatePageSkeleton({
  current,
  width = "default",
  layout = "list",
  label,
}: {
  current?: Current;
  width?: "default" | "narrow" | "wide";
  layout?: "list" | "profile" | "report" | "sections";
  /** Read to screen readers, e.g. "Loading your applications". */
  label: string;
}) {
  return (
    <CandidateShell current={current} width={width}>
      <div role="status" aria-live="polite" className="animate-[fydell-fade-in_120ms_both]">
        <span className="sr-only">{label}</span>
        {layout === "profile" ? <ProfileShape /> : <Head />}
        {layout === "list" ? <ListShape /> : null}
        {layout === "report" ? <ReportShape /> : null}
        {layout === "sections" ? <SectionsShape /> : null}
      </div>
    </CandidateShell>
  );
}

function Head() {
  return (
    <div>
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-[52ch] max-w-full" />
    </div>
  );
}

function ListShape() {
  return (
    <div className="mt-8 overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] px-[18px] py-4 first:border-t-0">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-60 max-w-full" />
            <Skeleton className="mt-2 h-3 w-40 max-w-full" />
          </div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function ProfileShape() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <SkeletonText lines={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

function ReportShape() {
  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-6 w-10" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-7 border-b border-[var(--border-default)] pb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-6 grid overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4 border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="p-5 sm:p-7">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

function SectionsShape() {
  return (
    <div className="mt-10 space-y-10">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border-t border-[var(--border-default)] pt-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3.5 w-[44ch] max-w-full" />
          <Skeleton className="mt-4 h-9 w-40" />
        </div>
      ))}
    </div>
  );
}

export default CandidatePageSkeleton;
