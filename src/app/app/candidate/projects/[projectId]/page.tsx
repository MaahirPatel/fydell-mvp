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
import { evidenceStatus } from "@/lib/profile-evidence/store";
import EvidenceVersionPanel from "@/components/evidence/EvidenceVersionPanel";
import { receiptIdsForSnapshots } from "@/lib/receipts/store";
import Link from "next/link";
import { listSnapshotVersions } from "@/lib/passport/snapshot-versions";
import SnapshotVersionView from "@/components/passport/SnapshotVersionView";
import { capabilityReportState, listCapabilityReportVersions } from "@/lib/passport/capability/store";

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
  searchParams: Promise<{ finding?: string; view?: string; version?: string }>;
}) {
  const { projectId } = await params;
  const { finding, view, version: versionParam } = await searchParams;
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

  const stored = await listSnapshotVersions(user.id, project.id);
  if (typeof versionParam === "string") {
    const wanted = stored.find((v) => String(v.version) === versionParam);
    if (!wanted) notFound();
    if (wanted.version !== stored[0]?.version) {
      return (
        <CandidateShell width="wide" current="work" crumbs={[{ label: project.repoFullName.split("/").pop() ?? project.repoFullName }, { label: `Version ${wanted.version}` }]}>
          <SnapshotVersionView version={wanted} versions={stored} focusFindingId={typeof finding === "string" ? finding : null} />
        </CandidateShell>
      );
    }
  }

  const [contribution, decisions, shares, removalImpact, evidence, receipts, reportState, reportVersions] = await Promise.all([
    getContribution(user.id, project.repoFullName),
    listDecisions(user.id, project.repoFullName),
    listShares(user.id),
    projectRemovalImpact(user.id, project.repoFullName),
    evidenceStatus(user.id, project.repoFullName),
    receiptIdsForSnapshots(user.id, [project.id]),
    capabilityReportState(user.id, project.id),
    listCapabilityReportVersions(user.id, project.id),
  ]);
  const latestReport = reportState.latest;
  const receiptId = receipts.get(project.id) ?? null;
  const pinnedByShare = shares.some((s) => !s.revokedAt && (s.pinnedProjectIds ?? []).includes(project.id));

  const versions = versionsOf(passport.projects, project.repoFullName).filter((p): p is PassportProject & { id: string } => Boolean(p.id));
  const index = versions.findIndex((v) => v.id === project.id);
  const previous = index >= 0 ? (versions[index + 1] ?? null) : null;
  const findingIds = new Set(project.evidence.map((e) => e.id));
  const notes = corrections.filter((c) => findingIds.has(c.findingId) && (c.projectId === null || c.projectId === project.id));
  const initialView = typeof finding === "string" && !view ? "findings" : parseReportView(view);

  return (
    <CandidateShell width="wide" current="work" crumbs={[{ label: project.repoFullName.split("/").pop() ?? project.repoFullName }]}>
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
        review={latestReport?.report ?? null}
        reviewMeta={
          latestReport
            ? {
                version: latestReport.version,
                reason: latestReport.reason,
                createdAt: latestReport.createdAt,
                stale: reportState.stale,
                versions: reportVersions.map((v) => ({ version: v.version, reason: v.reason, createdAt: v.createdAt })),
              }
            : null
        }
      />
      {evidence ? <EvidenceVersionPanel initial={evidence} /> : null}
      <p className="mt-8 text-[14px] text-[var(--text-secondary)]">
        {receiptId ? (
          <>
            Fydell recorded a work receipt when this snapshot was saved.{" "}
            <Link href={`/app/candidate/receipts/${receiptId}`} className="font-medium text-[var(--text-primary)] underline underline-offset-4">View receipt</Link>
          </>
        ) : (
          <>
            This snapshot was saved before Fydell recorded work receipts, so it has none. Fydell does not back-date receipts.{" "}
            <Link href="/app/candidate/receipts" className="font-medium text-[var(--text-primary)] underline underline-offset-4">All receipts</Link>
          </>
        )}
      </p>
      {stored.length > 1 ? (
        <p className="mt-3 text-[14px] text-[var(--text-secondary)]">
          This revision has been analyzed {stored.length} times. Earlier analyses are kept unchanged:{" "}
          {stored.slice(1).map((v, i) => (
            <span key={v.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/app/candidate/projects/${project.id}?version=${v.version}`} className="font-medium text-[var(--text-primary)] underline underline-offset-4">
                version {v.version}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}
      <DevelopmentFeedback projectId={project.id} items={developmentFeedback(project)} evidence={project.evidence} />
      <RemoveProject repoFullName={project.repoFullName} uploaded={project.sourceKind === "upload"} versionCount={versions.length} impact={removalImpact} />
    </CandidateShell>
  );
}
