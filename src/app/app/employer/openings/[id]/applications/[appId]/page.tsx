import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { orgCan } from "@/lib/orgs/capabilities";
import { getApplicationForOrg } from "@/lib/hiring/applications";
import { STAGE_LABEL } from "@/lib/hiring/role-contract";
import { PageHeader } from "@/components/ui/PageHeader";
import StageSelect from "@/components/hiring/StageSelect";

export const metadata = { title: "Application" };
export const dynamic = "force-dynamic";

/** Applications sent without Passport projects: the note and links are the evidence. */
export default async function EmployerApplicationPage({ params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/openings/${id}/applications/${appId}`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const app = await getApplicationForOrg(org.organizationId, appId);
  if (!app || app.roleId !== id) notFound();
  if (app.reviewId) redirect(`/app/employer/passports/${app.reviewId}`);

  return (
    <div className="max-w-[760px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> /{" "}
        <Link href={`/app/employer/openings/${id}`} className="hover:underline">{app.snapshot.title}</Link> / {app.name}
      </p>
      <PageHeader
        className="mt-4"
        title={app.name}
        description={`${app.email} · Applied ${new Date(app.submittedAt).toLocaleDateString()}${app.status === "withdrawn" ? " · Withdrawn" : ""}`}
        action={
          orgCan(org.role, "record_decisions") && app.status === "submitted" ? (
            <StageSelect applicationId={app.id} stage={app.stage} applicantName={app.name} />
          ) : (
            <span className="badge badge-neutral">{STAGE_LABEL[app.stage]}</span>
          )
        }
      />
      <p className="mt-6 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-app-meta text-[var(--text-body)]">
        This applicant didn&apos;t include Passport projects, so there are no Builder Reports to review. What they sent is below.
      </p>
      <section className="mt-6" aria-labelledby="note-heading">
        <h2 id="note-heading" className="text-app-section text-[var(--text-primary)]">Note</h2>
        <p className="mt-2 whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{app.note || "No note."}</p>
      </section>
      <section className="mt-6" aria-labelledby="links-heading">
        <h2 id="links-heading" className="text-app-section text-[var(--text-primary)]">Links</h2>
        {app.links.length === 0 ? (
          <p className="mt-2 text-app-body text-[var(--text-secondary)]">No links.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {app.links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noreferrer nofollow" className="break-all text-app-body text-[var(--text-primary)] underline underline-offset-4">{l}</a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">Links open the applicant&apos;s own pages. Fydell hasn&apos;t checked what they contain.</p>
      </section>
    </div>
  );
}
