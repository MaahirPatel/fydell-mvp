"use client";

import { useState } from "react";
import { Eye, FileCode2, Lock } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import { PROJECT_STATE_LABEL, TEAM_LABEL, formatPeriod } from "@/lib/passport/presentation";
import { CATEGORY_LABEL } from "@/lib/passport/record-states";
import { EXAMPLE_PRESENTATIONS, EXAMPLE_PRIVATE_PROJECT, EXAMPLE_PROJECTS } from "./fixture";
import s from "./screens.module.css";

const ORIGIN = {
  github: "Public repository, analyzed",
  upload: "Uploaded source, analyzed",
  manual: "Engineer's description, no source analyzed",
} as const;

const NAV = ["Profile", "Passport", "Applications", "Evaluations"] as const;

/**
 * The engineer's Passport as they see it: projects on the left, the selected
 * project in the middle, and one finding with its cited lines on the right.
 * Labels, origins and limits are the product's own; the data is the example
 * fixture.
 */
export default function ProfileWorkspace() {
  const [projectKey, setProjectKey] = useState<string>(EXAMPLE_PRESENTATIONS[0].projectKey);
  const item = EXAMPLE_PRESENTATIONS.find((p) => p.projectKey === projectKey) ?? EXAMPLE_PRESENTATIONS[0];
  const project = EXAMPLE_PROJECTS.find((p) => p.repoFullName === item.projectKey);
  const [findingId, setFindingId] = useState<string | null>(EXAMPLE_PROJECTS[0].evidence[0].id);
  const finding = project?.evidence.find((e) => e.id === findingId) ?? project?.evidence[0] ?? null;

  const choose = (key: string) => {
    setProjectKey(key);
    const next = EXAMPLE_PROJECTS.find((p) => p.repoFullName === key);
    setFindingId(next?.evidence[0]?.id ?? null);
  };

  const period = formatPeriod(item.startedOn, item.endedOn, item.projectState);
  const contribution = item.sourceKind === "manual" ? item.contribution : project?.contributionStatement ?? "";

  return (
    <div className={s.app}>
      <div className={s.appHeader}>
        <span className={s.appLogo}>
          <FydellLogo height={16} />
        </span>
        <nav className={s.appNav} aria-label="Example product navigation">
          {NAV.map((label) => (
            <span key={label} className={label === "Passport" ? s.appNavOn : s.appNavItem}>
              {label}
            </span>
          ))}
        </nav>
        <span className={s.appHeaderRight}>
          <span>Help</span>
          <span>Settings</span>
        </span>
      </div>

      <div className={s.workspace}>
        <aside className={s.wsList} aria-label="Projects">
          <div className={s.wsListHead}>
            <p className={s.wsHeading}>Projects</p>
            <p className={s.wsMeta}>2 featured · 1 private</p>
          </div>
          <ul className={s.projectList}>
            {EXAMPLE_PRESENTATIONS.map((p) => {
              const proj = EXAMPLE_PROJECTS.find((x) => x.repoFullName === p.projectKey);
              const active = p.projectKey === item.projectKey;
              return (
                <li key={p.projectKey}>
                  <button type="button" aria-pressed={active} onClick={() => choose(p.projectKey)} className={active ? s.projectOn : s.project}>
                    <span className={s.projectTitle}>
                      {p.title}
                      {p.featured ? <span className={s.featured}>Featured</span> : null}
                    </span>
                    <span className={s.projectMeta}>{ORIGIN[p.sourceKind]}</span>
                    <span className={s.projectState}>
                      <Eye aria-hidden size={13} /> Shareable
                      {proj ? <span className={s.projectCount}>{proj.evidence.length} cited findings</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <div className={s.projectMuted}>
                <span className={s.projectTitle}>{EXAMPLE_PRIVATE_PROJECT.title}</span>
                <span className={s.projectMeta}>{EXAMPLE_PRIVATE_PROJECT.origin}</span>
                <span className={s.projectState}>
                  <Lock aria-hidden size={13} /> Private, never shared
                </span>
              </div>
            </li>
          </ul>
        </aside>

        <section className={s.wsDetail} aria-live="polite">
          <p className={s.wsMeta}>
            {[ORIGIN[item.sourceKind], PROJECT_STATE_LABEL[item.projectState], TEAM_LABEL[item.teamContext], period].filter(Boolean).join(" · ")}
          </p>
          <p className={s.detailTitle}>{item.title}</p>
          <p className={s.detailSummary}>{item.summary}</p>
          {contribution ? (
            <div className={s.detailBlock}>
              <p className={s.blockLabel}>Your part</p>
              <p className={s.blockText}>{contribution}</p>
              <p className={s.blockNote}>Your statement. Recipients see it labelled as yours.</p>
            </div>
          ) : null}
          {item.sourceKind === "manual" && item.outcomes ? (
            <div className={s.detailBlock}>
              <p className={s.blockLabel}>Outcomes, as stated</p>
              <p className={s.blockText}>{item.outcomes}</p>
            </div>
          ) : null}
          <ul className={s.tech} aria-label="Technologies">
            {item.technologies.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {project ? (
            <div className={s.detailBlock}>
              <p className={s.blockLabel}>
                Findings · {project.coverage.analyzedFiles} of {project.coverage.totalFiles} files read
              </p>
              <ul className={s.findingList}>
                {project.evidence.map((e) => {
                  const active = e.id === finding?.id;
                  return (
                    <li key={e.id}>
                      <button type="button" aria-pressed={active} onClick={() => setFindingId(e.id)} className={active ? s.findingOn : s.finding}>
                        <span className={s.findingCat}>{CATEGORY_LABEL[e.category] ?? e.category}</span>
                        <span className={s.findingText}>{e.finding}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className={s.detailBlock}>
              <p className={s.blockLabel}>Findings</p>
              <p className={s.blockText}>No source was analyzed for this project, so it has no findings. Recipients see it as your description.</p>
            </div>
          )}
        </section>

        <section className={s.wsEvidence} aria-label="Selected finding">
          {finding ? (
            <>
              <p className={s.wsMeta}>
                <FileCode2 aria-hidden size={13} className={s.inlineIcon} /> From code · authorship not checked
              </p>
              <p className={s.evidenceTitle}>{finding.finding}</p>
              <div className={s.evidenceCode}>
                <CodeBlock
                  path={finding.path}
                  meta={project?.sourceKind === "upload" ? "uploaded source" : project?.commitSha.slice(0, 7)}
                  lines={finding.excerpt.map((text, i) => ({ n: finding.startLine + i, text, mark: "cited" as const }))}
                  compact
                />
              </div>
              <p className={s.blockLabel}>What this doesn&apos;t show</p>
              <ul className={s.limits}>
                {finding.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className={s.wsMeta}>Engineer&apos;s description</p>
              <p className={s.evidenceTitle}>Nothing to cite</p>
              <p className={s.blockText}>Described projects carry no findings. A recipient sees the description and the label that says no source was analyzed.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
