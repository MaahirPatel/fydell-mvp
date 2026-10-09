import Link from "next/link";
import { EvidenceTimeline, Mono, type TimelineEntry } from "@/components/evidence/Evidence";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Status } from "@/components/ui/report";
import { DecisionForm, NoteForm, When } from "@/components/eng/EmployerAttemptPanels";
import { RequeueButton } from "@/components/eng/ReviewerControls";
import { LocalTime } from "@/components/eng/LocalTime";
import {
  AuthoredBriefPanel,
  AuthoredEvaluationPanel,
  AuthoredFollowUpsPanel,
  AuthoredSubmissionPanel,
} from "@/components/work-samples/runtime/AuthoredEmployerReview";
import { authoredBriefText, buildAuthoredDecisionBrief, buildAuthoredFollowUps, capabilityStatements } from "@/lib/eng/authored/follow-ups";
import { ButtonLink } from "@/components/ui/Button";
import { AuthoredCollaborationPanel } from "@/components/work-samples/runtime/AuthoredCollaborationPanel";
import { ReleaseAuthoredReport } from "@/components/work-samples/runtime/ReleaseAuthoredReport";
import { employerCollaboration } from "@/lib/eng/authored/collaboration";
import type { ScenarioPackage } from "@/lib/eng/authoring/package";
import { sealedSubmissionFiles } from "@/lib/eng/authored/employer";
import { employerEvaluation } from "@/lib/eng/authored/reports";
import { listResponses } from "@/lib/eng/candidate-report";
import CandidateResponsesReview from "@/components/eng/CandidateResponsesReview";
import { responseTargetLabels } from "@/lib/eng/response-labels";
import { candidateIdentity } from "@/lib/eng/candidate-label";
import type { Admin, EngMember } from "@/lib/eng/context";
import { EVENT_LABELS, type OrgAttemptView } from "@/lib/eng/employer-view";
import { roleCan } from "@/lib/eng/permissions";
import { OPERATIONAL_STATES } from "@/lib/eng/state";

function handoffAnswers(handoff: unknown): { id: string; label: string; answer: string }[] {
  if (!handoff || typeof handoff !== "object") return [];
  const authored = (handoff as { authored?: unknown }).authored;
  if (!Array.isArray(authored)) return [];
  return authored.flatMap((a: unknown) => {
    if (!a || typeof a !== "object") return [];
    const { id, label, answer } = a as Record<string, unknown>;
    return typeof id === "string" && typeof label === "string" && typeof answer === "string" ? [{ id, label, answer }] : [];
  });
}

/** The employer attempt page for an employer-authored work sample. */
export async function AuthoredAttempt({ db, member, view, pkg }: { db: Admin; member: EngMember; view: OrgAttemptView; pkg: ScenarioPackage }) {
  const { attempt } = view;
  const canSeeEvidence = view.canSeeEvidence;
  const canWrite = roleCan(member.role, "write_reports");
  const preview = Boolean(attempt.is_preview ?? view.invitation.is_preview);
  const testsFinished = view.run?.status === "human_review" || view.run?.status === "ready";
  const delayed = view.run?.status === "blocked" || view.run?.status === "retryable_failure";
  const [evaluation, files, responses] = await Promise.all([
    canSeeEvidence && testsFinished && view.run ? employerEvaluation(db, attempt.id, view.run.id) : Promise.resolve(null),
    canSeeEvidence && view.submission ? sealedSubmissionFiles(db, view.submission) : Promise.resolve(null),
    canSeeEvidence ? listResponses(db, attempt.id) : Promise.resolve([]),
  ]);
  const handoff = view.submission ? handoffAnswers(view.submission.handoff) : null;
  const [collaboration, { data: versionRow }] = await Promise.all([
    canSeeEvidence && attempt.started_at ? employerCollaboration(db, { attempt, pkg }, handoff, files) : Promise.resolve(null),
    db.from("eng_scenario_versions").select("version").eq("id", attempt.scenario_version_id).maybeSingle(),
  ]);
  const starter = new Map(pkg.starterFiles.map((f) => [f.path, f.content]));
  const changedPaths = new Set<string>((files ?? []).filter((f) => starter.get(f.path) !== f.content).map((f) => f.path));
  const changes = files
    ? { changed: [...changedPaths].filter((p) => starter.has(p)).sort(), added: [...changedPaths].filter((p) => !starter.has(p)).sort() }
    : null;
  const who = candidateIdentity(view.invitation);
  const state = OPERATIONAL_STATES[view.state];
  const latestDecision = view.decisions[0] ?? null;
  const followUps = evaluation ? buildAuthoredFollowUps(evaluation, pkg.rubric) : null;
  const brief = evaluation ? buildAuthoredDecisionBrief(evaluation) : null;
  const capabilities = evaluation ? capabilityStatements(evaluation, changes) : [];
  const briefText =
    brief && followUps
      ? authoredBriefText({ candidate: preview ? "Preview" : who.primary, role: view.role.title, task: pkg.brief.title, brief, followUps, capabilities })
      : "";
  const sampleVersion = (versionRow?.version as number | undefined) ?? null;
  const openResponses = responses.filter((r) => r.status === "open").length;
  const canDecide = !preview && roleCan(member.role, "record_decision");
  const mainAction: { label: string; href: string } | null = !canSeeEvidence
    ? null
    : delayed
      ? { label: "Resolve technical issue", href: "#evaluation-delayed" }
      : !evaluation
        ? null
        : !view.report
          ? { label: canWrite && view.draft ? "Review submission" : "Read the findings", href: "#findings" }
          : openResponses
            ? { label: "Read response", href: "#responses" }
            : canDecide && (!latestDecision || latestDecision.decision === "hold")
              ? { label: "Record decision", href: "#decision" }
              : null;

  const timeline: TimelineEntry[] = [
    { id: "invited", type: "invitation_created", at: view.invitation.created_at },
    ...view.timeline,
  ].map((e) => ({
    id: e.id,
    time: <LocalTime iso={e.at} />,
    title: e.type === "invitation_created" ? (preview ? "Preview started" : "Invitation created") : (EVENT_LABELS[e.type] ?? e.type.replace(/_/g, " ")),
    tone: e.type === "evaluation_blocked" || e.type === "evaluation_retries_exhausted" ? "change" : e.type === "submission_accepted" || e.type === "report_released" ? "key" : "neutral",
  }));

  return (
    <div className="max-w-[1240px]">
      <Link href={`/app/employer/engineering/roles/${view.role.id}`} className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← {view.role.title}
      </Link>

      <header className="mt-4 border-b border-[var(--border-subtle)] pb-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-app-meta text-[var(--text-tertiary)]">
          <span>
            Evaluation <Mono>{attempt.id.slice(0, 8)}</Mono>
          </span>
          <span className="text-[var(--text-secondary)]">{state.label}</span>
          {preview ? <Status kind="pending">Preview</Status> : null}
          {view.submission?.late ? <Status kind="attention">Submitted late</Status> : null}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">{preview ? "Your preview" : who.primary}</h1>
        <p className="mt-1 text-app-body text-[var(--text-secondary)]">
          {view.role.title} · {pkg.brief.title}
          {sampleVersion !== null ? `, work sample version ${sampleVersion}` : ""}
          {view.report ? `, report version ${view.report.version}` : view.draft ? ", report not released" : ""}
        </p>
        <p className="mt-3 text-app-meta text-[var(--text-secondary)]">{state.meaning}</p>
        {preview ? (
          <p className="mt-2 max-w-[64ch] text-app-meta text-[var(--text-secondary)]">
            Preview attempts use no quota, are left out of role counts, and cannot receive a hiring decision.
          </p>
        ) : null}
        {mainAction ? (
          <div className="mt-4">
            <ButtonLink href={mainAction.href} variant="primary" size="sm">
              {mainAction.label}
            </ButtonLink>
          </div>
        ) : null}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid h-fit min-w-0 gap-6">
          {evaluation ? (
            <Panel id="outcome">
              <PanelSection
                title="Outcome and scope"
                description="What this submission showed in one work sample. It does not establish overall ability, and criteria the tests could not reach are marked not assessed."
              >
                {brief ? (
                  <p className="max-w-[68ch] text-app-body text-[var(--text-body)]">
                    {brief.acceptance.confirmed} of {brief.acceptance.total} acceptance criteria passed in the controlled run for this submission
                    {brief.acceptance.notConfirmed ? `, ${brief.acceptance.notConfirmed} did not pass` : ""}
                    {brief.acceptance.noResult ? `, ${brief.acceptance.noResult} produced no result and were not assessed` : ""}.
                  </p>
                ) : null}
                {capabilities.length ? (
                  <ul className="mt-3 grid max-w-[72ch] gap-2 text-app-body text-[var(--text-body)]">
                    {capabilities.map((c) => (
                      <li key={c.criterionId}>{c.text}</li>
                    ))}
                  </ul>
                ) : null}
              </PanelSection>
            </Panel>
          ) : null}

          {canSeeEvidence && delayed ? (
            <Panel id="evaluation-delayed">
              <PanelSection title="Evaluation delayed">
                <EmptyState
                  title="The tests could not run"
                  description={`This is a platform issue, not a candidate result. ${view.run?.last_error_detail ?? view.run?.last_error_code ?? ""} The candidate sees "Evaluation pending".`}
                  action={roleCan(member.role, "retry_evaluation") ? <RequeueButton endpoint={`/api/eng/org/attempts/${attempt.id}/requeue`} /> : undefined}
                />
              </PanelSection>
            </Panel>
          ) : null}

          {evaluation ? (
            <Panel id="findings">
              <AuthoredEvaluationPanel evaluation={evaluation} />
            </Panel>
          ) : canSeeEvidence && !delayed ? (
            <Panel id="findings">
              <PanelSection title="Automated evaluation">
                <EmptyState
                  title={view.submission || attempt.status === "submitted" ? "Waiting for the tests" : "Waiting for the submission"}
                  description={
                    attempt.status === "submitted"
                      ? "The submission is sealed and queued. Results appear here when the runner finishes."
                      : "Results appear here after the candidate submits and the tests run."
                  }
                />
              </PanelSection>
            </Panel>
          ) : null}

          {evaluation && followUps ? (
            <Panel id="follow-ups">
              <AuthoredFollowUpsPanel followUps={followUps} />
            </Panel>
          ) : null}

          {canSeeEvidence && evaluation ? (
            <Panel id="report">
              {view.report ? (
                <PanelSection
                  title={`Released to the candidate, version ${view.report.version}`}
                  description={
                    <>
                      Released by {view.reviewerNames[view.report.reviewer_email] ?? view.report.reviewer_email}
                      {view.report.released_at ? (
                        <>
                          , <LocalTime iso={view.report.released_at} />
                        </>
                      ) : null}
                      .
                    </>
                  }
                >
                  {view.report.brief.authored?.reviewerNote ? (
                    <p className="max-w-[68ch] whitespace-pre-wrap text-app-body text-[var(--text-body)]">{view.report.brief.authored.reviewerNote}</p>
                  ) : (
                    <p className="text-app-body text-[var(--text-secondary)]">Released without a note.</p>
                  )}
                </PanelSection>
              ) : canWrite && view.draft?.brief.authored ? (
                <PanelSection title="Share with the candidate">
                  <ReleaseAuthoredReport attemptId={attempt.id} />
                </PanelSection>
              ) : (
                <PanelSection title="Not released yet">
                  <p className="text-app-body text-[var(--text-secondary)]">An owner or admin with report access can release the report to the candidate.</p>
                </PanelSection>
              )}
            </Panel>
          ) : null}

          {canSeeEvidence && responses.length ? <div id="responses" className="scroll-mt-6"><CandidateResponsesReview attemptId={attempt.id} initial={responses} canResolve={canWrite} targetLabels={responseTargetLabels(view.report?.brief, view.report?.findings)} /></div> : null}

          {canSeeEvidence && view.submission ? (
            <Panel>
              <AuthoredSubmissionPanel files={files} changedPaths={changedPaths} handoff={handoff ?? []} aiDisclosure={view.submission.ai_disclosure || null} />
            </Panel>
          ) : null}

          {collaboration ? (
            <Panel>
              <AuthoredCollaborationPanel data={collaboration} />
            </Panel>
          ) : null}

          {canSeeEvidence ? (
            <Panel id="limitations">
              <PanelSection title="Limitations and context">
                <ul className="grid max-w-[72ch] gap-1.5 text-app-body text-[var(--text-secondary)]">
                  <li>This is one timed work sample. The findings describe this submission only, not the candidate&apos;s overall ability or personality.</li>
                  <li>Collaboration observations cover only behaviours the task gave a fair chance to show. Brevity, message volume and pauses are never counted against the candidate.</li>
                  <li>Platform faults, such as a test runner or model outage, are recorded separately and never count against the candidate.</li>
                  {sampleVersion !== null ? <li>Evaluated against work sample version {sampleVersion}. Later edits to the work sample do not change this report.</li> : null}
                </ul>
              </PanelSection>
              {view.reportHistory.length ? (
                <PanelSection title="Report version history">
                  <ul className="grid gap-2 text-app-meta">
                    {view.reportHistory.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium text-[var(--text-primary)]">Version {r.version}</span>
                        <span className="text-[var(--text-tertiary)]">
                          {" "}
                          {r.status}
                          {r.released_at ? (
                            <>
                              , <LocalTime iso={r.released_at} />
                            </>
                          ) : null}
                        </span>
                        {r.change_reason ? <p className="mt-0.5 text-[var(--text-secondary)]">{r.change_reason}</p> : null}
                      </li>
                    ))}
                  </ul>
                </PanelSection>
              ) : null}
            </Panel>
          ) : null}

          <Panel>
            <PanelSection title="Timeline" description="Recorded by the server. Fydell does not watch the candidate's screen or editor.">
              <EvidenceTimeline items={timeline} />
            </PanelSection>
          </Panel>
        </div>

        <div className="grid h-fit gap-6">
          {canSeeEvidence ? (
            <p className="text-app-meta text-[var(--text-secondary)]">Team only. The brief, decisions and notes below are never shown to the candidate.</p>
          ) : null}
          {brief ? (
            <Panel>
              <AuthoredBriefPanel brief={brief} text={briefText} />
            </Panel>
          ) : null}
          {canDecide && view.report ? (
            <Panel id="decision">
              <PanelSection title="Your decision" description="Fydell provides evidence. The decision is yours.">
                <DecisionForm attemptId={attempt.id} reportVersion={view.report.version} current={latestDecision?.decision ?? null} currentDecisionId={latestDecision?.id ?? null} />
              </PanelSection>
              {latestDecision ? (
                <PanelSection title="Decision history">
                  <ul className="grid gap-2 text-app-meta">
                    {view.decisions.map((d) => (
                      <li key={d.id}>
                        <span className="font-medium capitalize text-[var(--text-primary)]">{d.decision}</span>
                        <span className="text-[var(--text-tertiary)]">
                          {" "}
                          by {d.by ?? "a team member"}, <When iso={d.at} />
                        </span>
                        {d.notes ? <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-secondary)]">{d.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                </PanelSection>
              ) : null}
            </Panel>
          ) : null}
          {canSeeEvidence ? (
            <Panel>
              <PanelSection title="Team notes">
                {roleCan(member.role, "write_notes") ? <NoteForm attemptId={attempt.id} /> : null}
                <ul className="mt-3 grid gap-2 text-app-meta">
                  {view.notes.map((n) => (
                    <li key={n.id}>
                      <span className="text-[var(--text-tertiary)]">
                        {n.by ?? "Team member"}, <When iso={n.at} />
                      </span>
                      <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-secondary)]">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </PanelSection>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
