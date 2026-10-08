import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listShares } from "@/lib/passport/store";
import { listMyApplications } from "@/lib/hiring/applications";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { SHARE_HREF } from "@/components/candidate/nav";
import { ButtonLink } from "@/components/ui/Button";
import DeleteAccount from "@/components/account/DeleteAccount";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function Group({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        {title}
      </h2>
      {hint ? <p className="mt-0.5 max-w-[68ch] text-[13px] leading-[1.55] text-[var(--text-secondary)]">{hint}</p> : null}
      <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">{children}</div>
    </section>
  );
}

function Row({ label, detail, children }: { label: string; detail?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[var(--text-primary)]">{label}</p>
        {detail ? <p className="mt-px break-words text-[13px] text-[var(--text-secondary)]">{detail}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

function countActive(shares: { revokedAt: string | null; expiresAt: string | null }[]): number {
  const now = Date.now();
  return shares.filter((s) => !s.revokedAt && !(s.expiresAt && Date.parse(s.expiresAt) <= now)).length;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function CandidateSettingsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/settings")}`);

  const [org, shares, applications] = await Promise.all([requireOrgMember(user.id), listShares(user.id), listMyApplications(user.id)]);
  const activeShares = countActive(shares);
  const openApplications = applications.filter((a) => a.status === "submitted").length;

  return (
    <CandidateShell current="settings">
      <CandidatePageHead title="Settings" lead="Your account, who can see your work, and your data." />

      <div className="mt-8 grid gap-8">
        <Group id="account-heading" title="Account">
          <Row label="Email" detail={user.email} />
          <Row label="Profile" detail="Name, photo, headline, handle and links">
            <ButtonLink href="/app/candidate/profile" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
          </Row>
        </Group>

        <Group id="sharing-heading" title="Sharing" hint="Employers only see what you share through a link or an application.">
          <Row label="Share links" detail={activeShares ? `${plural(activeShares, "active link")}` : "No active links"}>
            <ButtonLink href={SHARE_HREF} variant="secondary" size="sm">
              Manage links
            </ButtonLink>
          </Row>
          <Row label="Applications" detail={openApplications ? `${plural(openApplications, "open application")}` : "No open applications"}>
            <ButtonLink href="/app/candidate/applications" variant="secondary" size="sm">
              View applications
            </ButtonLink>
          </Row>
        </Group>

        <Group id="data-heading" title="Your data">
          <Row label="Download my Passport" detail="Everything in your Passport, including notes and corrections, as one JSON file.">
            <a
              href="/api/passport/export"
              download
              className="inline-flex h-8 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-meta font-medium text-[var(--text-primary)] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              Download
            </a>
          </Row>
        </Group>

        <Group id="delete-heading" title="Delete account">
          <div className="px-4 py-4">
            {org ? (
              <p className="max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                This account belongs to the {org.organizationName} hiring team. Ask a team admin to remove you, then you can delete it here.
              </p>
            ) : (
              <DeleteAccount openApplications={openApplications} activeShares={activeShares} />
            )}
          </div>
        </Group>
      </div>
    </CandidateShell>
  );
}
