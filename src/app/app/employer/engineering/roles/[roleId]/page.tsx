import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import CreateRoleForm from "@/components/eng/CreateRoleForm";
import { InvitationActions, InviteCandidateForm, RoleStatusActions } from "@/components/eng/RoleControls";
import { engAdmin } from "@/lib/eng/context";
import { listRoleCandidates, pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";
import { FOCUS_OPTIONS, getRoleForOrg } from "@/lib/eng/roles";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { OPERATIONAL_STATES } from "@/lib/eng/state";

export const metadata = { title: "Engineering role" };
export const dynamic = "force-dynamic";

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

export default async function EngineeringRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const member = await pageMember();
  if (!member || !isUuid(roleId)) notFound();
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, member.organizationId);
  if (!role) notFound();
  const [{ definition, row }, candidates] = await Promise.all([scenarioForVersionId(db, role.scenario_version_id), listRoleCandidates(db, role)]);
  const canManage = roleCan(member.role, "manage_roles");
  const canInvite = roleCan(member.role, "invite_candidates") && role.status === "published";
  const canManageInvites = roleCan(member.role, "manage_invitations");
  const focusLabels = FOCUS_OPTIONS.filter((f) => role.evaluation_focus.includes(f.key)).map((f) => f.label);

  return (
    <div className="max-w-[1160px]">
      <Link href="/app/employer/engineering" className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Engineering tasks
      </Link>
      <PageHeader
        className="mt-3"
        title={role.title}
        description={`${definition.title}, task version ${row.version}. Every candidate for this role gets exactly this version.`}
        meta={
          <>
            <StatusTag tone={role.status === "published" ? "good" : "neutral"}>{role.status[0].toUpperCase() + role.status.slice(1)}</StatusTag>
            {role.stack.length ? <span className="text-app-meta text-[var(--text-secondary)]">{role.stack.join(" · ")}</span> : null}
          </>
        }
        action={canManage ? <RoleStatusActions roleId={role.id} status={role.status} /> : undefined}
      />

      <div className="mt-7 grid gap-6">
        <Panel>
          <PanelSection
            title="Candidates"
            description="States come from the attempt, the evaluation queue and the report. An evaluation delay is a platform issue and never counts against a candidate."
          />
          {canInvite ? (
            <div className="px-5 pb-5 lg:px-6">
              <InviteCandidateForm roleId={role.id} />
            </div>
          ) : role.status === "draft" ? (
            <div className="px-5 pb-5 lg:px-6">
              <EmptyState title="Publish to invite" description="Preview the task below. Once you publish, the role and task version are frozen and you can invite candidates." />
            </div>
          ) : null}
          {candidates.length > 0 ? (
            <Table>
              <THead>
                <TH>Candidate</TH>
                <TH>State</TH>
                <TH>Deadline</TH>
                <TH>Decision</TH>
                <TH align="right">
                  <span className="sr-only">Actions</span>
                </TH>
              </THead>
              <TBody>
                {candidates.map((c) => {
                  const state = OPERATIONAL_STATES[c.state];
                  const open = c.attempt && ["accepted", "preflight_passed", "in_progress"].includes(c.attempt.status);
                  return (
                    <TR key={c.invitation.id}>
                      <TDPrimary>
                        {c.attempt ? (
                          <Link href={`/app/employer/engineering/attempts/${c.attempt.id}`} className="hover:underline">
                            {c.invitation.candidate_name || c.invitation.candidate_email}
                          </Link>
                        ) : (
                          c.invitation.candidate_name || c.invitation.candidate_email
                        )}
                        {c.invitation.candidate_name ? <span className="block text-app-meta font-normal text-[var(--text-tertiary)]">{c.invitation.candidate_email}</span> : null}
                      </TDPrimary>
                      <TD>
                        <span title={state.meaning}>
                          <StatusTag tone={state.tone}>{state.label}</StatusTag>
                        </span>
                        {c.late ? <span className="ml-2 text-app-meta text-[var(--text-tertiary)]">Submitted late</span> : null}
                        {!c.attempt && c.invitation.email_delivery !== "sent" ? (
                          <span className="block text-app-meta text-[var(--text-tertiary)]">Not emailed; share the link</span>
                        ) : null}
                      </TD>
                      <TD>{c.dueAt ? when(c.dueAt) : c.attempt ? "Not started" : `Invite expires ${when(c.invitation.expires_at)}`}</TD>
                      <TD className="capitalize">{c.decision ?? ""}</TD>
                      <TD align="right">
                        {canManageInvites ? (
                          <InvitationActions
                            invitationId={c.invitation.id}
                            attemptId={c.attempt?.id ?? null}
                            canResend={c.invitation.status === "invited" && !c.attempt}
                            canWithdraw={c.invitation.status !== "withdrawn" && c.attempt?.status !== "submitted"}
                            canExtend={Boolean(open)}
                          />
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : null}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelSection title="What candidates see" description="The brief, the rules and the setup requirements, exactly as shown before they start.">
              <PanelLabel>Brief</PanelLabel>
              <ul className="mt-2 grid gap-2 text-app-body leading-[1.6] text-[var(--text-secondary)]">
                {definition.candidateBrief.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <PanelLabel className="mt-5">AI and tools</PanelLabel>
              <ul className="mt-2 grid gap-2 text-app-body leading-[1.6] text-[var(--text-secondary)]">
                {definition.aiPolicy.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <PanelLabel className="mt-5">Supported setups</PanelLabel>
              <ul className="mt-2 grid gap-2 text-app-body text-[var(--text-secondary)]">
                {definition.supportedEnvironments.map((env) => (
                  <li key={env.label}>
                    <span className="text-[var(--text-primary)]">{env.label}</span>: {env.status}. {env.note}
                  </li>
                ))}
              </ul>
            </PanelSection>
          </Panel>
          <Panel>
            <PanelSection title="How it is reviewed" description={`Focus for this role: ${focusLabels.join(", ")}.`}>
              <ul className="grid gap-4">
                {definition.rubric.map((dimension) => (
                  <li key={dimension.key}>
                    <p className="text-app-body font-medium text-[var(--text-primary)]">{dimension.label}</p>
                    <p className="mt-1 text-app-body leading-[1.6] text-[var(--text-secondary)]">{dimension.question}</p>
                    <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Limits: {dimension.limitations}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
                Automated checks are observations about the submitted code. Your team writes the qualitative findings, and each one must cite the file lines, test, message or handoff it is based on before the report can be released. The report is evidence for your decision, not a decision.
              </p>
            </PanelSection>
          </Panel>
        </div>

        {role.status === "draft" && canManage ? (
          <Panel>
            <PanelSection title="Edit draft">
              <CreateRoleForm
                focusOptions={FOCUS_OPTIONS}
                roleId={role.id}
                initial={{
                  title: role.title,
                  stack: role.stack,
                  responsibilities: role.responsibilities,
                  companyContext: role.company_context,
                  evaluationFocus: role.evaluation_focus as (typeof FOCUS_OPTIONS)[number]["key"][],
                }}
              />
            </PanelSection>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
