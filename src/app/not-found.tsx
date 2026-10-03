import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = { title: "Page not found" };

/**
 * W26: Useful 404. No stack traces, no repo contents.
 */
export default function NotFound() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-[640px] px-5 pb-20 pt-[120px] text-center sm:px-8">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-[600] tracking-[-0.025em]">
          This page doesn&apos;t exist.
        </h1>
        <p className="mt-3 text-[var(--step-0)] leading-[1.6] text-[var(--text-secondary)]">
          The link may be old, or the page may have moved. If you followed a shared
          profile link, it may have expired or been revoked by its owner.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
          >
            Back to home
          </Link>
          <Link
            href="/example-profile"
            className="inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-app-body font-medium hover:bg-[var(--surface-hover)]"
          >
            See an example profile
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
