"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";
import { Button } from "@/components/ui/Button";
import { ContactLink } from "@/components/ui/ContactLink";
import type { AdminClientFailure } from "@/lib/supabase";

/**
 * Shown when the workspace genuinely cannot be read.
 *
 * An empty dashboard is a lie when the truth is that the server could not
 * reach the database, so this replaces the console rather than rendering a
 * console with nothing in it. It says which kind of failure happened, whether
 * anything was lost, and what can be done now.
 *
 * The operator detail stays in the server log. What appears here is the
 * category, which is safe to show and is the part a person can act on.
 */
const EXPLANATION: Record<AdminClientFailure, string> = {
  missing_credentials:
    "This deployment is missing the database credentials it needs to read your workspace. That is a configuration problem on our side, not something wrong with your account.",
  project_refused:
    "This deployment is holding a set of database credentials it is not allowed to use, so it stopped rather than reading from the wrong place. That is a configuration problem on our side, not something wrong with your account.",
};

export default function WorkspaceUnavailable({
  reason,
  reference,
}: {
  reason: AdminClientFailure;
  reference: string;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-canvas)] px-5 py-10">
      <div className="w-full max-w-[62ch]">
        <FydellMark width={20} />

        <h1 className="mt-6 text-app-page font-medium text-[var(--text-primary)]">
          We could not load this workspace
        </h1>
        <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          {EXPLANATION[reason]}
        </p>
        <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          Nothing was written and nothing was deleted. Candidate work and your
          workspace data are unaffected, and they will be here when this is
          fixed.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            loading={retrying}
            onClick={() => {
              setRetrying(true);
              router.refresh();
              // The refresh either replaces this tree or it does not. Either
              // way the button should stop claiming to be working.
              window.setTimeout(() => setRetrying(false), 1500);
            }}
          >
            Try again
          </Button>
          <Link
            href="/login"
            className="text-app-body text-[var(--text-secondary)] underline-offset-2 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
          >
            Sign in again
          </Link>
        </div>

        <p className="mt-8 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
          If this does not clear, send this reference to <ContactLink /> and we
          can match it to the server log.
        </p>
        <p className="mt-1 font-mono text-app-meta tabular-nums text-[var(--text-secondary)]">
          {reference}
        </p>
      </div>
    </div>
  );
}
