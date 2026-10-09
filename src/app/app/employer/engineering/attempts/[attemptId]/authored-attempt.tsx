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
import { authoredBriefText, buildAuthoredDecisionBrief, buildAuthoredFollowUps } from "@/lib/eng/authored/follow-ups";
import { AuthoredCollaborationPanel } from "@/components/work-samples/runtime/AuthoredCollaborationPanel";
import { ReleaseAuthoredReport } from "@/components/work-samples/runtime/ReleaseAuthoredReport";
import { employerCollaboration } from "@/lib/eng/authored/collaboration";
import type { ScenarioPackage } from "@/lib/eng/authoring/package";
import { sealedSubmissionFiles } from "@/lib/eng/authored/employer";
import { employerEvaluation } from "@/lib/eng/authored/reports";
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
  const [evaluation, files] = await Promise.all([
    canSeeEvidence && testsFinished && view.run ? employerEvaluation(db, attempt.id, view.run.id) : Promise.resolve(null),
    canSeeEvidence && view.submission ? sealedSubmissionFiles(db, view.submission) : Promise.resolve(null),
  ]);
  const handoff = view.submission ? handoffAnswers(view.submission.handoff) : null;
  const collaboration = canSeeEvidence && attempt.started_at ? await employerCollaboration(db, { attempt, pkg }, handoff, files) : null;
  const starter = new Map(pkg.starterFiles.map((f) => [f.path, f.content]));
  const changedPaths = new Set<string>((files ?? []).filter((f) => starter.get(f.path) !== f.content).map((f) => f.path));
  const who = candidateIdentity(view.invitation);
  const state = OPERATIONAL_STATES[view.state];
  const latestDecision = view.decisions[0] ?? null;
  const followUps = evaluation ? buildAuthoredFollowUps(evaluation, pkg.rubric) : null;
  const brief = evaluation ? buildAuthoredDecisionBrief(evaluation) : null;
  const briefText =
    brief && followUps
      ? authoredBriefText({ candidate: preview ? "Preview" : who.primary, role: view.role.title, task: pkg.brief.title, brief, followUps })
      : "";

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
        </p>
        <p className="mt-3 max-w-[64ch] text-app-body leading-[1.55] text-[var(--text-body)]">{pkg.brief.summary}</p>
        {preview ? (
          <p className="mt-3 max-w-[64ch] text-app-meta text-[var(--text-secondary)]">
            Preview attempts use no quota, are left out of role counts, and cannot receive a hiring decision.
          </p>
        ) : null}
        <p className="mt-3 text-app-meta text-[var(--text-secondary)]">{state.meaning}</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid h-fit min-w-0 gap-6">
          {canSeeEvidence && delayed ? (
            <Panel>
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
            <Panel>
              <AuthoredEvaluationPanel evaluation={evaluation} />
            </Panel>
          ) : canSeeEvidence && !delayed ? (
            <Panel>
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
                      Released by {view.report.reviewer_email}
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

          <Panel>
            <PanelSection title="Timeline" description="Recorded by the server. Fydell does not watch the candidate's screen or editor.">
              <EvidenceTimeline items={timeline} />
            </PanelSection>
          </Panel>
        </div>

        <div className="grid h-fit gap-6">
          {brief ? (
            <Panel>
              <AuthoredBriefPanel brief={brief} text={briefText} />
            </Panel>
          ) : null}
          {!preview && view.report && roleCan(member.role, "record_decision") ? (
            <Panel>
              <PanelSection title="Your decision" description="Fydell provides evidence. The decision is yours.">
                <DecisionForm attemptId={attempt.id} reportVersion={view.report.version} current={latestDecision?.decision ?? null} />
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
