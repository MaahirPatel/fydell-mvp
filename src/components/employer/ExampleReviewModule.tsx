import Link from "next/link";
import { Panel, PanelSection } from "@/components/ui/Panel";

/** A finished example review, so a new workspace can see the end result before inviting anyone. */
export function ExampleReviewModule({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <PanelSection
        title="See an example review"
        description="One candidate's submitted work on a backend task: the change, the tests that ran, and where a reviewer records a decision. Example data, not a candidate in your workspace."
        action={
          <Link
            href="/sandbox/event-inbox/example/review"
            className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Open the example
          </Link>
        }
      />
    </Panel>
  );
}
