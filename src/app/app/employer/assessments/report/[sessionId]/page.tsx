import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { EvidenceReport } from "@/components/sim/EvidenceReport";
import { withNext } from "@/lib/auth/safe-next";

export const metadata = { title: "Evidence report" };
export const dynamic = "force-dynamic";

export default async function EvidenceReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  // Preserve the report the reviewer was opening so signing in returns them to it.
  if (!user) {
    redirect(withNext("/login", `/app/employer/assessments/report/${sessionId}`));
  }
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");
  return <EvidenceReport sessionId={sessionId} />;
}
