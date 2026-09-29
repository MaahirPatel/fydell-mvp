import { redirect } from "next/navigation";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import AssessmentHub from "@/components/eng/AssessmentHub";
import { withNext } from "@/lib/auth/safe-next";
import { getAttemptForCandidate } from "@/lib/eng/attempts";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { engAdmin } from "@/lib/eng/context";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  if (!user) redirect(withNext("/login", `/assess/${attemptId}`));
  const db = engAdmin();
  const attempt = await getAttemptForCandidate(db, attemptId, user.id).catch(() => null);
  if (!attempt) {
    return (
      <CandidateShell current="assessments">
        <CandidatePageHead
          eyebrow={["Engineering task"]}
          title="This task is not on your account"
          lead={`You are signed in as ${user.email}. Open the invitation link from your email to accept the task, or sign in with the address the invitation was sent to.`}
        />
      </CandidateShell>
    );
  }
  const view = await buildCandidateView(db, attempt);
  return (
    <CandidateShell width={view.attempt.status === "in_progress" ? "wide" : "default"} current="assessments">
      <AssessmentHub initial={view} />
    </CandidateShell>
  );
}
