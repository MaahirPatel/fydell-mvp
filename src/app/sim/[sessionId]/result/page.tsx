import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { MicroResultClient } from "@/components/sim/MicroResultClient";
import PilotReturnBanner from "@/components/pilot/PilotReturnBanner";

export const metadata = { title: "Your Result | Fydell" };
export const dynamic = "force-dynamic";

export default async function SimulationResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/sim/${sessionId}/result`)}`);
  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        <PilotReturnBanner />
      </div>
      <MicroResultClient sessionId={sessionId} />
    </div>
  );
}
