import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import OwnerProfile from "@/components/profile/OwnerProfile";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

/**
 * Old links pointed at this route with repository-import parameters; those
 * belong to the work record now.
 */
export default async function CandidateProfilePage({ searchParams }: { searchParams: Promise<{ github?: string; repos?: string }> }) {
  const params = await searchParams;
  if (params.github || params.repos) {
    const q = new URLSearchParams();
    if (params.github) q.set("github", params.github);
    if (params.repos) q.set("repos", params.repos);
    redirect(`/app/candidate/work-record?${q.toString()}`);
  }

  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/profile")}`);

  return (
    <CandidateShell width="wide" current="profile">
      <OwnerProfile user={user} />
    </CandidateShell>
  );
}
