import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";
import { listScenarios } from "@/lib/sim-engine/scenarios/catalog";
import { ROLE_DISPLAY } from "@/lib/sim-engine/types/roles";
import Link from "next/link";

export default function LabSimIndexPage() {
  if (!isSimEngineEnabled()) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">
        Simulation engine lab is disabled. Set SIM_ENGINE_ENABLED=1.
      </div>
    );
  }

  const scenarios = listScenarios();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
        Simulation engine lab
      </h1>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
        Experimental strangler-fig scenarios. Production <code>/sim/[sessionId]</code> is
        unchanged. Self-serve opt-in requires <code>SIM_ENGINE_SELF_SERVE=1</code>.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {scenarios.map((s) => (
          <li
            key={s.metadata.id}
            className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-4"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
              {ROLE_DISPLAY[s.metadata.roleKey]?.label ?? s.metadata.roleKey}
            </div>
            <div className="mt-1 text-[15px] font-medium text-[var(--text-primary)]">
              {s.metadata.title}
            </div>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{s.metadata.description}</p>
            <div className="mt-3 flex gap-3 text-[12px]">
              <Link className="text-[var(--action-ink)] underline" href={`/lab/sim/${s.metadata.id}`}>
                Open workbench
              </Link>
              <Link
                className="text-[var(--action-ink)] underline"
                href={`/lab/sim/${s.metadata.id}/analysis?fixture=strong`}
              >
                Strong analysis
              </Link>
              <Link
                className="text-[var(--action-ink)] underline"
                href={`/lab/sim/${s.metadata.id}/analysis?fixture=weak`}
              >
                Weak analysis
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
