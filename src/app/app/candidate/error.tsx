"use client";

import { Button } from "@/components/ui/Button";
import { Panel, PanelSection } from "@/components/ui/Panel";

/**
 * Candidate workspace error boundary. Shows a calm recovery UI
 * instead of a blank page or raw error.
 */
export default function CandidateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel>
      <PanelSection
        title="Something went wrong"
        description="We couldn't load this page. Your work is saved."
      >
        <Button onClick={reset}>Try again</Button>
      </PanelSection>
    </Panel>
  );
}
