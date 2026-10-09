import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import DemoApplicantReview from "@/components/employer/demo/DemoApplicantReview";
import { DEMO_HOME, SAMPLE_APPLICANT_KEY, applicantFixture } from "@/lib/employer-demo/fixtures";
import { loadDemoWorkspace } from "@/lib/employer-demo/store";
import { requireDemoUser } from "@/lib/employer-demo/session";

export const metadata = { title: "Demo applicant" };
export const dynamic = "force-dynamic";

export default async function DemoApplicantPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await requireDemoUser(`${DEMO_HOME}/applicants/${key}`);
  const snapshot = await loadDemoWorkspace(user.id);
  const applicant = snapshot.applicants.find((a) => a.key === key);
  if (!applicant && key === SAMPLE_APPLICANT_KEY) redirect(`${DEMO_HOME}/simulation`);
  if (!applicant) notFound();
  const fixture = applicantFixture(key);

  return (
    <div className="grid gap-6">
      <Link href={DEMO_HOME} className="inline-flex w-fit items-center gap-1.5 text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={1.7} />
        All demo applicants
      </Link>
      <PageHeader
        title={applicant.name}
        description={
          applicant.source === "sample"
            ? "Your own run of the sample task, reviewed exactly as an applicant's would be."
            : `${fixture?.headline ?? "Fictional applicant"}. Fictional applicant for the demo role.`
        }
      />
      <DemoApplicantReview
        applicant={{
          key: applicant.key,
          name: applicant.name,
          headline: fixture?.headline ?? "",
          source: applicant.source,
          files: applicant.files,
          handoff: applicant.handoff,
          submittedAt: applicant.submittedAt,
          projects: fixture?.projects ?? [],
        }}
        decisions={snapshot.decisions
          .filter((d) => d.applicantKey === key)
          .map((d) => ({ id: d.id, decision: d.decision, privateNote: d.privateNote, decidedByYou: d.decidedBy === user.id, decidedAt: d.decidedAt }))}
        messages={snapshot.messages
          .filter((m) => m.applicantKey === key)
          .map((m) => ({ id: m.id, author: m.author, requirementId: m.requirementId, body: m.body, createdAt: m.createdAt }))}
      />
    </div>
  );
}
