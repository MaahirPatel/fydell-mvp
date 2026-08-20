import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";

export const metadata = { title: "Outcomes" };

export default function EmployerOutcomesPage() {
  return (
    <div>
      <PageHeader
        title="Outcomes"
        description="Interview and hiring findings that show whether the evidence remained useful."
      />
      <div className="mt-7 max-w-[980px]">
        <Panel>
          <PanelSection
            title="No outcomes yet"
            description="Outcome evidence appears after your team records an interview or hiring decision. Fydell will not invent a chart before that data exists."
          >
            <Link
              href="/sandbox"
              className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)]"
            >
              Experience a demo outcome
            </Link>
          </PanelSection>
          <div className="border-t border-[var(--border-subtle)] px-5 py-4">
            <p className="text-app-meta text-[var(--text-tertiary)]">Learning loop</p>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              Fydell evidence → interview finding → hiring outcome
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
