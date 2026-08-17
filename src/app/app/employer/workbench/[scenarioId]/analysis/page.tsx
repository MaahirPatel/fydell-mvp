import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScenarioAnalysisHost } from "@/components/simulations/hosts/ScenarioAnalysisHost";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);
  return { title: scenario ? `${scenario.metadata.title} analysis` : "Analysis" };
}

export default async function WorkspaceSimulationAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ attempt?: string; fixture?: string }>;
}) {
  const { scenarioId } = await params;
  const sp = await searchParams;

  const user = await requireUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/app/employer/workbench/${scenarioId}/analysis`
      )}`
    );
  }
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  if (!isSimEngineEnabled()) redirect("/app/employer/workbench");

  const scenario = getScenario(scenarioId);
  if (!scenario) notFound();

  return (
    <div>
      <PageHeader
        title="Analysis"
        description="What the engine observed, what it inferred from those observations, and where the evidence was not sufficient to conclude anything."
        meta={
          <Link
            href={`/app/employer/workbench/${scenarioId}`}
            className="text-app-body font-medium text-[var(--text-primary)] hover:underline"
          >
            {scenario.metadata.title}
          </Link>
        }
      />
      <div className="mt-7">
        <ScenarioAnalysisHost
          scenarioId={scenarioId}
          attemptId={sp.attempt}
          fixture={sp.fixture}
        />
      </div>
    </div>
  );
}
