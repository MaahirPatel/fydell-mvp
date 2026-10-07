"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Body of a route `error.tsx`. Says what did not happen and what to do next;
 * never shows the error message or stack. The digest is the only detail, so
 * support can match a report to the server log.
 */
export function RouteError({
  title,
  body,
  digest,
  reset,
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  digest?: string;
  reset: () => void;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div role="alert" className="max-w-[62ch] py-6">
      <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-[var(--text-secondary)]">{body}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href={backHref}
          className="rounded-[6px] text-[15px] font-medium text-[var(--text-secondary)] underline-offset-4 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
        >
          {backLabel}
        </Link>
      </div>
      {digest ? (
        <p className="mt-8 text-[13px] text-[var(--text-tertiary)]">
          Reference <code className="font-mono tabular-nums text-[var(--text-secondary)]">{digest}</code>
        </p>
      ) : null}
    </div>
  );
}

export default RouteError;
