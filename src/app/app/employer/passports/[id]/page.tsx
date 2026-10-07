import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getReview } from "@/lib/passport/store";
import { listRoles } from "@/lib/hiring/roles";
import { applicationForReview } from "@/lib/hiring/applications";
import PassportView from "@/components/passport/PassportView";
import PassportDecisionPanel from "@/components/employer/PassportDecisionPanel";
import RoleReviewSection from "@/components/employer/RoleReviewSection";

export const metadata = { title: "Passport review" };
export const dynamic = "force-dynamic";

export default async function EmployerPassportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/passports/${id}`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [review, roles, application] = await Promise.all([
    getReview(org.organizationId, id),
    listRoles(org.organizationId),
    applicationForReview(org.organizationId, id),
  ]);
  if (!review) notFound();

  const allEvidence = (review.passport?.projects ?? []).flatMap((p) => p.evidence);
  const candidateName = application?.name || review.passport?.displayName || review.passport?.githubLogin || "Candidate";
  const roleOptions = roles.filter((r) => r.state !== "draft").map((r) => ({ id: r.id, title: r.title, required: r.required }));
  const currentRole = application ? roles.find((r) => r.id === application.roleId) : undefined;

  return (
    <div>
      <p className="text-app-meta text-[var(--text-tertiary)]">
        {application ? (
          <>
            <Link href="/app/employer/openings" className="hover:underline">Roles</Link> /{" "}
            <Link href={`/app/employer/openings/${application.roleId}`} className="hover:underline">{application.snapshot.title}</Link> / {candidateName}
          </>
        ) : (
          <>
            <Link href="/app/employer/passports" className="hover:underline">Reviews</Link> / {review.roleTitle || "No role set"}
          </>
        )}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {application ? (
            <section className="mb-6 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5" aria-labelledby="application-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="application-heading" className="text-app-section text-[var(--text-primary)]">Application from {application.name}</h2>
                <p className="text-app-meta text-[var(--text-tertiary)]">
                  {application.status === "withdrawn" ? "Withdrawn · " : ""}Applied {new Date(application.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
                {application.email}
                {currentRole && currentRole.requirementsVersion !== application.snapshot.requirementsVersion
                  ? ` · Applied against requirements version ${application.snapshot.requirementsVersion}; the role is now on version ${currentRole.requirementsVersion}.`
                  : ""}
              </p>
              {application.note ? <p className="mt-3 whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{application.note}</p> : null}
              {application.links.length > 0 ? (
                <ul className="mt-3 grid gap-1">
                  {application.links.map((l) => (
                    <li key={l}>
                      <a href={l} target="_blank" rel="noreferrer nofollow" className="break-all text-app-meta text-[var(--text-primary)] underline underline-offset-4">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          {review.passport ? (
            <PassportView passport={review.passport} mode="employer" />
          ) : (
            <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
              <h1 className="text-app-section font-medium">{application?.status === "withdrawn" ? "The applicant withdrew" : "The candidate revoked this link"}</h1>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                Their Passport is no longer visible to your workspace. Your decision and notes are kept here.
              </p>
            </div>
          )}
          {review.passport && (
            <RoleReviewSection
              shareId={review.shareId}
              candidateName={candidateName}
              evidence={allEvidence}
              roles={roleOptions}
              initialRoleId={application?.roleId ?? null}
            />
          )}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <PassportDecisionPanel reviewId={review.id} initialDecision={review.decision} initialNote={review.privateNote} decidedAt={review.decidedAt} />
          {review.passport ? (
            <Link
              href={`/app/employer/passports/${review.id}/brief`}
              className="flex items-center justify-between rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              Decision brief
              <span className="text-[13px] font-normal text-[var(--text-tertiary)]">Print or export</span>
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
