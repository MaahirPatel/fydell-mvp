import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { loadDesk } from "@/lib/desk/data";
import { getOwnerPassport } from "@/lib/passport/store";
import { latestAnalysis, latestCompleteReport } from "@/lib/builder-analysis/store";
import BuilderAnalysisView from "@/components/passport/BuilderAnalysisView";
import { DeskSection, TaskList } from "@/components/desk/DeskLists";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function DeskReportsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Fdesk%2Freports");
  const [{ tasks }, passport, analysis, lastReport] = await Promise.all([
    loadDesk(user),
    getOwnerPassport(user.id),
    latestAnalysis(user.id),
    latestCompleteReport(user.id),
  ]);
  const submitted = tasks.filter((t) => !t.open);
  const hasSources = !!passport?.githubLogin || (passport?.projects.length ?? 0) > 0;

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-app-page text-[var(--text-primary)]">Reports</h1>
        <p className="mt-1 text-app-body text-[var(--text-secondary)]">Reports from simulations you submitted, and your Builder Analysis across all your projects.</p>
      </div>

      <DeskSection title="Simulation reports" count={submitted.length}>
        {submitted.length === 0 ? (
          <p className="text-app-body text-[var(--text-secondary)]">
            When you submit a simulation, it appears here, and its report opens once the hiring team releases it.{" "}
            <Link href="/app/candidate/practice" className="font-medium text-[var(--text-primary)] underline underline-offset-4">
              Try the practice simulation
            </Link>
            .
          </p>
        ) : (
          <TaskList tasks={submitted} />
        )}
      </DeskSection>

      <DeskSection title="Builder Analysis">
        <p className="-mt-1 text-app-meta text-[var(--text-secondary)]">
          One report across all your projects: what each piece of work shows, where evidence is thin, and concrete next steps. Private to you.
        </p>
        <BuilderAnalysisView initial={analysis} lastReport={lastReport} hasSources={hasSources} viewing={null} />
      </DeskSection>
    </div>
  );
}
