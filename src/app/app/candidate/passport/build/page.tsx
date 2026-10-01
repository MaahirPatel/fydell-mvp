import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportWizard from "@/components/candidate/PassportWizard";
import { loadCandidateOverview, passportBuilt } from "@/lib/candidate/overview";
import { getOrCreateProfile } from "@/lib/profile/store";
import { isPreviewMode } from "@/lib/dev/preview";
import e from "@/components/candidate/easy.module.css";

export const metadata = { title: "Build your passport" };
export const dynamic = "force-dynamic";

export default async function BuildPassportPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; repos?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/passport/build")}`);

  const params = await searchParams;
  const o = await loadCandidateOverview(user);
  const profile = isPreviewMode()
    ? { displayName: o.name, headline: "", role: "", updatedAt: null }
    : await getOrCreateProfile(user.id, user.email.split("@")[0]);

  // Arriving from sign-up with picks made while signed out: resume the run.
  const initialRepos = (params.repos ?? "").split(",").filter((r) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(r)).slice(0, 3);
  const initialLogin = /^[A-Za-z0-9-]{1,39}$/.test(params.github ?? "") ? (params.github as string) : (o.passport?.githubLogin ?? "");
  const rebuilding = passportBuilt(o.passport);

  return (
    <CandidateShell width="wide" current="passport" userName={o.name}>
      <div className={e.page}>
        <div className={e.hello}>
          <h1 className={e.h1}>{rebuilding ? "Update your passport" : "Build your passport"}</h1>
          <p className={e.lead}>
            {rebuilding
              ? "Add or change projects. Projects you already have stay until you replace them."
              : "Four short steps. Your answers save as you go, and nobody sees anything until you share it."}
          </p>
        </div>
        <PassportWizard signedIn profile={profile} initialLogin={initialLogin} initialRepos={initialRepos} />
      </div>
    </CandidateShell>
  );
}
