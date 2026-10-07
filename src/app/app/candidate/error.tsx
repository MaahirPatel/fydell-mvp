"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { candidateSectionFor } from "@/components/candidate/section";
import RouteError from "@/components/ui/RouteError";

export default function CandidateError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    console.error("[candidate]", error);
  }, [error]);

  return (
    <CandidateShell current={candidateSectionFor(pathname)}>
      <RouteError
        title="This page did not load"
        body="Your Passport, applications and evaluations were not changed. Try again, and if it keeps failing, email us the reference below."
        digest={error.digest}
        reset={reset}
        backHref="/app/candidate"
        backLabel="Back to evaluations"
      />
    </CandidateShell>
  );
}
