import PassportSkeleton from "@/components/passport/PassportSkeleton";

export default function Loading() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <PassportSkeleton />
      <div className="h-64 animate-pulse rounded-[14px] bg-[var(--surface-hover)] motion-reduce:animate-none" />
    </div>
  );
}
