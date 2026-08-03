import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { EvidenceReport } from "@/components/sim/EvidenceReport";

export const metadata = { title: "Evidence report | Fydell" };
export const dynamic = "force-dynamic";

export default async function EvidenceReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");
  return <EvidenceReport sessionId={sessionId} />;
}
