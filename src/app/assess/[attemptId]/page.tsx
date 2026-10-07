import { redirect } from "next/navigation";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import AssessmentHub from "@/components/eng/AssessmentHub";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/safe-next";
import { getAttemptForCandidate } from "@/lib/eng/attempts";
import CandidateReport from "@/components/eng/CandidateReport";
import { buildCandidateReport } from "@/lib/eng/candidate-report";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
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
          title="This task is not on your account"
          lead={`You are signed in as ${user.email}. Open the invitation link from your email to accept the task, or sign in with the address the invitation was sent to.`}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/app/candidate" variant="primary" size="md">
            Back to evaluations
          </ButtonLink>
        </div>
      </CandidateShell>
    );
  }
  const view = await buildCandidateView(db, attempt);
  const report =
    view.attempt.status === "submitted"
      ? await scenarioForVersionId(db, attempt.scenario_version_id)
          .then(({ definition }) => buildCandidateReport(db, attempt, definition))
          .catch((err: unknown) => {
            console.error("[eng:candidate-report] could not build the candidate report", err);
            return null;
          })
      : null;
  return (
    <CandidateShell width={view.attempt.status === "in_progress" ? "wide" : "default"} current="assessments">
      <AssessmentHub initial={view} />
      {report ? (
        <div id="report" className="mt-6 scroll-mt-24">
          <CandidateReport attemptId={attempt.id} organizationName={view.role.organizationName} initial={report} />
        </div>
      ) : null}
    </CandidateShell>
  );
}
