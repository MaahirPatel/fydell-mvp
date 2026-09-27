import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportSkeleton from "@/components/passport/PassportSkeleton";

export default function Loading() {
  return (
    <CandidateShell width="wide" current="passport">
      <div className="h-10 w-80 max-w-full animate-pulse rounded bg-[var(--surface-hover)] motion-reduce:animate-none" />
      <div className="mt-8">
        <PassportSkeleton />
      </div>
    </CandidateShell>
  );
}
