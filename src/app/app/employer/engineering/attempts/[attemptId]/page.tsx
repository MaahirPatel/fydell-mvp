import Link from "next/link";
import { notFound } from "next/navigation";
import FydellMark from "@/components/brand/FydellMark";
import {
  DecisionBrief,
  EvidenceRail,
  EvidenceTimeline,
  LEVEL_LABEL,
  Mono,
  WorkReceipt,
  type RailStep,
  type TimelineEntry,
} from "@/components/evidence/Evidence";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { DecisionForm, EmployerReport, NoteForm, When } from "@/components/eng/EmployerAttemptPanels";
import ReviewWorkspace from "@/components/eng/ReviewWorkspace";
import { RequeueButton } from "@/components/eng/ReviewerControls";
import { scheduleIfRunnable } from "@/lib/eng/route-helpers";
import { getAttemptForOrg } from "@/lib/eng/attempts";
import { engAdmin } from "@/lib/eng/context";
import { EVENT_LABELS, orgAttemptView, pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { OPERATIONAL_STATES } from "@/lib/eng/state";
import type { Decision, Finding } from "@/lib/eng/types";

export const metadata = { title: "Candidate attempt" };
export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<Decision, string> = { advance: "Advance", hold: "Hold", decline: "Declined" };

const DIMENSION_LABEL: Record<Finding["dimension"], string> = {
  correctness: "Correctness",
  engineering_judgment: "Engineering judgment",
  requirement_response: "Requirement response",
  work_communication: "Communication",
};

const KEY_EVENTS = new Set(["submission_accepted", "evaluation_completed", "report_released", "report_correction_released", "decision_recorded"]);
const CHANGE_EVENTS = new Set(["requirement_update_released", "upload_rejected", "evaluation_blocked", "evaluation_retries_exhausted"]);

function isDecision(value: string): value is Decision {
  return value === "advance" || value === "hold" || value === "decline";
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function duration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EmployerAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const member = await pageMember();
  if (!member || !isUuid(attemptId) || !roleCan(member.role, "view_attempts")) notFound();
  const db = engAdmin();
  const attempt = await getAttemptForOrg(db, attemptId, member.organizationId).catch(() => null);
  if (!attempt) notFound();
  const canSeeEvidence = roleCan(member.role, "view_reports");
  const canWrite = roleCan(member.role, "write_reports");
  if (attempt.status === "submitted") await scheduleIfRunnable(db, attempt.id);
  const view = await orgAttemptView(db, member, attempt, canSeeEvidence);
  const testsFinished = view.run?.status === "human_review" || view.run?.status === "ready";
  const delayed = view.run?.status === "blocked" || view.run?.status === "retryable_failure";
  const { definition } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const teammates = Object.fromEntries(definition.teammates.map((t) => [t.id, t.name]));
  const state = OPERATIONAL_STATES[view.state];
  const candidateLabel = view.invitation.candidate_name || view.invitation.candidate_email;
  const results = view.run?.results ?? [];
  const hidden = results.filter((r) => r.visibility === "hidden");
  const hiddenPassed = hidden.filter((r) => r.outcome === "passed").length;
  const updateChecks = results.filter((r) => r.phase === "update");
  const updatePassed = updateChecks.filter((r) => r.outcome === "passed").length;
  const latestDecision = view.decisions[0] ?? null;
  const decisionValue = latestDecision && isDecision(latestDecision.decision) ? latestDecision.decision : null;
  const workMs = attempt.started_at && attempt.submitted_at ? Date.parse(attempt.submitted_at) - Date.parse(attempt.started_at) : null;

  const rail: RailStep[] = [
    { label: "Source", value: "Invited", state: "done" },
    { label: "Work", value: attempt.submitted_at ? "Submitted" : attempt.started_at ? "In progress" : "Not started", state: attempt.submitted_at ? "done" : attempt.started_at ? "current" : "pending" },
    {
      label: "Verify",
      value: testsFinished && hidden.length ? `${hiddenPassed} / ${hidden.length}` : view.submission ? "Running" : "Checks",
      state: testsFinished ? "done" : view.submission ? "current" : "pending",
    },
    { label: "Decide", value: decisionValue ? DECISION_LABEL[decisionValue] : "Decision", state: decisionValue ? "done" : view.report ? "current" : "pending" },
  ];

  let lastDay = "";
  const timeline: TimelineEntry[] = [
    { id: "invited", type: "invitation_created", at: view.invitation.created_at, payload: {} as Record<string, unknown> },
    ...view.timeline,
  ].map((e) => {
    const day = new Date(e.at).toLocaleDateString(undefined, { dateStyle: "medium" });
    const showDay = day !== lastDay;
    lastDay = day;
    const extra =
      e.type === "deadline_extended" && typeof e.payload.minutes === "number"
        ? `By ${e.payload.minutes} min`
        : e.type === "requirement_update_released" && e.payload.reason === "early_submission"
          ? "Early, when the candidate first tried to submit"
          : null;
    return {
      id: e.id,
      time: <time dateTime={e.at} title={day}>{clock(e.at)}</time>,
      title: e.type === "invitation_created" ? "Invitation created" : (EVENT_LABELS[e.type] ?? e.type.replace(/_/g, " ")),
      detail: [showDay ? day : null, extra].filter(Boolean).join(" · ") || undefined,
      tone: CHANGE_EVENTS.has(e.type) ? "change" : KEY_EVENTS.has(e.type) ? "key" : "neutral",
    };
  });

  return (
    <div className="max-w-[1240px]">
      <Link href={`/app/employer/engineering/roles/${view.role.id}`} className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← {view.role.title}
      </Link>

      <header className="mt-4 grid gap-5 border-b border-[var(--border-subtle)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-app-meta text-[var(--text-tertiary)]">
            <span>
              Evaluation <Mono>{attempt.id.slice(0, 8)}</Mono>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fy-accent)]" />
              {state.label}
            </span>
            {view.submission?.late ? <StatusTag tone="changed">Submitted late</StatusTag> : null}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)]">{candidateLabel}</h1>
          <p className="mt-1 text-app-body text-[var(--text-secondary)]">
            {view.role.title} · {definition.title}
          </p>
          <p className="mt-3 max-w-[64ch] text-app-body leading-[1.55] text-[var(--text-body)]">{definition.summary}</p>
          <dl className="mt-4 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-app-meta">
            {view.invitation.candidate_name ? (
              <>
                <dt className="text-[var(--text-tertiary)]">Email</dt>
                <dd className="m-0 text-[var(--text-primary)]">{view.invitation.candidate_email}</dd>
              </>
            ) : null}
            <dt className="text-[var(--text-tertiary)]">Time</dt>
            <dd className="m-0 text-[var(--text-primary)]">
              {workMs !== null ? <Mono>{duration(workMs)}</Mono> : view.dueAt && !attempt.submitted_at ? <>Due <When iso={view.dueAt} /></> : "Not started"}
            </dd>
            <dt className="text-[var(--text-tertiary)]">Status</dt>
            <dd className="m-0 text-[var(--text-secondary)]">{state.meaning}</dd>
          </dl>
        </div>
        <EvidenceRail steps={rail} />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid h-fit min-w-0 gap-6">
        {view.submission ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <WorkReceipt
              title={definition.title}
              subtitle={
                <>
                  {view.role.title} · submitted <When iso={view.submission.submitted_at} />
                </>
              }
              verified={testsFinished}
              rows={[
                { label: "Archive", value: <Mono>{view.files.length} files · {bytes(view.submission.archive_bytes)}</Mono> },
                ...(workMs !== null ? [{ label: "Time worked", value: <Mono>{duration(workMs)}</Mono> }] : []),
              ]}
              checks={
                testsFinished
                  ? [
                      ...(hidden.length
                        ? [{ label: <><Mono>{hiddenPassed} / {hidden.length}</Mono> hidden checks passed</>, state: hiddenPassed === hidden.length ? ("pass" as const) : ("fail" as const) }]
                        : []),
                      ...(updateChecks.length
                        ? [{ label: <><Mono>{updatePassed} / {updateChecks.length}</Mono> requirement-update checks passed</>, state: updatePassed === updateChecks.length ? ("pass" as const) : ("fail" as const) }]
                        : []),
                      ...(view.submission.late ? [{ label: "Submitted after the deadline", state: "note" as const }] : []),
                    ]
                  : [{ label: "Checks run on the candidate's machine; results are candidate-submitted", state: "note" as const }]
              }
              reference={`sha256:${view.submission.archive_sha256.slice(0, 16)}`}
              action={view.report ? <a href="#report">View report →</a> : undefined}
            />
            <Panel>
              <PanelSection title="Evidence" description="Recorded by the server. Fydell does not watch the candidate's screen or editor.">
                <EvidenceTimeline items={timeline} />
              </PanelSection>
            </Panel>
          </div>
        ) : null}
        {!view.report && canWrite && testsFinished && view.run?.results && view.submission ? (
          <ReviewWorkspace
            apiBase={`/api/eng/org/attempts/${attempt.id}`}
            scenario={definition}
            suiteVersion={view.run.suite_version}
            results={view.run.results}
            submission={view.submission}
            files={view.files}
            messages={view.messages}
            draft={view.draft}
            released={null}
          />
        ) : null}
        {!view.report && canSeeEvidence && delayed ? (
          <Panel>
            <PanelSection title="Tests delayed">
              <EmptyState
                title="The evaluation environment failed"
                description={`This is a platform issue, not a candidate result${view.run?.last_error_code ? ` (${view.run.last_error_code})` : ""}. It retries automatically; you can also retry now.`}
                action={roleCan(member.role, "retry_evaluation") ? <RequeueButton endpoint={`/api/eng/org/attempts/${attempt.id}/requeue`} /> : undefined}
              />
            </PanelSection>
          </Panel>
        ) : null}
        <Panel id="report">
          {view.report && view.run?.results && view.submission ? (
            <PanelSection
              title={`Report, version ${view.report.version}`}
              description={`Reviewed by ${view.report.reviewer_email}${view.report.released_at ? ", released " + new Date(view.report.released_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}. Rubric ${view.report.rubric_version}, checks ${view.run.suite_version}, executor ${view.run.executor ?? "unknown"}.`}
            >
              {view.report.change_reason ? (
                <p className="mb-4 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3 py-2 text-app-meta text-[var(--text-secondary)]">
                  Correction: {view.report.change_reason}
                </p>
              ) : null}
              <EmployerReport
                attemptId={attempt.id}
                canFlag={roleCan(member.role, "flag_finding")}
                brief={view.report.brief}
                findings={view.report.findings}
                results={view.run.results}
                messages={view.messages}
                handoff={{ ...view.submission.handoff }}
                aiDisclosure={view.submission.ai_disclosure}
                teammates={teammates}
              />
            </PanelSection>
          ) : (
            <PanelSection title="Report">
              <EmptyState
                title={!canSeeEvidence ? "Your role cannot read evidence" : testsFinished ? "Not released yet" : view.submission ? "Waiting for the trusted tests" : "Waiting for the submission"}
                description={
                  !canSeeEvidence
                    ? "Viewers can follow progress. Ask an owner or admin for reviewer access to read reports."
                    : testsFinished
                      ? "Review the evidence above, write the findings with citations, and release the report. Decisions are recorded against a released report."
                      : view.submission
                        ? "The candidate has submitted. The evidence opens here for review as soon as the trusted tests finish."
                        : "The evidence opens here once the candidate submits and the trusted tests finish."
                }
              />
            </PanelSection>
          )}
        </Panel>
        {view.report && canWrite && view.run?.results && view.submission ? (
          <details className="group">
            <summary className="cursor-pointer text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {view.draft ? `Continue the correction (v${view.draft.version})` : "Correct this report"}
            </summary>
            <div className="mt-4">
              <ReviewWorkspace
                apiBase={`/api/eng/org/attempts/${attempt.id}`}
                scenario={definition}
                suiteVersion={view.run.suite_version}
                results={view.run.results}
                submission={view.submission}
                files={view.files}
                messages={view.messages}
                draft={view.draft}
                released={view.report}
                showEvidence={false}
              />
            </div>
          </details>
        ) : null}
        </div>

        <div className="grid h-fit gap-6">
          {view.report && view.run?.results ? (
            <Panel>
              <div className="p-5">
                <DecisionBrief
                  mark={<FydellMark width={18} />}
                  verdict={{
                    heading: "Decision",
                    value: decisionValue,
                    note: latestDecision
                      ? `Recorded by ${latestDecision.by ?? "a team member"}${latestDecision.reportVersion ? ` · report v${latestDecision.reportVersion}` : ""}`
                      : "Record it below once the team agrees.",
                  }}
                  summary={view.report.brief.summary}
                  why={view.report.brief.strengths.slice(0, 4)}
                  concerns={view.report.brief.gaps.slice(0, 2)}
                  proof={[
                    ...(hidden.length ? [{ label: "Hidden checks", value: <Mono>{hiddenPassed} / {hidden.length}</Mono> }] : []),
                    ...view.report.brief.dimensions.map((d) => ({
                      label: DIMENSION_LABEL[d.key],
                      value: LEVEL_LABEL[d.level],
                      level: d.level,
                      rationale: d.rationale,
                      support: view.report!.findings.filter((f) => f.dimension === d.key).map((f) => f.statement),
                    })),
                  ]}
                />
              </div>
            </Panel>
          ) : null}
          {view.report && roleCan(member.role, "record_decision") ? (
            <Panel>
              <PanelSection title="Your decision" description="Fydell provides evidence. The decision is yours.">
                <DecisionForm attemptId={attempt.id} reportVersion={view.report.version} />
              </PanelSection>
              {view.decisions.length ? (
                <PanelSection title="Decision history">
                  <ul className="grid gap-2 text-app-meta">
                    {view.decisions.map((d) => (
                      <li key={d.id}>
                        <span className="font-medium capitalize text-[var(--text-primary)]">{d.decision}</span>
                        <span className="text-[var(--text-tertiary)]">
                          {" "}
                          by {d.by ?? "a team member"}, <When iso={d.at} />
                          {d.reportVersion ? `, report v${d.reportVersion}` : ""}
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
              {view.flags.length ? (
                <PanelSection title="Flagged findings">
                  <ul className="grid gap-2 text-app-meta">
                    {view.flags.map((f) => (
                      <li key={f.id}>
                        <span className="font-mono text-[var(--text-tertiary)]">{f.findingId}</span>{" "}
                        <span className="text-[var(--text-tertiary)]">{f.resolvedAt ? "resolved" : "open"}</span>
                        <p className="mt-0.5 text-[var(--text-secondary)]">{f.reason}</p>
                      </li>
                    ))}
                  </ul>
                </PanelSection>
              ) : null}
              {view.reportHistory.length > 1 ? (
                <PanelSection title="Report versions">
                  <ul className="grid gap-1.5 text-app-meta text-[var(--text-secondary)]">
                    {view.reportHistory.map((r) => (
                      <li key={r.id}>
                        v{r.version} · {r.status}
                        {r.change_reason ? ` · ${r.change_reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </PanelSection>
              ) : null}
            </Panel>
          ) : null}

          {!view.submission ? (
            <Panel>
              <PanelSection title="Evidence" description="Recorded by the server. Fydell does not watch the candidate's screen or editor.">
                <EvidenceTimeline items={timeline} />
              </PanelSection>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
