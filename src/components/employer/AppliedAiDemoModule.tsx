import Link from "next/link";
import { Panel, PanelSection } from "@/components/ui/Panel";

export function AppliedAiDemoModule({
  href = "/sandbox/roles",
  className,
}: {
  href?: "/sandbox/roles" | "/sandbox/work";
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelSection
        title="Applied AI flagship demo"
        description="Explore an isolated fictional proof workflow from role requirements and existing support through a targeted verification episode, audited evidence, and a portable receipt. Applied AI Engineer is not a published role or employer evaluation in this workspace."
        action={
          <Link
            href={href}
            className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            Explore proof workflow
          </Link>
        }
      />
    </Panel>
  );
}
