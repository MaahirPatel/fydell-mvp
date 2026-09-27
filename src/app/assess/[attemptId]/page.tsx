import { redirect } from "next/navigation";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import AssessmentHub from "@/components/eng/AssessmentHub";
import { withNext } from "@/lib/auth/safe-next";
import { getAttemptForCandidate } from "@/lib/eng/attempts";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { engAdmin } from "@/lib/eng/context";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task | Fydell" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  if (!user) redirect(withNext("/login", `/assess/${attemptId}`));
  const db = engAdmin();
  const attempt = await getAttemptForCandidate(db, attemptId, user.id).catch(() => null);
  if (!attempt) {
    return (
      <CandidateShell width="narrow">
        <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">Task not found</h1>
        <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
          This link does not match a task on the account you are signed in with ({user.email}). Open the invitation link from your email to accept it, or sign in with the invited address.
        </p>
      </CandidateShell>
    );
  }
  const view = await buildCandidateView(db, attempt);
  return (
    <CandidateShell width="wide">
      <AssessmentHub initial={view} />
    </CandidateShell>
  );
}
