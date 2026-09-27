import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusTag } from "@/components/ui/StatusTag";
import { DecisionForm, EmployerReport, NoteForm, When } from "@/components/eng/EmployerAttemptPanels";
import { getAttemptForOrg } from "@/lib/eng/attempts";
import { engAdmin } from "@/lib/eng/context";
import { EVENT_LABELS, orgAttemptView, pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { OPERATIONAL_STATES } from "@/lib/eng/state";

export const metadata = { title: "Candidate attempt" };
export const dynamic = "force-dynamic";

export default async function EmployerAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const member = await pageMember();
  if (!member || !isUuid(attemptId) || !roleCan(member.role, "view_attempts")) notFound();
  const db = engAdmin();
  const attempt = await getAttemptForOrg(db, attemptId, member.organizationId).catch(() => null);
  if (!attempt) notFound();
  const canSeeEvidence = roleCan(member.role, "view_reports");
  const view = await orgAttemptView(db, member, attempt, canSeeEvidence);
  const { definition } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const teammates = Object.fromEntries(definition.teammates.map((t) => [t.id, t.name]));
  const state = OPERATIONAL_STATES[view.state];
  const candidateLabel = view.invitation.candidate_name || view.invitation.candidate_email;

  return (
    <div className="max-w-[1180px]">
      <Link href={`/app/employer/engineering/roles/${view.role.id}`} className="text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← {view.role.title}
      </Link>
      <PageHeader
        className="mt-3"
        title={candidateLabel}
        description={state.meaning}
        meta={
          <>
            <StatusTag tone={state.tone}>{state.label}</StatusTag>
            {view.submission?.late ? <StatusTag tone="changed">Submitted late</StatusTag> : null}
            {view.invitation.candidate_name ? <span className="text-app-meta text-[var(--text-secondary)]">{view.invitation.candidate_email}</span> : null}
            {view.dueAt && !attempt.submitted_at ? (
              <span className="text-app-meta text-[var(--text-secondary)]">
                Due <When iso={view.dueAt} />
              </span>
            ) : null}
          </>
        }
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          {view.report && view.run?.results && view.submission ? (
            <PanelSection
              title={`Human-checked report, version ${view.report.version}`}
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
                title={canSeeEvidence ? "No released report yet" : "Your role cannot read evidence"}
                description={
                  canSeeEvidence
                    ? "Evidence appears here after the trusted checks finish and a qualified reviewer releases the report. Nothing is shown before a person has checked it."
                    : "Viewers can follow progress. Ask an owner or admin for reviewer access to read reports."
                }
              />
            </PanelSection>
          )}
        </Panel>

        <div className="grid h-fit gap-6">
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

          <Panel>
            <PanelSection title="Timeline" description="Recorded by the server. Fydell does not watch the candidate's screen or editor.">
              <ol className="grid gap-2 text-app-meta">
                <li>
                  <span className="text-[var(--text-primary)]">Invitation created</span>
                  <span className="block text-[var(--text-tertiary)]">
                    <When iso={view.invitation.created_at} />
                  </span>
                </li>
                {view.timeline.map((e) => (
                  <li key={e.id}>
                    <span className="text-[var(--text-primary)]">{EVENT_LABELS[e.type] ?? e.type.replace(/_/g, " ")}</span>
                    {e.type === "deadline_extended" && typeof e.payload.minutes === "number" ? (
                      <span className="text-[var(--text-secondary)]"> by {e.payload.minutes} min</span>
                    ) : null}
                    <span className="block text-[var(--text-tertiary)]">
                      <When iso={e.at} />
                    </span>
                  </li>
                ))}
              </ol>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}
