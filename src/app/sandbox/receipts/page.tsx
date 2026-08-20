import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { SandboxUnavailable } from "@/components/sandbox/SandboxUnavailable";
import { SandboxApp } from "@/components/sandbox/SandboxApp";

export const dynamic = "force-dynamic";

export default async function SandboxReceiptsIndexPage() {
  const health = await checkSandboxHealth();
  if (!health.enabled) return <SandboxUnavailable />;
  return <SandboxApp surface="receipt" />;
}
