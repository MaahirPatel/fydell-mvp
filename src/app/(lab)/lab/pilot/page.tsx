import { GoldenPathPilot } from "@/components/simulations/golden-path/GoldenPathPilot";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";

export default function PilotGoldenPathPage() {
  if (!isSimEngineEnabled()) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">
        Simulation engine lab is disabled. Set SIM_ENGINE_ENABLED=1.
      </div>
    );
  }

  return <GoldenPathPilot />;
}
