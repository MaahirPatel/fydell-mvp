"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CONTACT_MAILTO } from "@/lib/contact";

/**
 * Fallback for any page without its own error boundary. Says what did not
 * happen, that saved work is unaffected, and what to do next, with the digest
 * so support can match the report to a server log.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-[62ch] px-6 py-20">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">This page did not load</h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-[var(--text-secondary)]">
        Fydell could not finish loading this page. Anything you already saved is safe; this error did not change it. Try again, and if it keeps
        happening, send the reference below to support.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className="text-[15px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline">
          Go to the homepage
        </Link>
        <a href={CONTACT_MAILTO} className="text-[15px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline">
          Contact support
        </a>
      </div>
      {error.digest ? (
        <p className="mt-8 text-[13px] text-[var(--text-tertiary)]">
          Reference <code className="font-mono tabular-nums text-[var(--text-secondary)]">{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
