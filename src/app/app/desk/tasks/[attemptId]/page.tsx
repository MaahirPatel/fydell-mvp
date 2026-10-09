import { redirect } from "next/navigation";
import AssessmentHub from "@/components/eng/AssessmentHub";
import CandidateReport from "@/components/eng/CandidateReport";
import { ButtonLink } from "@/components/ui/Button";
import { getAttemptForCandidate } from "@/lib/eng/attempts";
import { buildCandidateReport } from "@/lib/eng/candidate-report";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { scenarioForVersionId, versionOrigin } from "@/lib/eng/scenario-versions";
import { engAdmin } from "@/lib/eng/context";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task" };
export const dynamic = "force-dynamic";

/** An engineering task inside the app window. Creator-authored tasks open in their own full-screen editor. */
export default async function DeskTaskPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/desk/tasks/${attemptId}`)}`);
  const db = engAdmin();
  const attempt = await getAttemptForCandidate(db, attemptId, user.id).catch(() => null);
  if (!attempt) {
    return (
      <div className="grid max-w-[640px] gap-4">
        <h1 className="text-app-page text-[var(--text-primary)]">This task is not on your account</h1>
        <p className="text-app-body text-[var(--text-secondary)]">
          You are signed in as {user.email}. Tasks belong to the address the invitation was sent to; sign in with that one to open it.
        </p>
        <div>
          <ButtonLink href="/app/desk/inbox" variant="primary" size="md">
            Open your inbox
          </ButtonLink>
        </div>
      </div>
    );
  }
  if ((await versionOrigin(db, attempt.scenario_version_id)) === "employer_authored") redirect(`/assess/${attempt.id}`);

  const view = await buildCandidateView(db, attempt);
  const report =
    view.attempt.status === "submitted"
      ? await scenarioForVersionId(db, attempt.scenario_version_id)
          .then(({ definition }) => buildCandidateReport(db, attempt, definition))
          .catch((err: unknown) => {
            console.error("[desk:candidate-report] could not build the candidate report", err);
            return null;
          })
      : null;
  return (
    <>
      <AssessmentHub initial={view} />
      {report ? (
        <div id="report" className="mt-6 scroll-mt-6">
          <CandidateReport attemptId={attempt.id} organizationName={view.role.organizationName} initial={report} />
        </div>
      ) : null}
    </>
  );
}
