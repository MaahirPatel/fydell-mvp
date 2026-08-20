import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";

export const metadata = { title: "Work Receipts" };

export default function EmployerWorkReceiptsPage() {
  return (
    <div>
      <PageHeader
        title="Work Receipts"
        description="Candidate-controlled records of demonstrated work, its verification, and its limits."
      />
      <div className="mt-7 max-w-[980px]">
        <Panel>
          <PanelSection
            title="No employer-visible Work Receipts"
            description="A receipt belongs to the candidate. It appears here only when the candidate has completed verified work and has authorized this workspace to view it."
          >
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sandbox"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
              >
                View Demo Work Receipt
              </Link>
              <Link
                href="/trust"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)]"
              >
                Sharing boundaries
              </Link>
            </div>
          </PanelSection>
          <div className="grid divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              ["Candidate controlled", "Candidates decide where portable receipts are shared."],
              ["Evidence backed", "Receipts describe demonstrated work, not self-reported skill."],
              ["Explicit limits", "What was not observed stays visible beside what was."],
            ].map(([title, body]) => (
              <div key={title} className="px-5 py-4">
                <p className="text-app-body font-medium text-[var(--text-primary)]">{title}</p>
                <p className="mt-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
