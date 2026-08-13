import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { WorkbenchRunner } from "@/components/sim/WorkbenchRunner";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getVersionContent } from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";

export const metadata = { title: "Evaluation | Fydell" };
export const dynamic = "force-dynamic";

export default async function SimulationSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/sim/${sessionId}`)}`);

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, candidate_user_id, template_version_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.candidate_user_id !== user!.id) redirect("/simulations");

  const content = await getVersionContent(session.template_version_id).catch(() => null);
  if (!content || !isMicroContent(content)) redirect("/simulations");
  return <WorkbenchRunner sessionId={sessionId} />;
}
