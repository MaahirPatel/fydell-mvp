import type { ReactNode } from "react";
import type { ScenarioDefinition } from "@/lib/eng/scenarios/types";
import type { InvitationRow } from "@/lib/eng/types";

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
    <>
      <p className="text-app-meta text-[var(--text-tertiary)]">{snapshot.organizationName} invited you</p>
      <h1 className="mt-2 text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{snapshot.title}</h1>
      {snapshot.companyContext ? <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">{snapshot.companyContext}</p> : null}

      <div className="mt-6 grid gap-3 rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        <p className="text-[var(--text-primary)]">{definition.title}</p>
        <p>{definition.summary}</p>
        <ul className="grid gap-1.5">
          <li>About {definition.targetMinutes} minutes of work, with a {invitation.allowed_minutes}-minute window once you press Start.</li>
          <li>You work locally in your own editor. Fydell does not watch your screen or files.</li>
          <li>Needs: {definition.prerequisites.join(" ")}</li>
          <li>Nothing starts until you finish a setup check and press Start. This invitation expires {new Date(invitation.expires_at).toUTCString()}.</li>
        </ul>
      </div>

      <div className="mt-6">{children}</div>
      <p className="mt-6 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
        Use a desktop or laptop. People on the hiring team review your work; automated checks never make the decision.
      </p>
    </>
  );
}
