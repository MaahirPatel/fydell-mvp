import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getMyApplication } from "@/lib/hiring/applications";
import { ROLE_STATE_LABEL } from "@/lib/hiring/role-contract";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { FormSuccess } from "@/components/ui/Field";
import WithdrawButton from "@/components/hiring/WithdrawButton";
import EvidenceSnapshotView from "@/components/evidence/EvidenceSnapshotView";
import StopSharingButton from "@/components/evidence/StopSharingButton";
import AnswerQuestions from "@/components/evidence/AnswerQuestions";
import { LocalDate, LocalTime } from "@/components/eng/LocalTime";
import { getApplicationEvidenceForApplicant, listApplicationQuestionsForApplicant } from "@/lib/profile-evidence/applications";
import { evidenceStatus } from "@/lib/profile-evidence/store";

export const metadata = { title: "Application receipt" };
export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-[var(--border-subtle)] py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[13px] font-medium text-[var(--text-tertiary)]">{label}</dt>
      <dd className="min-w-0 text-[14px] leading-[1.55] text-[var(--text-body)]">{children}</dd>
    </div>
  );
}

export default async function ApplicationReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; already?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/candidate/applications/${id}`)}`);
  const app = await getMyApplication(user.id, id);
  if (!app) notFound();
  const withdrawn = app.status === "withdrawn";
  const [pinned, questions] = await Promise.all([getApplicationEvidenceForApplicant(user.id, app.id), listApplicationQuestionsForApplicant(user.id, app.id)]);
  const pinnedItems = pinned ?? [];
  const statuses = await Promise.all(pinnedItems.map((p) => (p.revokedAt || withdrawn ? null : evidenceStatus(user.id, p.projectKey).catch(() => null))));
  const changedSinceSent = new Set(
    pinnedItems.flatMap((p, i) => {
      const s = statuses[i];
      if (!s) return [];
      const sentHash = s.versions.find((v) => v.id === p.versionId)?.contentHash ?? null;
      const currentHash = s.versions.find((v) => v.version === s.currentVersion)?.contentHash ?? null;
      return sentHash && sentHash !== currentHash ? [p.versionId] : [];
    }),
  );
  const titles = Object.fromEntries(pinnedItems.flatMap((p) => (p.content ? [[p.versionId, p.content.title] as const] : [])));

  return (
    <CandidateShell current="applications" width="narrow" crumbs={[{ label: app.roleTitle }]}>
      {sp.sent === "1" && !withdrawn ? (
        <div className="mb-5"><FormSuccess>Application sent. {app.organizationName} has been notified.</FormSuccess></div>
      ) : null}
      {sp.already === "1" && !withdrawn ? (
        <p role="status" className="mb-5 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-app-meta text-[var(--text-body)]">
          You&apos;ve already applied to this role. To change what you sent, withdraw this application and apply again.
        </p>
      ) : null}

      <CandidatePageHead title={app.roleTitle} lead={`${app.organizationName} · Application receipt`} />

      <dl className="mt-6">
        <Row label="Status">
          {withdrawn ? (
            <>Withdrawn{app.withdrawnAt ? <> <LocalTime iso={app.withdrawnAt} /></> : null}</>
          ) : app.waitingOnYou ? (
            <a href="#questions" className="underline underline-offset-4">The team is waiting on an answer from you. Reply to their questions below.</a>
          ) : (
            "Sent. The team reviews applications themselves; Fydell doesn't rank or filter them."
          )}
        </Row>
        <Row label="Sent"><LocalTime iso={app.submittedAt} /></Row>
        <Row label="Role">
          {ROLE_STATE_LABEL[app.roleState]}
          {app.roleSlug ? (
            <>
              {" · "}
              <Link href={`/jobs/${app.roleSlug}`} className="underline underline-offset-4">View role page</Link>
            </>
          ) : null}
        </Row>
        <Row label="Projects shared">
          {pinnedItems.length > 0 ? (
            <>
              <ol className="grid gap-3">
                {pinnedItems.map((p) => (
                  <li key={p.versionId} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">
                      {p.position + 1}. {p.content?.title ?? p.projectKey}
                    </p>
                    <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
                      Version {p.version}, prepared <LocalDate iso={p.publishedAt} />
                      {p.revokedAt ? <>. You stopped sharing it on <LocalDate iso={p.revokedAt} />.</> : ""}
                    </p>
                    {changedSinceSent.has(p.versionId) ? (
                      <p className="mt-2 rounded-[6px] bg-[var(--surface-panel)] px-3 py-2 text-app-meta text-[var(--text-body)]">
                        This project has changed in your profile since you sent it, for example after a newer analysis. {app.organizationName} still sees version {p.version}.{" "}
                        {app.roleState === "open"
                          ? "To send the current version, withdraw this application and apply again."
                          : "The role is no longer open, so this application keeps the version you sent."}
                      </p>
                    ) : null}
                    {p.content ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-app-meta text-[var(--text-secondary)]">Preview what the team sees</summary>
                        <div className="mt-3">
                          <EvidenceSnapshotView content={p.content} version={p.version} publishedAt={p.publishedAt} headingLevel={3} />
                        </div>
                      </details>
                    ) : null}
                    {!p.revokedAt && !withdrawn ? (
                      <div className="mt-2">
                        <StopSharingButton applicationId={app.id} versionId={p.versionId} title={p.content?.title ?? "this project"} organizationName={app.organizationName} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-app-meta text-[var(--text-secondary)]">
                Each project is fixed at the version you sent. Editing your profile later does not change what this team sees.
              </p>
            </>
          ) : app.sharedProjects.length === 0 ? (
            "None"
          ) : (
            <>
              <ul className="grid gap-1">
                {app.sharedProjects.map((r) => (
                  <li key={r} className="font-mono text-app-meta">{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-app-meta text-[var(--text-secondary)]">
                {app.shareActive
                  ? "Shared at the version you sent. Re-importing a project doesn't change what this team sees."
                  : "The team no longer has access to these projects."}
              </p>
            </>
          )}
        </Row>
        {app.links.length > 0 ? (
          <Row label="Links">
            <ul className="grid gap-1">
              {app.links.map((l) => (
                <li key={l} className="break-all text-app-meta">{l}</li>
              ))}
            </ul>
          </Row>
        ) : null}
        {app.note ? (
          <Row label="Note">
            <p className="whitespace-pre-wrap">{app.note}</p>
          </Row>
        ) : null}
        {app.required.length > 0 ? (
          <Row label="Requirements you applied to">
            <ul className="grid gap-1 text-app-meta">
              {app.required.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">Version {app.requirementsVersion}. Kept as you saw them, even if the team edits the role.</p>
          </Row>
        ) : null}
      </dl>

      <section id="questions" className="mt-6 scroll-mt-20 border-t border-[var(--border-subtle)] pt-6" aria-labelledby="questions-heading">
        <h2 id="questions-heading" className="text-[15px] font-semibold text-[var(--text-primary)]">Questions from {app.organizationName}</h2>
        <div className="mt-3">
          <AnswerQuestions initial={questions} titles={titles} withdrawn={withdrawn} />
        </div>
      </section>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
        {withdrawn ? (
          <p className="text-app-meta text-[var(--text-secondary)]">
            This application is withdrawn.{" "}
            {app.roleState === "open" && app.roleSlug ? (
              <Link href={`/jobs/${app.roleSlug}/apply`} className="text-[var(--text-primary)] underline underline-offset-4">Apply again</Link>
            ) : null}
          </p>
        ) : (
          <WithdrawButton applicationId={app.id} organizationName={app.organizationName} />
        )}
      </div>
    </CandidateShell>
  );
}
