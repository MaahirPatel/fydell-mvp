import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportBuilder from "@/components/passport/PassportBuilder";
import PassportView from "@/components/passport/PassportView";
import SharePanel from "@/components/passport/SharePanel";

export const metadata = { title: "Engineering Passport" };
export const dynamic = "force-dynamic";

export default async function CandidatePassportPage({ searchParams }: { searchParams: Promise<{ github?: string; repos?: string }> }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/passport")}`);
  const params = await searchParams;
  const [passport, shares] = await Promise.all([getOwnerPassport(user.id), listShares(user.id)]);
  const initialRepos = (params.repos ?? "").split(",").filter((r) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(r)).slice(0, 3);
  const initialLogin = /^[A-Za-z0-9-]{1,39}$/.test(params.github ?? "") ? (params.github as string) : passport?.githubLogin ?? "";

  return (
    <CandidateShell width="wide" current="passport">
      <div className="reveal">
        <p className="text-app-meta font-medium text-[var(--text-secondary)]">Engineering Passport</p>
        <h1 className="text-app-page mt-1 font-semibold">
          {passport ? "Your work, with the evidence behind it." : "Build your passport from GitHub."}
        </h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
          {passport
            ? "Add or refresh projects, check what each finding cites, and decide who can see it."
            : "Paste your GitHub profile, pick up to three public repositories, and Fydell will cite what your code demonstrates."}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <PassportBuilder signedIn initialLogin={initialLogin} initialRepos={initialRepos} showPreview={false} />
          {passport && passport.projects.length ? <PassportView passport={passport} mode="owner" /> : null}
        </div>
        <aside className="space-y-6">
          {passport && passport.projects.length ? (
            <SharePanel initialShares={shares} />
          ) : (
            <p className="rounded-[10px] border border-dashed border-[var(--border-default)] p-5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Sharing becomes available once your passport has at least one analyzed project.
            </p>
          )}
        </aside>
      </div>
    </CandidateShell>
  );
}
