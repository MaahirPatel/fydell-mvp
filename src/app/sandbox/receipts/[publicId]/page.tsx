import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { SandboxUnavailable } from "@/components/sandbox/SandboxUnavailable";
import { SandboxApp } from "@/components/sandbox/SandboxApp";

export const dynamic = "force-dynamic";

export default async function SandboxReceiptPage({ params }: { params: Promise<{ publicId: string }> }) {
  const health = await checkSandboxHealth();
  if (!health.enabled) return <SandboxUnavailable />;
  const { publicId } = await params;
  return <SandboxApp surface="receipt" publicId={publicId} />;
}
