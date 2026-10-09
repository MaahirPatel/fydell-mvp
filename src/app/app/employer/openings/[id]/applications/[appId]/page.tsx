import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { orgCan } from "@/lib/orgs/capabilities";
import { getApplicationForOrg } from "@/lib/hiring/applications";
import { getRole } from "@/lib/hiring/roles";
import { listApplicationInvitations, listWorkSampleOptions, type ApplicationInvitation } from "@/lib/hiring/work-samples";
import { formatDeadline } from "@/lib/hiring/evidence-gap";
import { STAGE_LABEL } from "@/lib/hiring/role-contract";
import { authorizeReviewScope, listMappings, listQuestions, type EvidenceMapping, type ReviewQuestion } from "@/lib/employer/review";
import { getReview } from "@/lib/passport/store";
import { WorkspacePageHeader } from "@/components/employer/WorkspacePage";
import StageSelect from "@/components/hiring/StageSelect";
import ApplicationReview from "@/components/employer/review/ApplicationReview";
import PassportDecisionPanel from "@/components/employer/PassportDecisionPanel";
import { LocalDate } from "@/components/eng/LocalTime";
import EvidenceSnapshotView from "@/components/evidence/EvidenceSnapshotView";
import ApplicationQuestions, { type QuestionTarget } from "@/components/evidence/ApplicationQuestions";
import { getApplicationEvidenceForOrg, listApplicationQuestionsForOrg } from "@/lib/profile-evidence/applications";
import type { EvidenceItem, ReviewData, ReviewRequirement } from "@/components/employer/review/types";

export const metadata = { title: "Application" };
export const dynamic = "force-dynamic";

const INVITE_STATUS: Record<ApplicationInvitation["status"], string> = {
  invited: "Invited, not started",
  accepted: "Accepted",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

const ATTEMPT_STATUS: Record<string, string> = {
  accepted: "Accepted",
  preflight_passed: "Setup done",
  in_progress: "In progress",
  submitted: "Submitted",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

const DELIVERY: Record<ApplicationInvitation["emailDelivery"], string> = {
  sent: "Email sent",
  failed: "Email failed; the applicant was notified in Fydell",
  not_configured: "Email is not configured here; the applicant was notified in Fydell",
};

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5" aria-labelledby={id}>
      <h2 id={id} className="text-[14px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function EmployerApplicationPage({ params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/openings/${id}/applications/${appId}`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const [app, role] = await Promise.all([getApplicationForOrg(org.organizationId, appId), getRole(org.organizationId, id)]);
  if (!app || !role || app.roleId !== role.id) notFound();

  const canInvite = orgCan(org.role, "manage_candidates");
  const canAsk = orgCan(org.role, "record_decisions");
  const [review, invitations, workSamples, pinned, appQuestions] = await Promise.all([
    app.reviewId ? getReview(org.organizationId, app.reviewId) : Promise.resolve(null),
    listApplicationInvitations(org.organizationId, app.id),
    canInvite ? listWorkSampleOptions(org.organizationId) : Promise.resolve([]),
    getApplicationEvidenceForOrg(org.organizationId, app.id, user.id),
    listApplicationQuestionsForOrg(org.organizationId, app.id),
  ]);
  const pinnedItems = pinned?.items ?? [];
  const questionTargets: QuestionTarget[] = pinnedItems.flatMap((p) =>
    p.content ? [{ versionId: p.versionId, title: p.content.title, findings: p.content.findings.map((f) => ({ id: f.id, finding: f.finding })) }] : [],
  );
  const passport = review?.passport ?? null;
  const scope = app.shareId && passport ? await authorizeReviewScope(org.organizationId, role.id, app.shareId) : null;
  let mappings: EvidenceMapping[] = [];
  let questions: ReviewQuestion[] = [];
  if (scope && app.shareId) {
    [mappings, questions] = await Promise.all([
      listMappings(org.organizationId, role.id, app.shareId).catch(() => []),
      listQuestions(org.organizationId, role.id, app.shareId).catch(() => []),
    ]);
  }

  const evidence: EvidenceItem[] = (passport?.projects ?? []).flatMap((p) =>
    p.id
      ? p.evidence.map((e) => ({
          id: e.id,
          projectId: p.id as string,
          repo: e.repo,
          finding: e.finding,
          path: e.path,
          startLine: e.startLine,
          endLine: e.endLine,
          sourceUrl: e.sourceUrl,
          excerpt: e.excerpt.slice(0, 40),
          limitations: e.limitations,
        }))
      : [],
  );

  let requiredIndex = 0;
  const requirements: ReviewRequirement[] = role.intake.requirements
    .filter((r) => r.confirmed)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "required" ? -1 : 1))
    .map((r) => ({ id: r.id, text: r.text, kind: r.kind, mappingIndex: r.kind === "required" ? requiredIndex++ : null }));

  const data: ReviewData = {
    roleId: role.id,
    roleTitle: role.title,
    workSamplePolicy: role.intake.workSamplePolicy,
    application: { id: app.id, name: app.name, status: app.status, note: app.note, links: app.links },
    share: scope && app.shareId ? { shareId: app.shareId } : null,
    requirements,
    evidence,
    mappings,
    questions,
    applicationQuestions: appQuestions,
    invitations,
    workSamples,
    canAsk,
    canInvite,
  };
  const mappedIds = new Set(mappings.map((m) => m.id));
  const otherQuestions = questions.filter((q) => !q.mappingId || !mappedIds.has(q.mappingId));
  const reqText = (rid: string) => role.intake.requirements.find((r) => r.id === rid)?.text;

  return (
    <div>
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> /{" "}
        <Link href={`/app/employer/openings/${role.id}`} className="hover:underline">{role.title}</Link> / {app.name}
      </p>
      <WorkspacePageHeader
        className="mt-4"
        title={app.name}
        description={
          <>
            {app.email} · Applied <LocalDate iso={app.submittedAt} />
            {app.status === "withdrawn" ? " · Withdrawn" : ""}
          </>
        }
        action={
          orgCan(org.role, "record_decisions") && app.status === "submitted" ? (
            <StageSelect key={app.stage} applicationId={app.id} stage={app.stage} applicantName={app.name} />
          ) : (
            <span className="badge badge-neutral">{STAGE_LABEL[app.stage]}</span>
          )
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-10">
        <section className="min-w-0" aria-labelledby="work-heading">
          <h2 id="work-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">The work they chose to send</h2>
          <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            Each project is the version they sent with this application, in the order they chose. Later edits to their profile do not change it.
          </p>
          {pinned?.access === "withdrawn" ? (
            <p className="mt-4 text-app-meta text-[var(--text-secondary)]">The applicant withdrew, so the work they sent is no longer visible.</p>
          ) : pinnedItems.length === 0 ? (
            <p className="mt-4 text-app-meta text-[var(--text-secondary)]">They did not attach projects. Their note and links are below, and you can still ask them a question.</p>
          ) : (
            <ol className="mt-5 grid gap-5">
              {pinnedItems.map((p) => (
                <li key={p.versionId} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
                  {p.content ? (
                    <EvidenceSnapshotView content={p.content} version={p.version} publishedAt={p.publishedAt} headingLevel={3} />
                  ) : (
                    <p className="text-app-meta text-[var(--text-secondary)]">The applicant stopped sharing this project{p.revokedAt ? <> on <LocalDate iso={p.revokedAt} /></> : null}.</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="min-w-0" aria-labelledby="ask-heading">
          <h2 id="ask-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">Ask about the work</h2>
          <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            A targeted question is often enough to settle what the evidence leaves open.
          </p>
          <div className="mt-4">
            <ApplicationQuestions
              key={appQuestions.map((q) => `${q.id}:${q.status}:${q.reviewedAt ?? ""}`).join(",")}
              applicationId={app.id}
              initial={appQuestions} targets={questionTargets} canAsk={canAsk} open={app.status === "submitted"} />
          </div>
        </section>

        <section className="min-w-0" aria-labelledby="requirements-heading">
          <h2 id="requirements-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">Review against each requirement</h2>
          <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            Start from the work they already shared. For each requirement, review the evidence, ask about it, or, only if a gap remains, invite them to a relevant work sample.
          </p>
          {app.snapshot.requirementsVersion !== role.requirementsVersion ? (
            <p className="mt-3 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-app-meta text-[var(--text-secondary)]">
              They applied against requirements version {app.snapshot.requirementsVersion}. The role is now on version {role.requirementsVersion}; the list below is the current one.
            </p>
          ) : null}
          <div className="mt-5">
            <ApplicationReview data={data} />
          </div>
        </section>
        </div>

        <aside className="grid content-start gap-5">
          {review ? (
            <>
              <PassportDecisionPanel reviewId={review.id} initialDecision={review.decision} initialNote={review.privateNote} decidedAt={review.decidedAt} />
              {review.passport ? (
                <Link
                  href={`/app/employer/passports/${review.id}/brief?role=${role.id}`}
                  className="flex items-center justify-between rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  Decision brief
                  <span className="text-[13px] font-normal text-[var(--text-tertiary)]">Print or export</span>
                </Link>
              ) : null}
            </>
          ) : null}
          <Panel id="app-heading" title="What they sent">
            {pinnedItems.length > 0 ? (
              <p className="text-app-meta text-[var(--text-body)]">
                {pinnedItems.filter((p) => p.content).length} of {pinnedItems.length} project version{pinnedItems.length === 1 ? "" : "s"} still shared.
              </p>
            ) : passport ? (
              <p className="text-app-meta text-[var(--text-body)]">
                {passport.projects.length} Passport project{passport.projects.length === 1 ? "" : "s"}, {evidence.length} finding{evidence.length === 1 ? "" : "s"}.
              </p>
            ) : app.reviewId ? (
              <p className="text-app-meta text-[var(--text-secondary)]">{app.status === "withdrawn" ? "The applicant withdrew, so their Passport is no longer visible." : "The applicant revoked access to their Passport."}</p>
            ) : (
              <p className="text-app-meta text-[var(--text-secondary)]">No Passport projects. The note and links are the evidence.</p>
            )}
            <h3 className="mt-4 text-app-meta font-medium text-[var(--text-primary)]">Note</h3>
            <p className="mt-1 whitespace-pre-wrap text-app-meta leading-[1.55] text-[var(--text-body)]">{app.note || "No note."}</p>
            <h3 className="mt-4 text-app-meta font-medium text-[var(--text-primary)]">Links</h3>
            {app.links.length === 0 ? (
              <p className="mt-1 text-app-meta text-[var(--text-secondary)]">No links.</p>
            ) : (
              <ul className="mt-1 grid gap-1">
                {app.links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noreferrer nofollow" className="break-all text-app-meta text-[var(--text-primary)] underline underline-offset-4">{l}</a>
                  </li>
                ))}
              </ul>
            )}
            {app.reviewId && passport ? (
              <Link href={`/app/employer/passports/${app.reviewId}`} className="mt-4 inline-block text-app-meta font-medium text-[var(--text-primary)] underline underline-offset-4">
                Open their full Passport
              </Link>
            ) : null}
          </Panel>

          <Panel id="invites-heading" title="Work sample invitations">
            {invitations.length === 0 ? (
              <p className="text-app-meta text-[var(--text-secondary)]">None. Invite from a requirement only when its gap remains after the existing evidence.</p>
            ) : (
              <ul className="grid gap-3">
                {invitations.map((i) => (
                  <li key={i.id} className="grid gap-1 rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{i.scenarioTitle}</span>
                      <span className="badge badge-neutral shrink-0">{i.attemptStatus ? ATTEMPT_STATUS[i.attemptStatus] ?? i.attemptStatus : INVITE_STATUS[i.status]}</span>
                    </div>
                    {i.evidenceGap ? <span className="text-[var(--text-secondary)]">For: {reqText(i.evidenceGap.requirementId) ?? i.evidenceGap.requirementText}</span> : null}
                    <span className="text-[var(--text-tertiary)]">Due {formatDeadline(i.expiresAt, i.deadlineTimezone)}</span>
                    <span className="text-[var(--text-tertiary)]">{DELIVERY[i.emailDelivery]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {otherQuestions.length > 0 ? (
            <Panel id="questions-heading" title="Other questions">
              <ul className="grid gap-2">
                {otherQuestions.map((q) => (
                  <li key={q.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
                    <p className="text-[var(--text-tertiary)]">{q.status === "answered" ? "Answered" : q.status === "closed" ? "Closed" : "Waiting for an answer"}</p>
                    <p className="mt-1 font-medium text-[var(--text-primary)]">{q.question}</p>
                    {q.response ? <p className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">{q.response}</p> : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
