import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import CreateRoleForm from "@/components/eng/CreateRoleForm";
import { InvitationActions, InviteCandidateForm, PreviewWorkSample, RoleStatusActions } from "@/components/eng/RoleControls";
import { TaskBriefSections } from "@/components/work-samples/runtime/TaskBrief";
import { LocalTime } from "@/components/eng/LocalTime";
import { listAuthoredVersionOptions } from "@/lib/eng/authored/employer";
import { candidateTask } from "@/lib/eng/authored/runtime";
import { engAdmin } from "@/lib/eng/context";
import { listRoleCandidates, pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { candidateIdentity } from "@/lib/eng/candidate-label";
import { roleCan } from "@/lib/eng/permissions";
import { FOCUS_OPTIONS, getRoleForOrg } from "@/lib/eng/roles";
import { resolveScenarioVersion } from "@/lib/eng/scenario-versions";
import { OPERATIONAL_STATES } from "@/lib/eng/state";

export const metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

function when(iso: string | null): React.ReactNode {
  return iso ? <LocalTime iso={iso} /> : "";
}

export default async function EngineeringRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const member = await pageMember();
  if (!member || !isUuid(roleId)) notFound();
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, member.organizationId);
  if (!role) notFound();
  const [resolved, candidates, authoredOptions] = await Promise.all([
    resolveScenarioVersion(db, role.scenario_version_id),
    listRoleCandidates(db, role),
    listAuthoredVersionOptions(db, member.organizationId),
  ]);
  const row = resolved.row;
  const definition = resolved.origin === "fydell_reviewed" ? resolved.definition : null;
  const taskTitle = resolved.origin === "employer_authored" ? resolved.pkg.brief.title : resolved.definition.title;
  const workSamples = authoredOptions.filter((o) => o.id !== row.id).map((o) => ({ id: o.id, label: `${o.title}, version ${o.version}`, publishedAt: o.publishedAt }));
  const previewable = [
    ...(resolved.origin === "employer_authored" ? [{ id: row.id, label: `${taskTitle}, version ${row.version}`, publishedAt: row.published_at ?? undefined }] : []),
    ...workSamples,
  ];
  const canManage = roleCan(member.role, "manage_roles");
  const canInvite = roleCan(member.role, "invite_candidates") && role.status === "published";
  const canManageInvites = roleCan(member.role, "manage_invitations");
  const focusLabels = FOCUS_OPTIONS.filter((f) => role.evaluation_focus.includes(f.key)).map((f) => f.label);
  const builtInScope = workSamples.length
    ? ` These panels cover ${taskTitle}, Fydell’s built-in task. Candidates invited to one of your work samples see that work sample’s brief instead.`
    : "";

  return (
    <div className="max-w-[1160px]">
      <Link href="/app/employer/engineering" className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Assessments
      </Link>
      <PageHeader
        className="mt-3"
        title={role.title}
        description={
          workSamples.length
            ? "Choose the simulation each candidate gets when you invite them. Every candidate stays on the version they were invited to."
            : `${taskTitle}, version ${row.version}. Every candidate for this assessment gets exactly this version.`
        }
        meta={
          <>
            <StatusTag tone={role.status === "published" ? "good" : "neutral"}>{role.status[0].toUpperCase() + role.status.slice(1)}</StatusTag>
            {role.stack.length ? <span className="text-app-meta text-[var(--text-secondary)]">{role.stack.join(" · ")}</span> : null}
          </>
        }
        action={canManage ? <RoleStatusActions roleId={role.id} status={role.status} /> : undefined}
      />

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6">
        <Panel>
          <PanelSection
            title="Candidates"
            description="States come from the attempt, the evaluation queue and the report. An evaluation delay is a platform issue and never counts against a candidate."
          />
          {canInvite ? (
            <div className="grid gap-5 px-5 pb-5 lg:px-6">
              <InviteCandidateForm
                roleId={role.id}
                defaultLabel={`${taskTitle}, version ${row.version} (${resolved.origin === "fydell_reviewed" ? "Fydell’s built-in task" : "the assessment’s simulation"})`}
                workSamples={workSamples}
                initialVersionId={resolved.origin === "fydell_reviewed" ? (workSamples[0]?.id ?? "") : ""}
              />
              {previewable.length ? (
                <div className="border-t border-[var(--border-subtle)] pt-5">
                  <PreviewWorkSample roleId={role.id} workSamples={previewable} />
                </div>
              ) : null}
            </div>
          ) : role.status === "draft" ? (
            <div className="px-5 pb-5 lg:px-6">
              <EmptyState title="Publish to invite" description="Preview the task below. Once you publish, the assessment and task version are frozen and you can invite candidates." />
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
                  const who = candidateIdentity(c.invitation);
                  return (
                    <TR key={c.invitation.id}>
                      <TDPrimary>
                        {c.attempt ? (
                          <Link href={`/app/employer/engineering/attempts/${c.attempt.id}`} className="hover:underline">
                            {who.primary}
                          </Link>
                        ) : (
                          who.primary
                        )}
                        {c.invitation.is_preview ? (
                          <span className="ml-2 align-middle">
                            <StatusTag tone="active">Preview</StatusTag>
                          </span>
                        ) : null}
                        {who.secondary ? <span className="block text-app-meta font-normal text-[var(--text-tertiary)]">{who.secondary}</span> : null}
                      </TDPrimary>
                      <TD>
                        <span title={state.meaning}>
                          <StatusTag tone={state.tone}>{state.label}</StatusTag>
                        </span>
                        {c.late ? <span className="ml-2 text-app-meta text-[var(--text-tertiary)]">Submitted late</span> : null}
                        {!c.attempt && c.invitation.email_delivery !== "sent" ? (
                          <span className="block text-app-meta text-[var(--text-tertiary)]">
                            {c.invitation.email_delivery === "failed" ? "Email failed. Resend to try again." : "Not emailed. Resend to get a link to share."}
                          </span>
                        ) : null}
                      </TD>
                      <TD>{c.dueAt ? when(c.dueAt) : c.attempt ? "Not started" : <>Invite expires {when(c.invitation.expires_at)}</>}</TD>
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

        {resolved.origin === "employer_authored" ? (
          <Panel>
            <TaskBriefSections task={candidateTask(resolved.pkg)} />
          </Panel>
        ) : null}
        {definition ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <Panel>
            <PanelSection title="What candidates see" description={`The brief, the rules and the setup requirements, exactly as shown before they start.${builtInScope}`}>
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
            <PanelSection title="How it is reviewed" description={`Focus for this assessment: ${focusLabels.join(", ")}.${builtInScope}`}>
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
        ) : null}

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
