import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listShares } from "@/lib/passport/store";
import { listMyApplications } from "@/lib/hiring/applications";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import DeleteAccount from "@/components/account/DeleteAccount";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-[var(--border-default)] pt-6">
      <h2 id={id} className="text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">
        {title}
      </h2>
      {hint ? <p className="mt-0.5 max-w-[64ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function countActive(shares: { revokedAt: string | null; expiresAt: string | null }[]): number {
  const now = Date.now();
  return shares.filter((s) => !s.revokedAt && !(s.expiresAt && Date.parse(s.expiresAt) <= now)).length;
}

const linkButton =
  "inline-flex h-9 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]";

export default async function CandidateSettingsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/settings")}`);

  const [org, shares, applications] = await Promise.all([requireOrgMember(user.id), listShares(user.id), listMyApplications(user.id)]);
  const activeShares = countActive(shares);
  const openApplications = applications.filter((a) => a.status === "submitted").length;

  return (
    <CandidateShell current="settings">
      <header>
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.024em] text-[var(--text-primary)]">Settings</h1>
      </header>

      <div className="mt-10 space-y-10">
        <Section id="account-heading" title="Account">
          <dl className="grid max-w-[60ch] grid-cols-[140px_minmax(0,1fr)] gap-y-2 text-[14px]">
            <dt className="text-[var(--text-tertiary)]">Email</dt>
            <dd className="break-all text-[var(--text-primary)]">{user.email}</dd>
            <dt className="text-[var(--text-tertiary)]">Profile</dt>
            <dd>
              <Link href="/app/candidate/profile" className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                Edit name, headline and handle
              </Link>
            </dd>
          </dl>
        </Section>

        <Section id="sharing-heading" title="Sharing" hint="Employers only see what you share through a link or an application.">
          <p className="text-[14px] text-[var(--text-secondary)]">
            {activeShares ? `${activeShares} active share link${activeShares === 1 ? "" : "s"}` : "No active share links"} ·{" "}
            {openApplications ? `${openApplications} open application${openApplications === 1 ? "" : "s"}` : "no open applications"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/app/candidate/work-record" className={linkButton}>
              Manage share links
            </Link>
            <Link href="/app/candidate/applications" className={linkButton}>
              View applications
            </Link>
          </div>
        </Section>

        <Section id="data-heading" title="Your data" hint="Everything in your Passport, including notes and corrections, as one JSON file.">
          <a href="/api/passport/export" download className={linkButton}>
            Download my Passport
          </a>
        </Section>

        <Section id="delete-heading" title="Delete account">
          {org ? (
            <p className="max-w-[64ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              This account belongs to the {org.organizationName} hiring team. Ask a team admin to remove you, then you can delete it here.
            </p>
          ) : (
            <DeleteAccount openApplications={openApplications} activeShares={activeShares} />
          )}
        </Section>
      </div>
    </CandidateShell>
  );
}
