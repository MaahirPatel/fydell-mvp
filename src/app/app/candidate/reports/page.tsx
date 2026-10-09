import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport } from "@/lib/passport/store";
import { getAnalysis, latestAnalysis, latestCompleteReport } from "@/lib/builder-analysis/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import BuilderAnalysisView from "@/components/passport/BuilderAnalysisView";

export const metadata = { title: "Builder Analysis" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/reports")}`);
  const { run } = await searchParams;
  const [passport, analysis, lastReport, opened] = await Promise.all([
    getOwnerPassport(user.id),
    latestAnalysis(user.id),
    latestCompleteReport(user.id),
    run ? getAnalysis(user.id, run) : Promise.resolve(null),
  ]);
  const hasSources = !!passport?.githubLogin || (passport?.projects.length ?? 0) > 0;
  const viewing = opened?.status === "complete" && opened.report && opened.report.generatedAt !== lastReport?.generatedAt ? opened : null;

  return (
    <CandidateShell width="wide" current="work">
      <CandidatePageHead
        title="Builder Analysis"
        lead="One report across all your projects: what each piece of work shows, where evidence is thin, and concrete next steps. Private to you."
      />
      <div className="mt-8">
        <BuilderAnalysisView initial={analysis} lastReport={lastReport} hasSources={hasSources} viewing={viewing} />
      </div>
    </CandidateShell>
  );
}
