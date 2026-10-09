import type { ReactNode } from "react";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { Facts, JourneyRail } from "@/components/eng/CandidateParts";
import { LocalTime } from "@/components/eng/LocalTime";
import type { CandidateTask } from "@/lib/eng/authored/types";
import { PoliciesSection } from "./TaskBrief";

/** The invitation page for an employer-authored task. Takes only the candidate payload. */
export function AuthoredInvitationBrief({
  task,
  roleTitle,
  organizationName,
  companyContext,
  allowedMinutes,
  expiresAt,
  preview,
  children,
}: {
  task: CandidateTask;
  roleTitle: string;
  organizationName: string;
  companyContext: string;
  allowedMinutes: number;
  expiresAt: string;
  preview: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <CandidatePageHead
        title={roleTitle}
        lead={`${organizationName} invited you to an engineering task.${companyContext ? ` ${companyContext}` : ""}`}
        meta={[
          { label: "Effort", value: `About ${task.environment.taskMinutes} min` },
          { label: "Window", value: `${allowedMinutes} min, from Start` },
          { label: "Expires", value: <LocalTime iso={expiresAt} /> },
        ]}
        rail={<JourneyRail at="invitation" submitValue="Your files and handoff" />}
      />
      <Panel>
        <PanelSection title={task.title} description={task.summary}>
          <Facts
            items={[
              { label: "Expected effort", value: `About ${task.environment.taskMinutes} minutes` },
              { label: "Time window", value: `${allowedMinutes} minutes, starting when you press Start` },
              { label: "Runtime", value: task.environment.label },
              { label: "Where you work", value: "In the browser editor, or your own editor with the starter download" },
              { label: "Invitation expires", value: <LocalTime iso={expiresAt} withWeekday /> },
              { label: "Device", value: "A desktop or laptop" },
            ]}
          />
          {preview ? <p className="mt-3 text-app-meta text-[var(--text-secondary)]">Preview: this invitation is for the employer and is not part of hiring.</p> : null}
        </PanelSection>
        <PanelSection>
          <div className="grid gap-3">
            {children}
            <p className="text-app-meta text-[var(--text-secondary)]">Accepting does not start the task. Setup comes next, and the timer starts only when you press Start.</p>
          </div>
        </PanelSection>
        <PoliciesSection task={task} />
      </Panel>
    </div>
  );
}
