import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { SandboxUnavailable } from "@/components/sandbox/SandboxUnavailable";
import { SandboxApp } from "@/components/sandbox/SandboxApp";

export const dynamic = "force-dynamic";

export default async function SandboxEvidencePage({ params }: { params: Promise<{ runId: string }> }) {
  const health = await checkSandboxHealth();
  if (!health.enabled) return <SandboxUnavailable />;
  const { runId } = await params;
  return <SandboxApp surface="evidence" runId={runId} />;
}
