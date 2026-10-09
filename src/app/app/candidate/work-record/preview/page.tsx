import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getSharePreview } from "@/lib/profile/store";
import { getOwnerPassport } from "@/lib/passport/store";
import { getPresentations } from "@/lib/passport/presentation-store";
import { shareableProjectKeys } from "@/lib/profile-evidence/store";
import { SHAREABLE_FIELDS } from "@/lib/passport/view";
import { profileReportsForSnapshots } from "@/lib/passport/capability/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportView from "@/components/passport/PassportView";
import ProfileOverview from "@/components/profile/ProfileOverview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recipient preview", robots: { index: false, follow: false } };

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 50);
}

type Blocker = { repo: string; reason: string; action: string; href: string };

/** Why each project is left out of a share link, with the page that fixes it. */
async function shareBlockers(ownerId: string): Promise<Blocker[]> {
  const passport = await getOwnerPassport(ownerId);
  const projects = (passport?.projects ?? []).filter((p) => p.status !== "stale");
  if (!projects.length) return [];
  const [presentations, confirmed] = await Promise.all([getPresentations(ownerId, projects), shareableProjectKeys(ownerId, undefined)]);
  const hidden = new Set(presentations.filter((p) => p.visibility === "private").map((p) => p.projectKey.toLowerCase()));
  const ok = new Set(confirmed.map((k) => k.toLowerCase()));
  return projects
    .filter((p) => !ok.has(p.repoFullName.toLowerCase()))
    .map((p) => {
      const page = p.id ? `/app/candidate/projects/${p.id}` : "/app/candidate/work-record#showcase";
      return hidden.has(p.repoFullName.toLowerCase())
        ? { repo: p.repoFullName, reason: "Private: hidden from your profile.", action: "Show on profile", href: "/app/candidate/work-record#showcase" }
        : { repo: p.repoFullName, reason: "Your contribution is not confirmed yet.", action: "Confirm contribution", href: p.id ? `${page}#evidence-version-heading` : page };
    });
}

/**
 * Exactly what a share link with these settings would show, rendered through
 * the same assembly as /p/[token]. Owner-only; nothing is created.
 */
export default async function SharePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fields?: string; repos?: string; policy?: string; label?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/work-record")}`);
  const params = await searchParams;
  // Opened without settings, preview the default share: every shareable project with all sections.
  const fields = params.fields === undefined ? [...SHAREABLE_FIELDS] : list(params.fields);
  const repos = await shareableProjectKeys(user.id, params.repos === undefined ? undefined : list(params.repos));
  const preview = await getSharePreview(user.id, fields.includes("projects") ? fields : ["projects", ...fields], {
    repos,
    versionPolicy: params.policy === "follow" ? "follow" : "pinned",
    label: (params.label ?? "").slice(0, 80),
  });

  const shownProjects = (preview?.passport.projects ?? []).filter((p) => p.status !== "stale");
  const reports = await profileReportsForSnapshots(shownProjects.filter((p) => p.evidence.length).map((p) => p.id).filter((id): id is string => !!id));
  const empty = !preview || (preview.passport.projects.length === 0 && !preview.passport.presentations?.length);
  const blockers = empty ? await shareBlockers(user.id) : [];

  return (
    <CandidateShell width="wide" current={empty ? "work" : undefined} crumbs={empty ? [{ label: "Recipient preview" }] : undefined}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
        <p className="text-[15px] text-[var(--text-body)]">
          <span className="font-semibold text-[var(--text-primary)]">Recipient preview.</span> This is what someone with the link will see. No link has been
          created.
        </p>
        <Link href="/app/candidate/work-record#share" className="text-[14px] font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">
          Back to sharing
        </Link>
      </div>
      {empty ? (
        <section aria-labelledby="preview-empty" className="max-w-[720px] rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
          <h1 id="preview-empty" className="text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">
            Nothing would be shared yet
          </h1>
          <p className="mt-1 text-app-body leading-[1.6] text-[var(--text-secondary)]">
            A share link shows only projects that are visible on your profile and whose contribution you have confirmed. Fix one of these and the preview fills
            in.
          </p>
          {blockers.length ? (
            <ul className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {blockers.map((b) => (
                <li key={b.repo} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-[13px] text-[var(--text-primary)]">{b.repo}</p>
                    <p className="mt-0.5 text-app-meta text-[var(--text-secondary)]">{b.reason}</p>
                  </div>
                  <Link href={b.href} className="l-btn l-btn-quiet h-8 px-3 text-[13px]">
                    {b.action}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-app-body text-[var(--text-secondary)]">You have no projects yet.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/app/candidate/work-record#add-repository" className="l-btn l-btn-solid h-9 px-4 text-[14px]">
              Add a project
            </Link>
            <Link href="/app/candidate/work-record#share" className="l-btn l-btn-quiet h-9 px-4 text-[14px]">
              Back to sharing
            </Link>
          </div>
        </section>
      ) : (
        <>
          <ProfileOverview
            profile={preview.profile}
            accounts={preview.accounts}
            projects={shownProjects}
            presentations={preview.passport.presentations}
            capabilityGroups={reports.groups}
            projectDigests={reports.digests}
            capabilities={preview.passport.capabilities}
            roleSuggestions={preview.passport.roleSuggestions}
            timeline={preview.timeline}
            mode="shared"
          />
          <section className="mt-14 border-t border-[var(--border-default)] pt-10">
            <PassportView passport={preview.passport} mode="shared" />
          </section>
        </>
      )}
    </CandidateShell>
  );
}
