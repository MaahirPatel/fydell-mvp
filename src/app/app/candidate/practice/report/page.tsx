import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { PracticeReport } from "@/components/candidate/BuilderPractice";
import { PRACTICE_REPORT } from "@/components/candidate/practice-paths";

export const metadata = { title: "Practice report" };
export const dynamic = "force-dynamic";

export default async function PracticeReportPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PRACTICE_REPORT)}`);
  return (
    <CandidateShell current="practice" width="wide" crumbs={[{ label: "Report" }]}>
      <PracticeReport userId={user.id} />
    </CandidateShell>
  );
}
