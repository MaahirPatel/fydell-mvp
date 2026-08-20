import ProofWorkbench from "@/components/simulations/ProofWorkbench";
import { startRunFromToken } from "@/lib/sim-engine/proof/db";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/simulations/auth";

export const dynamic = "force-dynamic";

export default async function WorkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <main className="p-8 text-[var(--text-secondary)]">
        Workspace is not connected. Fydell cannot start this simulation.
      </main>
    );
  }
  const user = await requireUser();
  const started = await startRunFromToken(token, user?.id ?? null);
  return <ProofWorkbench runId={started.run.id} token={token} />;
}
