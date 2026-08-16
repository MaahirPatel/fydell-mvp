"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * The honest failure surface for the console.
 *
 * It does not guess at a cause or apologise. It says what did not happen, what
 * the operator can do now, and carries the digest so a report can be matched to
 * a server log without asking the customer to reproduce it.
 */
export default function EmployerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[employer]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[62ch] py-10">
      <h1 className="text-app-page font-medium text-[var(--text-primary)]">
        This page did not load
      </h1>
      <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
        The workspace data could not be read. Nothing was changed, and no
        candidate work was affected. Try again, and if it keeps failing, send
        the reference below to support.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/app/employer"
          className="text-app-body text-[var(--text-secondary)] underline-offset-2 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
        >
          Back to home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 text-app-meta text-[var(--text-tertiary)]">
          Reference{" "}
          <code className="font-mono tabular-nums text-[var(--text-secondary)]">
            {error.digest}
          </code>
        </p>
      ) : null}
    </div>
  );
}
