import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport } from "@/lib/passport/store";
import { latestAnalysis, latestCompleteReport } from "@/lib/builder-analysis/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import BuilderAnalysisView from "@/components/passport/BuilderAnalysisView";

export const metadata = { title: "Builder Analysis" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/reports")}`);
  const [passport, analysis, lastReport] = await Promise.all([getOwnerPassport(user.id), latestAnalysis(user.id), latestCompleteReport(user.id)]);
  const hasSources = !!passport?.githubLogin || (passport?.projects.length ?? 0) > 0;

  return (
    <CandidateShell width="wide" current="work">
      <CandidatePageHead
        title="Builder Analysis"
        lead="One report across all your projects: the practices that repeat, where evidence is thin, and concrete next steps. Private to you."
      />
      <div className="mt-8">
        <BuilderAnalysisView initial={analysis} lastReport={lastReport} hasSources={hasSources} />
      </div>
    </CandidateShell>
  );
}
