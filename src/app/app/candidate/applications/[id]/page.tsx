import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getMyApplication } from "@/lib/hiring/applications";
import { ROLE_STATE_LABEL } from "@/lib/hiring/role-contract";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { FormSuccess } from "@/components/ui/Field";
import WithdrawButton from "@/components/hiring/WithdrawButton";

export const metadata = { title: "Application receipt" };
export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-[var(--border-subtle)] py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-app-meta font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 text-app-body text-[var(--text-body)]">{children}</dd>
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

  return (
    <CandidateShell current="applications" width="narrow">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/candidate/applications" className="hover:underline">Applications</Link> / Receipt
      </p>
      {sp.sent === "1" && !withdrawn ? (
        <div className="mt-4"><FormSuccess>Application sent. {app.organizationName} has been notified.</FormSuccess></div>
      ) : null}
      {sp.already === "1" && !withdrawn ? (
        <p role="status" className="mt-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-app-meta text-[var(--text-body)]">
          You&apos;ve already applied to this role. To change what you sent, withdraw this application and apply again.
        </p>
      ) : null}

      <h1 className="mt-6 text-app-page text-[var(--text-primary)]">{app.roleTitle}</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">{app.organizationName}</p>

      <dl className="mt-8">
        <Row label="Status">
          {withdrawn
            ? `Withdrawn ${app.withdrawnAt ? new Date(app.withdrawnAt).toLocaleString() : ""}`
            : app.waitingOnYou
              ? "The team is waiting on a reply from you. Check your email or your questions on the Passport page."
              : "Sent. The team reviews applications themselves; Fydell doesn't rank or filter them."}
        </Row>
        <Row label="Sent">{new Date(app.submittedAt).toLocaleString()}</Row>
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
          {app.sharedProjects.length === 0 ? (
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
