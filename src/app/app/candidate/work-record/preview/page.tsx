import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getSharePreview } from "@/lib/profile/store";
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
  const fields = list(params.fields);
  const repos = list(params.repos);
  const preview = await getSharePreview(user.id, fields.includes("projects") ? fields : ["projects", ...fields], {
    repos,
    versionPolicy: params.policy === "follow" ? "follow" : "pinned",
    label: (params.label ?? "").slice(0, 80),
  });

  return (
    <CandidateShell width="wide">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
        <p className="text-[15px] text-[var(--text-body)]">
          <span className="font-semibold text-[var(--text-primary)]">Recipient preview.</span> This is what someone with the link will see. No link has been
          created.
        </p>
        <Link href="/app/candidate/work-record#share" className="text-[14px] font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">
          Back to sharing
        </Link>
      </div>
      {!preview || (preview.passport.projects.length === 0 && !preview.passport.presentations?.length) ? (
        <p className="text-[15px] text-[var(--text-secondary)]">Nothing would be shared with these settings. Choose at least one project that is not private.</p>
      ) : (
        <>
          <ProfileOverview
            profile={preview.profile}
            accounts={preview.accounts}
            projects={preview.passport.projects.filter((p) => p.status !== "stale")}
            presentations={preview.passport.presentations}
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
