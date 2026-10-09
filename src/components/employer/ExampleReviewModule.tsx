import Link from "next/link";
import { Panel, PanelSection } from "@/components/ui/Panel";

/** A finished example review, so a new workspace can see the end result before inviting anyone. */
export function ExampleReviewModule({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <PanelSection
        title="See an example review"
        description="A fictional applicant's submitted work on a backend task: the change, the tests that ran, and where a reviewer records a decision. It opens in your demo workspace, not among your candidates."
        action={
          <Link
            href="/app/employer/demo/applicants/amara-osei"
            className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Open the example
          </Link>
        }
      />
    </Panel>
  );
}
