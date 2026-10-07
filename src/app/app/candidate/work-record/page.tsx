import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, listCorrections, listShares } from "@/lib/passport/store";
import { listImportJobs } from "@/lib/passport/import-store";
import { getProfileHub } from "@/lib/profile/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
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

export const metadata = { title: "Passport" };
export const dynamic = "force-dynamic";

function Section({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--border-default)] pt-6">
      <h2 className="text-[17px] font-semibold tracking-[-0.012em]">{title}</h2>
      {hint ? <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">{hint}</p> : null}
      <div className="mt-4">{children}</div>
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
  const [hub, passport, shares, jobs, corrections] = await Promise.all([
    getProfileHub(user.id, user.email.split("@")[0]),
    getOwnerPassport(user.id),
    listShares(user.id),
    listImportJobs(user.id),
    listCorrections(user.id),
  ]);

  const initialRepos = (params.repos ?? "").split(",").filter((r) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(r)).slice(0, 3);
  const initialLogin = /^[A-Za-z0-9-]{1,39}$/.test(params.github ?? "") ? (params.github as string) : (passport?.githubLogin ?? "");
  const projects = passport?.projects ?? [];
  const presentations = await getPresentations(user.id, projects);
  const current = projects.filter((p) => p.status !== "stale");
  const hasProjects = current.length > 0;
  const findings = current.reduce((n, p) => n + p.evidence.length, 0);
  const liveShares = shares.filter((s) => !s.revokedAt).length;
  const selfSupplied = hub.timeline.filter((t) => t.kind === "editor-import");
  const privateKeys = new Set(presentations.filter((p) => p.visibility === "private").map((p) => p.projectKey.toLowerCase()));
  const shareable = [
    ...current
      .filter((p) => !privateKeys.has(p.repoFullName.toLowerCase()))
      .map((p) => ({ repo: p.repoFullName, commit: p.commitSha.slice(0, 7), findings: p.evidence.length })),
    ...presentations
      .filter((p) => p.sourceKind === "manual" && p.visibility === "shareable")
      .map((p) => ({ repo: p.projectKey, commit: "", findings: 0, title: p.title })),
  ];

  return (
    <CandidateShell width="wide" current="work">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.024em] text-[var(--text-primary)]">Passport</h1>
            <p className="mt-1.5 max-w-[64ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
              Your projects, their Builder Reports, and the links you share. Only what you share through a link is visible to anyone else.
            </p>
          </div>
          <Link
            href="/app/candidate/profile"
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            View profile
          </Link>
        </div>
        {hasProjects ? (
          <p className="mt-4 text-[16px] leading-[1.55] text-[var(--text-body)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {current.length} project{current.length === 1 ? "" : "s"}
            </span>{" "}
            with {findings} source-linked finding{findings === 1 ? "" : "s"}
            {liveShares ? ` · shared through ${liveShares} active link${liveShares === 1 ? "" : "s"}` : " · private"}            .
          </p>
        ) : null}
        {params.removed === "1" ? (
          <Notice className="mt-4">
            Project removed. Share links and applications no longer show it.
          </Notice>
        ) : null}
      </header>

      <div className="mt-10 grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          <div id="imports" className="scroll-mt-24 empty:hidden">
            <ImportJobsPanel initialJobs={jobs} />
          </div>

          <section id="projects" aria-labelledby="projects-heading" className="scroll-mt-24">
            <h2 id="projects-heading" className="mb-3 text-[19px] font-semibold tracking-[-0.014em]">
              Projects
            </h2>
            <WorkRecordProjects projects={projects} corrections={corrections} />
          </section>

          <section id="showcase" aria-labelledby="showcase-heading" className="scroll-mt-24">
            <h2 id="showcase-heading" className="mb-2 text-[19px] font-semibold tracking-[-0.014em]">
              On your profile
            </h2>
            <ProjectShowcase initial={presentations} />
          </section>

          <section id="add-repository" aria-labelledby="add-heading" className="scroll-mt-24">
            <h2 id="add-heading" className="mb-3 text-[19px] font-semibold tracking-[-0.014em]">
              Add a repository
            </h2>
            <PassportConnectSection initialLogin={initialLogin} initialRepos={initialRepos} />
            <details id="upload-project" className="group mt-6 scroll-mt-24 border-t border-[var(--border-default)]">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-[15px] font-semibold tracking-[-0.01em]">
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                Upload a project instead
                <span className="text-[14px] font-normal text-[var(--text-tertiary)]">For work that isn&apos;t on public GitHub</span>
              </summary>
              <div className="pb-4">
                <UploadProject />
              </div>
            </details>
          </section>

          <Section id="profile-questions" title="Questions from reviewers">
            <CandidateQuestions />
          </Section>

          <section id="profile-editor" className="scroll-mt-24 border-t border-[var(--border-default)]">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-5 text-[17px] font-semibold tracking-[-0.012em]">
                <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                Editor history
                <span className="text-[14px] font-normal text-[var(--text-tertiary)]">Optional</span>
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
            <Section title="Sharing">
              <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">Available once you have a project.</p>
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
                className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
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
