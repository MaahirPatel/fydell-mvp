"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, FileCode2, ShieldCheck } from "lucide-react";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import FydellMark from "@/components/brand/FydellMark";
import "./passport.css";
import type { PassportData, PassportEvidence } from "@/lib/passport/view";

export type PassportMode = "preview" | "owner" | "shared" | "employer";

const MODE_LABEL: Record<PassportMode, string> = {
  preview: "Preview",
  owner: "Only you can see this",
  shared: "Shared by candidate",
  employer: "Shared with your team",
};

const MODE_BADGE: Record<PassportMode, string> = {
  preview: "badge-attention",
  owner: "badge-neutral",
  shared: "badge-teal",
  employer: "badge-teal",
};

const ROLE_LABEL: Record<string, string> = {
  backend: "Backend engineering",
  frontend: "Frontend engineering",
  full_stack: "Full-stack engineering",
  applied_ai: "Applied AI development",
  ml_engineering: "ML engineering",
};

const BASIS_LABEL: Record<PassportEvidence["basis"], string> = {
  repository_observation: "From code",
  dependency_declaration: "From dependencies",
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

  const metaParts: string[] = [];
  if (passport.githubLogin) metaParts.push(`github.com/${passport.githubLogin}`);
  metaParts.push(`${passport.projects.length} project${passport.projects.length === 1 ? "" : "s"}`);
  if (evidence.length > 0) metaParts.push(`${verified} of ${evidence.length} verified in code`);
  const updated = formatDate(passport.updatedAt);
  if (updated) metaParts.push(`updated ${updated}`);

  const open = (id: string) => {
    setSelectedId(id);
    browserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pp">
      <header className="pp-head">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="pp-kicker">
            <FydellMark width={22} />
            Engineering Passport
          </p>
          <span className={`badge ${MODE_BADGE[mode]}`}>{MODE_LABEL[mode]}</span>
        </div>
        <h2 className="pp-name">{passport.displayName || passport.githubLogin || "Your passport"}</h2>
        {passport.headline ? <p className="pp-headline">{passport.headline}</p> : null}
        <p className="pp-meta">{metaParts.join(" · ")}</p>
        <div className="pp-trust">
          <span className="trust-item">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Every claim links to the exact lines
          </span>
          <span className="trust-item">We can&apos;t verify who wrote each line</span>
        </div>
      </header>

      {passport.capabilities.capabilities.length > 0 ? (
        <section aria-labelledby="capabilities-heading" className="pp-section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="capabilities-heading" className="pp-title">
              What the code shows
            </h3>
            <p className="text-app-meta text-[var(--text-tertiary)]">
              {passport.capabilities.source === "model" ? "Summarized from the code below." : "Grouped from the code below."}
            </p>
          </div>
          <ul className="pp-rows mt-4">
            {passport.capabilities.capabilities.map((cap) => (
              <li key={cap.statement} className="p-4">
                <p className="text-app-body leading-[1.5] text-[var(--text-primary)]">{cap.statement}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {cap.evidenceIds.map((id, i) => {
                    const e = evidence.find((x) => x.id === id);
                    if (!e) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => open(id)}
                        className="chip-link"
                        aria-label={`Open example ${i + 1}: ${e.path} lines ${e.startLine} to ${e.endLine}`}
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
          {passport.capabilities.note ? <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">{passport.capabilities.note}</p> : null}
        </section>
      ) : null}

      {evidence.length > 0 && selected ? (
        <section ref={browserRef} aria-label="Evidence" className="grid scroll-mt-24 grid-cols-1 border-b border-[var(--border-subtle)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {passport.projects.map((project) => (
              <div key={project.repoFullName} className="mb-5 last:mb-0">
                <div className="px-2">
                  <p className="font-mono text-app-meta font-medium text-[var(--text-primary)]">{project.repoFullName}</p>
                  <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
                    {project.primaryLanguage ?? "Unknown language"} · {project.coverage.analyzedFiles} of {project.coverage.totalFiles} files
                    checked · {project.commitSha.slice(0, 7)}
                    {project.status === "partial" ? " · incomplete" : ""}
                  </p>
                  {project.notices.map((n) => (
                    <p key={n} className="mt-1 text-app-meta text-[var(--status-attention-ink)]">{n}</p>
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
                          <span className="block text-app-body leading-[1.35] text-[var(--text-primary)]">{e.finding}</span>
                          <span className="mt-0.5 block truncate font-mono text-app-caption text-[var(--text-tertiary)]">
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
              <span className="badge badge-neutral">Authorship not checked</span>
            </div>
            <h4 className="mt-3 text-app-section font-semibold leading-snug tracking-[-0.012em]">{selected.finding}</h4>
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
              className="mt-3 inline-flex items-center gap-1 text-app-meta font-medium text-[var(--ink-teal)] hover:underline hover:underline-offset-4"
            >
              See the code on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
            <dl className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <div>
                <dt className="text-app-meta font-medium">Limits</dt>
                <dd className="mt-1 space-y-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                  {selected.limitations.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                  <p>Owning a repo doesn&apos;t prove who wrote each line.</p>
                </dd>
              </div>
              {selectedProject?.contributionStatement ? (
                <div>
                  <dt className="text-app-meta font-medium">Candidate statement</dt>
                  <dd className="mt-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">“{selectedProject.contributionStatement}”</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : (
        <p className="border-b border-[var(--border-subtle)] px-5 py-8 text-app-body text-[var(--text-secondary)] sm:px-6">
          Nothing here yet. Examples appear once the repos are analyzed.
        </p>
      )}

      {passport.roleSuggestions.length > 0 ? (
        <section aria-labelledby="roles-heading" className="pp-section">
          <h3 id="roles-heading" className="pp-title">
            Roles this fits
          </h3>
          <ul className="pp-rows mt-4">
            {passport.roleSuggestions.map((role) => (
              <li key={role.family} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-app-body font-semibold">{ROLE_LABEL[role.family] ?? role.family}</p>
                  <span className={`badge ${role.status === "supported" ? "badge-teal" : "badge-attention"}`}>
                    {role.status === "supported" ? "Fits well" : "Partly fits"}
                  </span>
                </div>
                <p className="mt-1.5 text-app-meta leading-[1.5] text-[var(--text-secondary)]">{role.requirement}</p>
                <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">{role.evidenceIds.length} examples</p>
                {role.gaps.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-[var(--border-subtle)] pt-2">
                    {role.gaps.map((g) => (
                      <li key={g} className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">No evidence for: {g}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="pp-foot">
        A passport shows what was found in public repos. It is not a certificate. What&apos;s missing says nothing about what someone
        can do.
      </footer>
    </div>
  );
}
