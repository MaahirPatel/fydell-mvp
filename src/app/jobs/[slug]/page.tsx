import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/ui/Button";
import { getPublicRole } from "@/lib/hiring/roles";
import { REMOTE_LABEL } from "@/lib/hiring/role-contract";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const role = await getPublicRole(slug);
  if (!role) return { title: "Role not found", robots: { index: false } };
  return {
    title: `${role.title} at ${role.organizationName}`,
    description: role.description.slice(0, 160),
    robots: { index: false },
  };
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--border-subtle)] py-8">
      <h2 className="text-[17px] font-medium tracking-[-0.01em] text-[var(--text-primary)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function PublicRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = await getPublicRole(slug);
  if (!role) notFound();
  const facts = [
    role.seniority,
    role.employmentType,
    role.location,
    role.remotePolicy ? REMOTE_LABEL[role.remotePolicy] : "",
  ].filter(Boolean);
  const applyHref = `/jobs/${role.slug}/apply`;

  return (
    <MarketingShell>
      <article className="mx-auto max-w-[760px] px-6 pb-24 pt-32 md:pt-36">
        <p className="text-[14px] text-[var(--text-secondary)]">{role.organizationName}</p>
        <h1 className="mt-2 text-[clamp(2rem,4.5vw,2.75rem)] font-normal leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)]">{role.title}</h1>
        {facts.length > 0 ? <p className="mt-3 text-[15px] text-[var(--text-secondary)]">{facts.join(" · ")}</p> : null}
        {role.compensation ? <p className="mt-1 text-[15px] text-[var(--text-primary)]">{role.compensation}</p> : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {role.accepting ? (
            <>
              <ButtonLink href={applyHref} variant="primary" size="cta" shape="pill">
                Apply with your Passport
              </ButtonLink>
              <p className="text-[14px] text-[var(--text-secondary)]">
                {role.applicationDeadline ? `Applications close ${new Date(`${role.applicationDeadline}T12:00:00Z`).toLocaleDateString(undefined, { dateStyle: "long" })}.` : "You choose what to share before anything is sent."}
              </p>
            </>
          ) : (
            <p role="status" className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-[15px] text-[var(--text-body)]">
              {role.closedReason}
            </p>
          )}
        </div>

        <div className="mt-12">
          {role.description ? (
            <Block title="The work">
              <p className="whitespace-pre-wrap text-[16px] leading-[1.65] text-[var(--text-body)]">{role.description}</p>
            </Block>
          ) : null}
          {role.required.length > 0 ? (
            <Block title="What the team needs to see">
              <ul className="grid gap-2 text-[16px] leading-[1.6] text-[var(--text-body)]">
                {role.required.map((r) => (
                  <li key={r} className="flex gap-3">
                    <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                Reviewers look for evidence of each of these in what you share. It&apos;s fine if your work shows some and not others.
              </p>
            </Block>
          ) : null}
          {role.preferred.length > 0 ? (
            <Block title="Also useful">
              <ul className="grid gap-2 text-[16px] leading-[1.6] text-[var(--text-body)]">
                {role.preferred.map((r) => (
                  <li key={r} className="flex gap-3">
                    <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
                    {r}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
          {role.hiringSteps.length > 0 || role.expectedEffort ? (
            <Block title="What happens after you apply">
              {role.hiringSteps.length > 0 ? (
                <ol className="grid list-decimal gap-2 pl-5 text-[16px] leading-[1.6] text-[var(--text-body)]">
                  {role.hiringSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              ) : null}
              {role.expectedEffort ? <p className="mt-3 text-[15px] text-[var(--text-secondary)]">Expected effort: {role.expectedEffort}</p> : null}
            </Block>
          ) : null}
          <Block title="How applying works">
            <p className="text-[16px] leading-[1.65] text-[var(--text-body)]">
              You sign in, choose which Passport projects to include, and can add links or a short note. The team sees only what you select, at the version you sent. You can withdraw at any time, which stops their access to the projects you shared.
            </p>
            {role.contactEmail ? (
              <p className="mt-3 text-[15px] text-[var(--text-secondary)]">
                Questions about the role: <a href={`mailto:${role.contactEmail}`} className="text-[var(--text-primary)] underline underline-offset-4">{role.contactEmail}</a>
              </p>
            ) : null}
          </Block>
        </div>

        <p className="mt-6 text-[13px] text-[var(--text-tertiary)]">
          Published by {role.organizationName} on Fydell. {" "}
          <Link href="/how-it-works" className="underline underline-offset-4 hover:text-[var(--text-secondary)]">How Fydell works</Link>
        </p>
      </article>
    </MarketingShell>
  );
}
