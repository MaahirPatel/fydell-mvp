import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { ScenarioWorkbenchHost } from "@/components/simulations/hosts/ScenarioWorkbenchHost";
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
  return { title: scenario ? scenario.metadata.title : "Simulation" };
}

export default async function WorkspaceSimulationPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const user = await requireUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/app/employer/workbench/${scenarioId}`)}`
    );
  }
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  if (!isSimEngineEnabled()) redirect("/app/employer/workbench");

  const scenario = getScenario(scenarioId);
  if (!scenario) notFound();

  return (
    /* The workbench is a work environment rather than a document, so it takes
       the whole canvas beside the rail and manages its own scroll regions. The
       workbench command bar is the only bar: the rail already says where you
       are, so a breadcrumb strip above it would repeat the title twice. */
    <div className="h-[100dvh] min-h-[560px]">
      <ScenarioWorkbenchHost
        scenarioId={scenarioId}
        chrome={{
          back: { href: "/app/employer/workbench", label: "Simulations" },
          links: [
            {
              href: `/app/employer/workbench/${scenarioId}/analysis`,
              label: "Analysis",
            },
          ],
          note: "Your attempt. Not recorded against a candidate.",
        }}
      />
    </div>
  );
}
