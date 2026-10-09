import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, listCorrections, listShares } from "@/lib/passport/store";
import { listImportJobs } from "@/lib/passport/import-store";
import { getProfileHub } from "@/lib/profile/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/report";
import SharePanel from "@/components/passport/SharePanel";
import ImportJobsPanel from "@/components/passport/ImportJobsPanel";
import WorkRecordProjects from "@/components/passport/WorkRecordProjects";
import UploadProject from "@/components/passport/UploadProject";
import ProjectShowcase from "@/components/passport/ProjectShowcase";
import { getPresentations } from "@/lib/passport/presentation-store";
import ConnectedAccounts from "@/components/profile/ConnectedAccounts";
import EditorImport from "@/components/profile/EditorImport";
import EvidenceTimeline from "@/components/profile/EvidenceTimeline";
import PassportConnectSection from "@/components/profile/PassportConnectSection";
import CandidateQuestions from "@/components/candidate/CandidateQuestions";
import WorkSamplesPanel from "@/components/evidence/WorkSamplesPanel";
import EvidenceVersionPanel from "@/components/evidence/EvidenceVersionPanel";
import { listIncludableReports, listWorkSamples } from "@/lib/profile-evidence/work-samples";
import { evidenceStatus, shareableProjectKeys } from "@/lib/profile-evidence/store";
import { latestReportsForOwner } from "@/lib/passport/capability/store";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

function Section({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--border-subtle)] pt-5">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
      {hint ? <p className="mt-0.5 text-[13px] leading-[1.55] text-[var(--text-secondary)]">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function WorkRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; repos?: string; removed?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/work-record")}`);

  const params = await searchParams;
  const [hub, passport, shares, jobs, corrections, workSamples, includable] = await Promise.all([
    getProfileHub(user.id, user.email.split("@")[0]),
    getOwnerPassport(user.id),
    listShares(user.id),
    listImportJobs(user.id),
    listCorrections(user.id),
    listWorkSamples(user.id),
    listIncludableReports(user.id),
  ]);

  const initialRepos = (params.repos ?? "").split(",").filter((r) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(r)).slice(0, 3);
  const initialLogin = /^[A-Za-z0-9-]{1,39}$/.test(params.github ?? "") ? (params.github as string) : (passport?.githubLogin ?? "");
  const projects = passport?.projects ?? [];
  const [presentations, storedReports] = await Promise.all([getPresentations(user.id, projects), latestReportsForOwner(user.id)]);
  const reports = Object.fromEntries([...storedReports].map(([snapshotId, r]) => [snapshotId, { version: r.version, review: r.report }]));
  const manualStatuses = (
    await Promise.all(presentations.filter((p) => p.sourceKind === "manual").map((p) => evidenceStatus(user.id, p.projectKey)))
  ).filter((s): s is NonNullable<typeof s> => s !== null);
  const current = projects.filter((p) => p.status !== "stale");
  const hasProjects = current.length > 0;
  const findings = current.reduce((n, p) => n + p.evidence.length, 0);
  const liveShares = shares.filter((s) => !s.revokedAt).length;
  const selfSupplied = hub.timeline.filter((t) => t.kind === "editor-import");
  const privateKeys = new Set(presentations.filter((p) => p.visibility === "private").map((p) => p.projectKey.toLowerCase()));
  const confirmedKeys = new Set((await shareableProjectKeys(user.id, undefined)).map((k) => k.toLowerCase()));
  const shareable = [
    ...current
      .filter((p) => !privateKeys.has(p.repoFullName.toLowerCase()))
      .map((p) => ({
        repo: p.repoFullName,
        commit: p.commitSha.slice(0, 7),
        findings: p.evidence.length,
        confirmHref: p.id ? `/app/candidate/projects/${p.id}#evidence-version-heading` : "#showcase",
      })),
    ...presentations
      .filter((p) => p.sourceKind === "manual" && p.visibility === "shareable")
      .map((p) => ({ repo: p.projectKey, commit: "", findings: 0, title: p.title, confirmHref: "#showcase" })),
  ].map((p) => ({ ...p, confirmed: confirmedKeys.has(p.repo.toLowerCase()) }));

  return (
    <CandidateShell width="wide" current="work">
      <CandidatePageHead
        title="Projects"
        lead="Your projects, their Builder Reports, and the links you share. Only what you share through a link is visible to anyone else."
        aside={
          <>
            <ButtonLink href="/app/candidate/reports" variant="secondary" size="sm">
              Builder Analysis
            </ButtonLink>
            <ButtonLink href="/app/candidate/receipts" variant="secondary" size="sm">
              Receipts
            </ButtonLink>
            <ButtonLink href="/app/candidate/profile" variant="secondary" size="sm">
              View profile
            </ButtonLink>
            <ButtonLink href="#add-repository" variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Add project
            </ButtonLink>
          </>
        }
        meta={
          hasProjects
            ? [
                { label: "Projects", value: <span className="tabular-nums">{current.length}</span> },
                { label: "Source-linked findings", value: <span className="tabular-nums">{findings}</span> },
                { label: "Sharing", value: liveShares ? `${liveShares} active link${liveShares === 1 ? "" : "s"}` : "Private" },
              ]
            : []
        }
      />
      {params.removed === "1" ? (
        <Notice className="mt-4">
          Project removed. Share links and applications no longer show it.
        </Notice>
      ) : null}

      <div className="mt-8 grid grid-cols-1 items-start gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          <div id="imports" className="scroll-mt-24 empty:hidden">
            <ImportJobsPanel initialJobs={jobs} />
          </div>

          <section id="projects" aria-labelledby="projects-heading" className="scroll-mt-24">
            <h2 id="projects-heading" className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">
              Projects
            </h2>
            <WorkRecordProjects projects={projects} corrections={corrections} reports={reports} />
          </section>

          <section id="showcase" aria-labelledby="showcase-heading" className="scroll-mt-24">
            <h2 id="showcase-heading" className="mb-2 text-[15px] font-semibold tracking-[-0.01em]">
              On your profile
            </h2>
            <ProjectShowcase initial={presentations} />
            {manualStatuses.map((s) => (
              <details key={s.projectKey} className="group mt-4 border-t border-[var(--border-subtle)]">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-[14px] font-semibold tracking-[-0.01em]">
                  <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                  Confirm and publish: {s.title}
                </summary>
                <EvidenceVersionPanel initial={s} />
              </details>
            ))}
          </section>

          <Section id="work-samples" title="Work sample reports" hint="Reports from Fydell work samples you completed. Add one to attach it to applications.">
            <WorkSamplesPanel included={workSamples} includable={includable} />
          </Section>

          <section id="add-repository" aria-labelledby="add-heading" className="scroll-mt-24">
            <h2 id="add-heading" className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">
              Add a repository
            </h2>
            <PassportConnectSection initialLogin={initialLogin} initialRepos={initialRepos} />
            <details id="upload-project" className="group mt-6 scroll-mt-24 border-t border-[var(--border-subtle)]">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-0.5 py-3 text-[14px] font-semibold tracking-[-0.01em]">
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                Upload a project instead
                <span className="text-[13px] font-normal text-[var(--text-tertiary)]">For work that isn&apos;t on public GitHub</span>
              </summary>
              <div className="pb-4">
                <UploadProject />
              </div>
            </details>
          </section>

          <Section id="profile-questions" title="Questions from reviewers">
            <CandidateQuestions />
          </Section>

          <section id="profile-editor" className="scroll-mt-24 border-t border-[var(--border-subtle)]">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-[15px] font-semibold tracking-[-0.01em]">
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                Editor history
                <span className="text-[13px] font-normal text-[var(--text-tertiary)]">Optional</span>
              </summary>
              <div className="pb-6">
                {selfSupplied.length ? <EvidenceTimeline items={selfSupplied} /> : null}
                <div className={selfSupplied.length ? "mt-6" : ""}>
                  <EditorImport />
                </div>
              </div>
            </details>
          </section>
        </div>

        <aside className="space-y-10">
          {shareable.length ? (
            <SharePanel initialShares={shares} projects={shareable} />
          ) : (
            <Section id="share" title="Sharing">
              <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">Share links become available once you add a project.</p>
            </Section>
          )}

          <Section title="Connected accounts">
            <ConnectedAccounts initial={hub.accounts} />
          </Section>

          {hasProjects ? (
            <Section title="Your data" hint="Everything in your Passport, including your notes and corrections, as one JSON file.">
              <a
                href="/api/passport/export"
                download
                className="inline-flex h-8 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-meta font-medium text-[var(--text-primary)] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                Download my Passport
              </a>
            </Section>
          ) : null}
        </aside>
      </div>
    </CandidateShell>
  );
}
