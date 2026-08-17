import { LabSimHost } from "./LabSimHost";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";

export default async function LabSimPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;

  if (!isSimEngineEnabled()) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">
        Simulation engine lab is disabled. Set SIM_ENGINE_ENABLED=1.
      </div>
    );
  }

  return <LabSimHost scenarioId={scenarioId} />;
}
