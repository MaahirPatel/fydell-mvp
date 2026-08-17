import { LabAnalysisHost } from "./LabAnalysisHost";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";

export default async function LabAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ attempt?: string; fixture?: string }>;
}) {
  const { scenarioId } = await params;
  const sp = await searchParams;

  if (!isSimEngineEnabled()) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">
        Simulation engine lab is disabled. Set SIM_ENGINE_ENABLED=1.
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-canvas)]">
      <LabAnalysisHost scenarioId={scenarioId} attemptId={sp.attempt} fixture={sp.fixture} />
    </div>
  );
}
