import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, getProjectManifest, listCorrections, listShares, projectRemovalImpact } from "@/lib/passport/store";
import RemoveProject from "@/components/passport/RemoveProject";
import DevelopmentFeedback from "@/components/passport/DevelopmentFeedback";
import { developmentFeedback } from "@/lib/passport/development-feedback";
import { getContribution, listDecisions } from "@/lib/passport/context-store";
import { versionsOf, diffFindings } from "@/lib/passport/versions";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import BuilderReport, { type VersionSummary } from "@/components/passport/BuilderReport";
import { parseReportView } from "@/lib/passport/record-states";
import type { PassportProject } from "@/lib/passport/view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Builder Report" };

function summarize(p: PassportProject & { id: string }): VersionSummary {
  return {
    id: p.id,
    commitSha: p.commitSha,
    revisionRef: p.revisionRef ?? null,
    analyzedAt: p.analyzedAt,
    status: p.status,
    findings: p.evidence.length,
    analyzedFiles: p.coverage.analyzedFiles,
    analysisVersion: p.analysisVersion ?? null,
  };
}

export default async function BuilderReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ finding?: string; view?: string }>;
}) {
  const { projectId } = await params;
  const { finding, view } = await searchParams;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/candidate/projects/${projectId}`)}`);
  if (!/^[0-9a-f-]{36}$/.test(projectId)) notFound();

  const [passport, manifestRow, corrections] = await Promise.all([
    getOwnerPassport(user.id),
    getProjectManifest(user.id, projectId),
    listCorrections(user.id),
  ]);
  const project = passport?.projects.find((p): p is PassportProject & { id: string } => p.id === projectId);
  if (!passport || !project || !manifestRow) notFound();

  const [contribution, decisions, shares, removalImpact] = await Promise.all([
    getContribution(user.id, project.repoFullName),
    listDecisions(user.id, project.repoFullName),
    listShares(user.id),
    projectRemovalImpact(user.id, project.repoFullName),
  ]);
  const pinnedByShare = shares.some((s) => !s.revokedAt && (s.pinnedProjectIds ?? []).includes(project.id));

  const versions = versionsOf(passport.projects, project.repoFullName).filter((p): p is PassportProject & { id: string } => Boolean(p.id));
  const index = versions.findIndex((v) => v.id === project.id);
  const previous = index >= 0 ? (versions[index + 1] ?? null) : null;
  const findingIds = new Set(project.evidence.map((e) => e.id));
  const notes = corrections.filter((c) => findingIds.has(c.findingId) && (c.projectId === null || c.projectId === project.id));
  const initialView = parseReportView(view);

  return (
    <CandidateShell width="wide" current="work">
      <BuilderReport
        project={project}
        versions={versions.map(summarize)}
        diff={previous ? diffFindings(previous.evidence, project.evidence) : null}
        previousVersion={previous ? summarize(previous) : null}
        latestId={versions[0]?.id ?? project.id}
        manifest={manifestRow.manifest}
        initialNotes={notes}
        initialFindingId={typeof finding === "string" ? finding : null}
        openOnPrevious={previous ? corrections.filter((c) => c.projectId === previous.id && c.status === "open" && !c.withdrawnAt).length : 0}
        contribution={contribution}
        decisions={decisions}
        initialView={initialView}
        pinnedByShare={pinnedByShare}
      />
      <DevelopmentFeedback projectId={project.id} items={developmentFeedback(project)} evidence={project.evidence} />
      <RemoveProject repoFullName={project.repoFullName} versionCount={versions.length} impact={removalImpact} />
    </CandidateShell>
  );
}
