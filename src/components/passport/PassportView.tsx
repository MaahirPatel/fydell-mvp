"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, FileCode2, Lock, Sparkles } from "lucide-react";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import type { PassportData, PassportEvidence } from "@/lib/passport/view";

export type PassportMode = "preview" | "owner" | "shared" | "employer";

const MODE_LABEL: Record<PassportMode, string> = {
  preview: "Not saved",
  owner: "Private until you share it",
  shared: "Shared by the candidate",
  employer: "Shared with your workspace",
};

const ROLE_LABEL: Record<string, string> = {
  backend: "Backend engineering",
  frontend: "Frontend engineering",
  full_stack: "Full-stack engineering",
  applied_ai: "Applied AI development",
  ml_engineering: "ML engineering",
};

const BASIS_LABEL: Record<PassportEvidence["basis"], string> = {
  repository_observation: "Repository observation",
  dependency_declaration: "Dependency declaration",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function PassportView({ passport, mode }: { passport: PassportData; mode: PassportMode }) {
  const evidence = useMemo(() => passport.projects.flatMap((p) => p.evidence), [passport]);
  const [selectedId, setSelectedId] = useState<string | null>(evidence[0]?.id ?? null);
  const browserRef = useRef<HTMLDivElement>(null);
  const selected = evidence.find((e) => e.id === selectedId) ?? evidence[0] ?? null;
  const selectedProject = passport.projects.find((p) => p.repoFullName === selected?.repo) ?? null;
  const verified = evidence.filter((e) => e.basis === "repository_observation").length;

  const open = (id: string) => {
    setSelectedId(id);
    browserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-3)]">
      <header className="passport-cover relative px-6 pb-6 pt-5 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#9ee6da]">Engineering Passport</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ring-white/20">
            {mode === "owner" ? <Lock className="h-3 w-3" aria-hidden /> : null}
            {MODE_LABEL[mode]}
          </span>
        </div>
        <h2 className="display-serif mt-4 text-[clamp(2rem,4vw,2.75rem)] leading-[1.02] text-white">
          {passport.displayName || passport.githubLogin || "Your passport"}
        </h2>
        <p className="mt-2 text-[14px] text-[#c4e9e3]">
          {passport.githubLogin ? `github.com/${passport.githubLogin}` : "GitHub account not linked"}
          {" · "}
          {passport.projects.length} project{passport.projects.length === 1 ? "" : "s"} · {verified} verified finding{verified === 1 ? "" : "s"}
          {formatDate(passport.updatedAt) ? ` · updated ${formatDate(passport.updatedAt)}` : ""}
        </p>
      </header>

      {passport.capabilities.capabilities.length > 0 ? (
        <section aria-labelledby="capabilities-heading" className="border-b border-[var(--border-subtle)] px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="capabilities-heading" className="text-[17px] font-[560] tracking-[-0.01em]">Demonstrated in code</h3>
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-tertiary)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {passport.capabilities.source === "model"
                ? `AI interpretation (${passport.capabilities.model}) of verified findings`
                : "Rule-based summary of verified findings"}
            </p>
          </div>
          <ul className="stagger mt-4 grid gap-2.5 md:grid-cols-2">
            {passport.capabilities.capabilities.map((cap) => (
              <li key={cap.statement} className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
                <p className="text-[15px] leading-[1.45] text-[var(--text-primary)]">{cap.statement}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cap.evidenceIds.map((id, i) => {
                    const e = evidence.find((x) => x.id === id);
                    if (!e) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => open(id)}
                        className="chip-link"
                        aria-label={`Open evidence ${i + 1}: ${e.path} lines ${e.startLine} to ${e.endLine}`}
                      >
                        <FileCode2 className="h-3 w-3" aria-hidden />
                        {e.path.split("/").pop()} L{e.startLine}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          {passport.capabilities.note ? <p className="mt-3 text-[12.5px] text-[var(--text-tertiary)]">{passport.capabilities.note}</p> : null}
        </section>
      ) : null}

      {evidence.length > 0 && selected ? (
        <section ref={browserRef} aria-label="Evidence" className="grid scroll-mt-24 grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {passport.projects.map((project) => (
              <div key={project.repoFullName} className="mb-5 last:mb-0">
                <div className="px-2">
                  <p className="font-mono text-[13px] font-medium text-[var(--text-primary)]">{project.repoFullName}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                    {project.primaryLanguage ?? "Language unknown"} · commit {project.commitSha.slice(0, 7)} · {project.coverage.analyzedFiles} of{" "}
                    {project.coverage.totalFiles} files analyzed
                    {project.status === "partial" ? " · partial" : ""}
                  </p>
                  {project.notices.map((n) => (
                    <p key={n} className="mt-1 text-[12px] text-[var(--status-attention-ink)]">{n}</p>
                  ))}
                </div>
                <ul className="mt-2 space-y-0.5">
                  {project.evidence.map((e) => {
                    const active = e.id === selected.id;
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedId(e.id)}
                          className={`evidence-row ${active ? "is-active" : ""} ${e.basis === "dependency_declaration" ? "is-declaration" : ""}`}
                        >
                          <span className="block text-[13.5px] leading-[1.35] text-[var(--text-primary)]">{e.finding}</span>
                          <span className="mt-0.5 block truncate font-mono text-[11.5px] text-[var(--text-tertiary)]">
                            {e.path} · L{e.startLine}
                            {e.endLine > e.startLine ? `–${e.endLine}` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div aria-live="polite" className="min-w-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${selected.basis === "repository_observation" ? "badge-teal" : "badge-neutral"}`}>
                {BASIS_LABEL[selected.basis]}
              </span>
              <span className="badge badge-neutral">Authorship unverified</span>
            </div>
            <h4 className="mt-3 text-[18px] font-[560] leading-snug tracking-[-0.01em]">{selected.finding}</h4>
            <div className="mt-4">
              <CodeBlock
                path={`${selected.repo} · ${selected.path}`}
                lines={selected.excerpt.map((text, i) => ({ n: selected.startLine + i, text, mark: "cited" as const }))}
                compact
              />
            </div>
            <a
              href={selected.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ink-teal)] hover:underline hover:underline-offset-4"
            >
              View these lines on GitHub at this commit <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
            <dl className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <div>
                <dt className="text-[12.5px] font-medium">Evidence limits</dt>
                <dd className="mt-1 space-y-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                  {selected.limitations.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                  <p>Repository ownership does not prove authorship of every line.</p>
                </dd>
              </div>
              {selectedProject?.contributionStatement ? (
                <div>
                  <dt className="text-[12.5px] font-medium">Candidate statement</dt>
                  <dd className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">“{selectedProject.contributionStatement}”</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : (
        <p className="px-6 py-8 text-[14px] text-[var(--text-secondary)] sm:px-8">
          No verified findings yet. Findings appear when analyzed files contain patterns Fydell can cite.
        </p>
      )}

      {passport.roleSuggestions.length > 0 ? (
        <section aria-labelledby="roles-heading" className="border-t border-[var(--border-subtle)] px-6 py-6 sm:px-8">
          <h3 id="roles-heading" className="text-[17px] font-[560] tracking-[-0.01em]">Roles this work supports</h3>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {passport.roleSuggestions.map((role) => (
              <li key={role.family} className="rounded-[12px] border border-[var(--border-subtle)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-medium">{ROLE_LABEL[role.family] ?? role.family}</p>
                  <span className={`badge ${role.status === "supported" ? "badge-teal" : "badge-attention"}`}>
                    {role.status === "supported" ? "Supported" : "Partly supported"}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--text-secondary)]">{role.requirement}</p>
                <p className="mt-2 text-[12.5px] text-[var(--text-tertiary)]">{role.evidenceIds.length} supporting findings</p>
                <ul className="mt-2 space-y-1 border-t border-[var(--border-subtle)] pt-2">
                  {role.gaps.map((g) => (
                    <li key={g} className="text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">Not shown: {g}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-6 py-4 text-[12.5px] leading-[1.55] text-[var(--text-secondary)] sm:px-8">
        An Engineering Passport records evidence found in public repositories. It is not a certification, and missing evidence is not evidence of inability.
      </footer>
    </div>
  );
}
