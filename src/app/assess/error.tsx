"use client";

import { useEffect } from "react";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import RouteError from "@/components/ui/RouteError";

export default function AssessError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[assess]", error);
  }, [error]);

  return (
    <CandidateShell current="assessments">
      <RouteError
        title="This task did not load"
        body="Nothing you already submitted was affected, and your project stays in your own editor. If your timer is running, it keeps running, so try again now. If it keeps failing, email us the reference below; loading problems are never held against you."
        digest={error.digest}
        reset={reset}
        backHref="/app/candidate"
        backLabel="Back to evaluations"
      />
    </CandidateShell>
  );
}
