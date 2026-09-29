import type { ReactNode } from "react";
import { Panel, PanelSection } from "@/components/ui/Panel";
import type { ScenarioDefinition } from "@/lib/eng/scenarios/types";
import type { InvitationRow } from "@/lib/eng/types";
import { Facts, PolicyDisclosures, StageProgress } from "./CandidateParts";
import { LocalTime } from "./LocalTime";

export default function EngInvitationBrief({
  invitation,
  definition,
  children,
}: {
  invitation: InvitationRow;
  definition: ScenarioDefinition;
  children: ReactNode;
}) {
  const snapshot = invitation.role_snapshot;
  return (
    <div className="grid gap-6">
      <StageProgress current="Invitation" />
      <header>
        <p className="text-app-meta text-[var(--text-tertiary)]">{snapshot.organizationName} invited you</p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{snapshot.title}</h1>
        {snapshot.companyContext ? <p className="mt-2 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{snapshot.companyContext}</p> : null}
      </header>

      <Panel>
        <PanelSection title={definition.title} description={definition.summary}>
          <Facts
            items={[
              { label: "Expected effort", value: `About ${definition.targetMinutes} minutes` },
              { label: "Assessment window", value: `${invitation.allowed_minutes} minutes, starting when you press Start` },
              { label: "Runtime", value: `Python ${definition.supportedRuntimes.join(", ").replace(/, ([^,]*)$/, " or $1")}` },
              { label: "Editor", value: "VS Code, Cursor, PyCharm or another desktop editor" },
              { label: "Invitation expires", value: <LocalTime iso={invitation.expires_at} withWeekday /> },
              { label: "Device", value: "A desktop or laptop for the task itself" },
            ]}
          />
        </PanelSection>
        <PanelSection>
          <div className="grid gap-3">
            {children}
            <p className="text-app-meta text-[var(--text-secondary)]">Accepting this invitation does not start your assessment. Setup comes next, and the timer starts only when you press Start.</p>
          </div>
        </PanelSection>
        <PanelSection>
          <PolicyDisclosures aiPolicy={definition.aiPolicy} accommodations={definition.accommodations} />
        </PanelSection>
      </Panel>
    </div>
  );
}
