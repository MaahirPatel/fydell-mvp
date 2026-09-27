import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { AppliedAiDemoModule } from "@/components/employer/AppliedAiDemoModule";

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
          />
          <div className="border-t border-[var(--border-subtle)] px-5 py-4">
            <p className="text-app-meta text-[var(--text-tertiary)]">Learning loop</p>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              Fydell evidence → interview finding → hiring outcome
            </p>
          </div>
        </Panel>
        <AppliedAiDemoModule className="mt-6" href="/sandbox/work" />
      </div>
    </div>
  );
}
