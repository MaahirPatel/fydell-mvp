"use client";

import dynamic from "next/dynamic";
import {
  WorkbenchChromeProvider,
  type WorkbenchChrome,
} from "@/components/simulations/WorkbenchChrome";

/**
 * Mounts one catalog scenario as a running workbench.
 *
 * The workbench is deliberately not server rendered: see WorkbenchClient.
 */
const WorkbenchClient = dynamic(() => import("./WorkbenchClient"), {
  ssr: false,
  loading: () => <WorkbenchLoading />,
});

function WorkbenchLoading() {
  return (
    <div
      className="flex h-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[13px] text-[var(--text-tertiary)]">Preparing the workbench</p>
    </div>
  );
}

export function ScenarioWorkbenchHost({
  scenarioId,
  chrome = null,
  debug,
}: {
  scenarioId: string;
  chrome?: WorkbenchChrome | null;
  debug?: boolean;
}) {
  return (
    <WorkbenchChromeProvider chrome={chrome}>
      <WorkbenchClient scenarioId={scenarioId} debug={debug} />
    </WorkbenchChromeProvider>
  );
}
