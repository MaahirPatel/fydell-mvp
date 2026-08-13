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
    <div className="bg-[var(--surface-canvas)]">
      {/* Renders nothing outside a pilot. Kept on the canvas colour so it does
          not flash a bare strip above the header when it is absent. */}
      <div className="mx-auto max-w-[1100px] px-5 empty:hidden sm:px-6">
        <PilotReturnBanner />
      </div>
      <MicroResultClient sessionId={sessionId} />
    </div>
  );
}
