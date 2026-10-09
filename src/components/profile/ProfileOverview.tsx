import Link from "next/link";
import { ArrowUpRight, Check, FolderGit2, GitCommitHorizontal, Globe, Link2, MapPin, MessageSquareQuote } from "lucide-react";
import { GitHubLogo, SOCIAL_INK, SOCIAL_LOGO } from "@/components/profile/SocialIcons";
import type { CapabilitySummary, PassportProject } from "@/lib/passport/view";
import { PROJECT_STATE_LABEL, TEAM_LABEL, formatPeriod, type ProjectPresentation } from "@/lib/passport/presentation";
import type { RoleSuggestion } from "@/lib/passport/github/types";
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_TONE } from "@/lib/passport/record-states";
import { OPEN_TO_LABEL, PROVIDER_LABELS, SOCIAL_LABEL, type EngineerProfile, type SocialKind, type TimelineItem } from "@/lib/profile/types";
import type { ProfileSimulation } from "@/lib/profile/simulations";
import { socialDisplay } from "@/lib/profile/social";
import { Status } from "@/components/ui/report";
import Avatar from "@/components/profile/Avatar";
import HowIBuildEditor from "@/components/profile/HowIBuildEditor";
import { BASIS_STYLE, BasisChip, BasisLegend, CoverageTag } from "@/components/passport/EvidenceTags";
import type { ProfileCapabilityGroup, ProfileProjectDigest } from "@/lib/passport/capability/profile";
import type { ProjectRelationship } from "@/lib/passport/context-contract";

/** A released work-sample report the engineer added to their Passport. Owner view only. */
export type TaskDemonstrationItem = { id: string; title: string; organization: string | null; summary: string; checks: string[]; unresolved: string[]; releasedAt: string | null; href: string };

type Account = { provider: keyof typeof PROVIDER_LABELS; label: string };

const ROLE_LABEL: Record<RoleSuggestion["family"], string> = {
  backend: "Backend engineering",
  frontend: "Frontend engineering",
  full_stack: "Full-stack engineering",
  applied_ai: "Applied AI engineering",
  ml_engineering: "ML engineering",
};

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function repoName(full: string): string {
  return full.split("/").pop() ?? full;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Category counts across projects, ordered by how much evidence each has. */
function strengths(projects: PassportProject[]) {
  const by = new Map<string, number>();
  for (const p of projects) for (const e of p.evidence) by.set(e.category, (by.get(e.category) ?? 0) + 1);
  return [...by.entries()]
    .map(([key, findings]) => ({ key, findings }))
    .sort(
      (a, b) =>
        b.findings - a.findings ||
        CATEGORY_ORDER.indexOf(a.key as (typeof CATEGORY_ORDER)[number]) - CATEGORY_ORDER.indexOf(b.key as (typeof CATEGORY_ORDER)[number]),
    );
}

function languages(projects: PassportProject[]): string[] {
  const by = new Map<string, number>();
  for (const p of projects) {
    const langs = new Set([...(p.coverage.languages ?? []), ...(p.primaryLanguage ? [p.primaryLanguage] : [])]);
    for (const l of langs) by.set(l, (by.get(l) ?? 0) + 1);
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}

function topAreas(p: PassportProject): string[] {
  const counts = new Map<string, number>();
  for (const e of p.evidence) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
}

function SectionTitle({ id, children, aside }: { id: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-2.5">
      <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        {children}
      </h2>
      {aside}
    </div>
  );
}

function SideTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[13px] font-medium text-[var(--text-tertiary)]">
      {children}
    </h2>
  );
}

const quietLink = "text-[13px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4";

const ORIGIN: Record<ProjectPresentation["sourceKind"], string> = {
  github: "Public repository, analyzed",
  upload: "Uploaded source, analyzed",
  manual: "Engineer's description, no source analyzed",
};

/** Conventional language colours, used only as a small identity dot. */
const LANGUAGE_DOT: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#b08800",
  Python: "#3572a5",
  Go: "#00838f",
  Rust: "#a0522d",
  Java: "#b07219",
  Ruby: "#a91401",
  "C#": "#178600",
  Kotlin: "#7f52ff",
  Swift: "#e05d44",
};

function relationshipLine(r: ProjectRelationship, mode: "owner" | "shared"): string | null {
  const you = mode === "owner";
  const map: Record<ProjectRelationship, string | null> = {
    unspecified: null,
    maintained: you ? "You maintain this project" : "Maintained by the engineer",
    contributor: you ? "You contributed to it" : "The engineer contributed to it",
    team_project: "Team project",
    fork: you ? "Your fork of another project" : "The engineer's fork of another project",
    learning_exercise: "Learning exercise",
    reference: you ? "Reference only, not your work" : "Reference only, not the engineer's work",
  };
  return map[r];
}

function ProjectCardBody({
  digest,
  mode,
  reportHref,
  fallbackStatement,
}: {
  digest: ProfileProjectDigest | undefined;
  mode: "owner" | "shared";
  reportHref: string | null;
  fallbackStatement: string;
}) {
  const relationship = digest ? relationshipLine(digest.relationship, mode) : null;
  const statement = digest?.statement ?? (fallbackStatement || null);
  return (
    <>
      {digest ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-app-meta">
          <span className={`inline-flex items-center gap-1 font-semibold ${digest.personClaimsAllowed ? "text-[var(--accent-ink)]" : "text-[var(--text-secondary)]"}`}>
            {digest.personClaimsAllowed ? <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden /> : <FolderGit2 className="h-3.5 w-3.5" aria-hidden />}
            {digest.personClaimsAllowed ? (digest.attribution === "partial_commit_signal" ? "Partly linked by commits" : "Linked by commits") : "Project findings only"}
          </span>
          {relationship ? <span className="text-[var(--text-secondary)]">{relationship}</span> : null}
        </p>
      ) : null}
      {statement ? (
        <p className="mt-2 flex max-w-[68ch] items-start gap-2 text-app-body leading-[1.55] text-[var(--text-body)]">
          <MessageSquareQuote className="mt-[3px] h-4 w-4 shrink-0" style={{ color: BASIS_STYLE.engineer_statement.ink }} aria-label="Engineer statement" />
          <span>{statement}</span>
        </p>
      ) : null}
      {digest?.top.length ? (
        <ul className="mt-3 space-y-2">
          {digest.top.map((t) => {
            const href = mode === "owner" ? `/app/candidate/projects/${digest.snapshotId}${t.findingId ? `?finding=${encodeURIComponent(t.findingId)}` : ""}` : null;
            return (
              <li key={t.title} className="flex items-start gap-2">
                {t.scope === "person" ? (
                  <GitCommitHorizontal className="mt-[3px] h-4 w-4 shrink-0 text-[var(--accent)]" aria-label="Linked by commits" />
                ) : (
                  <FolderGit2 className="mt-[3px] h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-label="Project only" />
                )}
                {href ? (
                  <Link href={href} className="text-app-prose font-medium leading-[1.45] text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                    {t.title}
                  </Link>
                ) : (
                  <span className="text-app-prose font-medium leading-[1.45] text-[var(--text-primary)]">{t.title}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : digest ? (
        <p className="mt-3 text-app-body text-[var(--text-secondary)]">
          {digest.narrowed ? `No finding supports a capability on its own; ${plural(digest.narrowed, "finding")} narrowed.` : "No capability found in the analyzed files."}
        </p>
      ) : null}
      {digest && (digest.narrowed || digest.contradictions) ? (
        <p className="mt-2 flex flex-wrap gap-x-3 text-app-meta">
          {digest.narrowed ? <span className="font-medium text-[var(--badge-attention-ink)]">{plural(digest.narrowed, "finding")} narrowed</span> : null}
          {digest.contradictions ? <span className="font-medium text-[var(--badge-failed-ink)]">{plural(digest.contradictions, "comment")} the code contradicts</span> : null}
        </p>
      ) : null}
      {reportHref && digest ? (
        <Link href={reportHref} className="mt-3 inline-flex items-center gap-1 text-app-control font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
          Builder Report{digest.reportVersion ? `, version ${digest.reportVersion}` : ""}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </>
  );
}

function ProjectBand({ owner, name, href, language, linked }: { owner: string | null; name: string; href: string | null; language: string | null; linked: boolean | null }) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 pb-3 pt-3.5"
      style={{ background: linked ? "linear-gradient(120deg, var(--accent-soft), var(--surface-intelligence))" : "var(--surface-panel)" }}
    >
      <div className="min-w-0">
        {owner ? <p className="truncate font-mono text-app-meta text-[var(--text-secondary)]">{owner}/</p> : null}
        <h3 className="break-words text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)] [overflow-wrap:anywhere]">
          {href ? (
            <Link href={href} className="hover:underline hover:underline-offset-4">
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>
      </div>
      {language ? (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-app-meta font-medium text-[var(--text-primary)]">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: LANGUAGE_DOT[language] ?? "var(--text-tertiary)" }} />
          {language}
        </span>
      ) : null}
    </div>
  );
}

function ProjectEntry({
  item,
  project,
  digest,
  mode,
  featured,
}: {
  item: ProjectPresentation;
  project: PassportProject | undefined;
  digest: ProfileProjectDigest | undefined;
  mode: "owner" | "shared";
  featured: boolean;
}) {
  const period = formatPeriod(item.startedOn, item.endedOn, item.projectState);
  const meta = [
    ORIGIN[item.sourceKind],
    item.projectState !== "unspecified" ? PROJECT_STATE_LABEL[item.projectState] : null,
    item.teamContext !== "unspecified" ? TEAM_LABEL[item.teamContext] : null,
    period || null,
  ].filter(Boolean);
  const reportHref = mode === "owner" && project?.id ? `/app/candidate/projects/${project.id}` : null;
  const contribution = item.sourceKind === "manual" ? item.contribution : project?.contributionStatement ?? "";
  const image = featured && item.image?.url ? item.image : null;
  const owner = project && project.sourceKind !== "upload" ? project.repoFullName.split("/")[0] : null;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      {image ? (
        <div className="aspect-[16/9] w-full shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-deep)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL; next/image would cache it past expiry */}
          <img src={image.url} alt={image.alt} width={1600} height={900} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <ProjectBand owner={owner} name={item.title} href={reportHref} language={project?.primaryLanguage ?? null} linked={digest ? digest.personClaimsAllowed : null} />
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
          {[...meta, project ? plural(project.evidence.length, "cited finding") : null].filter(Boolean).join(" · ")}
          {mode === "owner" && item.visibility === "private" ? " · Private, never shared" : ""}
          {mode === "owner" && !item.confirmedAt ? " · Draft from the analysis, not confirmed" : ""}
        </p>
        {item.summary ? <p className="mt-2 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-body)]">{item.summary}</p> : null}
        <ProjectCardBody digest={digest} mode={mode} reportHref={reportHref} fallbackStatement={contribution} />
        {item.sourceKind === "manual" && item.outcomes ? (
          <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">Outcomes, as stated: </span>
            {item.outcomes}
          </p>
        ) : null}
        {item.technologies.some((t) => t !== project?.primaryLanguage) ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
            {item.technologies.filter((t) => t !== project?.primaryLanguage).map((t) => (
              <li key={t} className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-2 py-0.5 text-app-meta font-medium text-[var(--text-secondary)]">
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        {item.links.length || (reportHref && !digest) ? (
          <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-[13px]">
            {reportHref && !digest ? (
              <Link href={reportHref} className="font-medium text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                Builder Report
              </Link>
            ) : null}
            {item.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline hover:underline-offset-4"
              >
                {l.label || host(l.url)}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function CapabilityGroups({ groups, mode, projectCount }: { groups: ProfileCapabilityGroup[]; mode: "owner" | "shared"; projectCount: number }) {
  if (!groups.length) {
    return (
      <p className="mt-3 max-w-[68ch] text-app-prose leading-[1.6] text-[var(--text-secondary)]">
        {mode === "shared"
          ? "No project report is shared with this link yet. The projects below still show their cited findings."
          : projectCount
            ? "No project report has a capability yet. Open a project and build its report to see what the code shows."
            : "Import a project to see what its code shows."}
      </p>
    );
  }
  const you = mode === "owner" ? "you" : "the engineer";
  const supported = groups.filter((g) => g.coverage === "supports");
  const rest = groups.filter((g) => g.coverage !== "supports");
  const linked = groups.reduce((n, g) => n + g.linked, 0);
  const projectOnly = groups.reduce((n, g) => n + g.projectOnly, 0);
  const contradicted = groups.filter((g) => g.contradictedIn.length).length;
  const tiles = [
    { label: "Requirements the code supports", value: supported.length, tone: { bg: "var(--accent)", ink: "#ffffff", sub: "rgba(255,255,255,0.86)" } },
    { label: "Partly supported", value: groups.filter((g) => g.coverage === "partially_supports").length, tone: { bg: "var(--accent-soft)", ink: "var(--accent-ink)", sub: "var(--text-secondary)" } },
    { label: `Linked to ${you} by commits`, value: linked, tone: { bg: "var(--surface-intelligence)", ink: "var(--ink-violet)", sub: "var(--text-secondary)" } },
    { label: "Seen in a project only", value: projectOnly, tone: { bg: "var(--surface-panel)", ink: "var(--text-primary)", sub: "var(--text-secondary)" } },
    ...(contradicted ? [{ label: "Contradicted in a project", value: contradicted, tone: { bg: "var(--badge-failed-bg)", ink: "var(--badge-failed-ink)", sub: "var(--text-secondary)" } }] : []),
  ];
  return (
    <div className="mt-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[8px] px-3.5 py-3" style={{ background: t.tone.bg }}>
            <dd className="text-[26px] font-semibold leading-none tabular-nums tracking-[-0.02em]" style={{ color: t.tone.ink }}>
              {t.value}
            </dd>
            <dt className="mt-1.5 text-app-meta font-medium leading-[1.35]" style={{ color: t.tone.sub }}>
              {t.label}
            </dt>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-app-meta text-[var(--text-secondary)]">Evidence kinds</span>
        <BasisLegend />
      </div>

      {supported.length ? (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {supported.map((g) => (
            <GroupCard key={g.requirementId} g={g} mode={mode} />
          ))}
        </ul>
      ) : null}
      {rest.length ? (
        <>
          <h3 className="mt-6 text-app-control font-semibold text-[var(--text-primary)]">Partly covered or contradicted</h3>
          <ul className="mt-2 grid gap-3 md:grid-cols-2">
            {rest.map((g) => (
              <GroupCard key={g.requirementId} g={g} mode={mode} />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function GroupCard({ g, mode }: { g: ProfileCapabilityGroup; mode: "owner" | "shared" }) {
  const you = mode === "owner" ? "you" : "the engineer";
  return (
    <li className="flex flex-col overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div className="px-4 pb-3 pt-3.5" style={{ background: g.linked ? "var(--accent-soft)" : "var(--surface-panel)" }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)]">{g.label}</h3>
          <CoverageTag coverage={g.coverage} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-app-meta">
          {g.linked ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--accent-ink)]">
              <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden />
              {g.linked} linked to {you} by commits
            </span>
          ) : null}
          {g.projectOnly ? (
            <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
              <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
              {g.projectOnly} in a project only
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <ul className="space-y-2">
          {g.examples.map((e) => {
            const href =
              mode === "owner" && e.snapshotId
                ? `/app/candidate/projects/${e.snapshotId}${e.findingId ? `?finding=${encodeURIComponent(e.findingId)}` : "?view=capabilities"}`
                : null;
            return (
              <li key={`${e.project}-${e.title}`} className="flex items-start gap-2">
                {e.scope === "person" ? (
                  <GitCommitHorizontal className="mt-[3px] h-4 w-4 shrink-0 text-[var(--accent)]" aria-label="Linked by commits" />
                ) : (
                  <FolderGit2 className="mt-[3px] h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-label="Project only" />
                )}
                <span className="min-w-0">
                  {href ? (
                    <Link href={href} className="text-app-body font-medium leading-[1.5] text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                      {e.title}
                    </Link>
                  ) : (
                    <span className="text-app-body font-medium leading-[1.5] text-[var(--text-primary)]">{e.title}</span>
                  )}
                  <span className="block font-mono text-app-meta text-[var(--text-tertiary)]">{e.project}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {g.contradictedIn.length ? (
          <p className="mt-3 text-app-meta font-medium text-[var(--badge-failed-ink)]">Contradicted in {g.contradictedIn.join(", ")}: comments claim behaviour the code does not have.</p>
        ) : null}
        {g.followUp ? (
          <div className="mt-auto pt-3">
            <p className="rounded-[6px] bg-[var(--surface-panel)] px-3 py-2 text-app-control leading-[1.5] text-[var(--text-body)]">
              <span className="font-semibold text-[var(--text-primary)]">Ask: </span>
              {g.followUp}
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function TaskDemonstrations({ items }: { items: TaskDemonstrationItem[] }) {
  return (
    <ul className="mt-4 grid gap-3 md:grid-cols-2">
      {items.map((t) => (
        <li key={t.id} className="overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
          <div className="px-4 pb-3 pt-3.5" style={{ background: BASIS_STYLE.task_demonstration.bg }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BasisChip basis="task_demonstration" />
              {t.releasedAt ? <span className="text-app-meta text-[var(--text-secondary)]">Released {shortDate(t.releasedAt)}</span> : null}
            </div>
            <h3 className="mt-2 text-[18px] font-semibold leading-[1.3] text-[var(--text-primary)]">
              <Link href={t.href} className="hover:underline hover:underline-offset-4">
                {t.title}
              </Link>
            </h3>
            {t.organization ? <p className="mt-0.5 text-app-meta text-[var(--text-secondary)]">{t.organization}</p> : null}
          </div>
          <div className="px-4 pb-4 pt-3">
            {t.checks.length ? (
              <ul className="space-y-1.5">
                {t.checks.slice(0, 4).map((c) => {
                  const passed = /:\s*passed$/i.test(c);
                  return (
                    <li key={c} className="flex min-w-0 items-start gap-2 text-app-body leading-[1.5] text-[var(--text-body)]">
                      {passed ? <Check className="mt-[3px] h-4 w-4 shrink-0 text-[var(--badge-success-ink)]" aria-label="Passed in a recorded run" /> : null}
                      <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-app-body text-[var(--text-secondary)]">{t.summary}</p>
            )}
            {t.unresolved.length ? <p className="mt-2 text-app-meta text-[var(--text-tertiary)] [overflow-wrap:anywhere]">{t.unresolved.slice(0, 2).join(" ")}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PresentedProjects({
  presentations,
  projects,
  digests,
  mode,
}: {
  presentations: ProjectPresentation[];
  projects: PassportProject[];
  digests: Record<string, ProfileProjectDigest>;
  mode: "owner" | "shared";
}) {
  const byRepo = new Map(projects.map((p) => [p.repoFullName.toLowerCase(), p]));
  const ordered = [...presentations.filter((p) => p.featured), ...presentations.filter((p) => !p.featured)];
  return (
    <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Projects">
      {ordered.map((item) => {
        const project = byRepo.get(item.projectKey.toLowerCase());
        return (
          <li key={item.projectKey}>
            <ProjectEntry item={item} project={project} digest={project?.id ? digests[project.id] : undefined} mode={mode} featured={item.featured} />
          </li>
        );
      })}
    </ul>
  );
}

export default function ProfileOverview({
  profile,
  accounts,
  projects,
  capabilities,
  roleSuggestions,
  simulations,
  timeline,
  mode,
  actions,
  emptyAbout,
  presentations,
  capabilityGroups,
  projectDigests = {},
  taskDemonstrations,
}: {
  /** Capability groups from stored project reports. When given, they replace the older project-scoped statements. */
  capabilityGroups?: ProfileCapabilityGroup[];
  /** Latest stored report per snapshot id, for the project cards. */
  projectDigests?: Record<string, ProfileProjectDigest>;
  /** Owner view only: released work-sample reports the engineer added to their Passport. */
  taskDemonstrations?: TaskDemonstrationItem[];
  profile: EngineerProfile;
  accounts: Account[];
  /** Current (not superseded) projects. */
  projects: PassportProject[];
  /** Engineer-authored presentation, already filtered to what this viewer may see. */
  presentations?: ProjectPresentation[];
  capabilities: CapabilitySummary | null;
  roleSuggestions: RoleSuggestion[];
  /** Owner view only; evaluation results are never part of a shared profile. */
  simulations?: ProfileSimulation[];
  timeline: TimelineItem[];
  mode: "owner" | "shared";
  actions?: React.ReactNode;
  /** Owner-only prompt shown when About is empty. */
  emptyAbout?: React.ReactNode;
}) {
  const github = accounts.find((a) => a.provider === "github")?.label ?? null;
  const findings = projects.reduce((n, p) => n + p.evidence.length, 0);
  const areas = strengths(projects);
  const langs = languages(projects);
  const ordered = [...projects].sort((a, b) => b.evidence.length - a.evidence.length);
  const activity = timeline.filter((t) => t.kind !== "editor-import" || mode === "owner").slice(0, 6);
  const open = profile.openTo && profile.openTo !== "not_looking";

  const repoByEvidence = new Map<string, string>();
  for (const p of projects) for (const e of p.evidence) repoByEvidence.set(e.id, repoName(p.repoFullName));
  const experience = (capabilities?.capabilities ?? [])
    .map((c) => ({
      statement: c.statement,
      cited: c.evidenceIds.filter((id) => repoByEvidence.has(id)).length,
      repos: [...new Set(c.evidenceIds.map((id) => repoByEvidence.get(id)).filter((r): r is string => Boolean(r)))],
    }))
    .filter((c) => c.cited > 0);
  const roles = roleSuggestions.filter((r) => r.evidenceIds.length > 0);

  type ProfileLinkItem = { key: string; label: string; href: string; Icon: (p: { className?: string }) => React.ReactNode; ink?: string };
  const socialLink = (kind: SocialKind): ProfileLinkItem[] =>
    profile.social[kind] ? [{ key: kind, label: socialDisplay(kind, profile.social[kind]), href: profile.social[kind], Icon: SOCIAL_LOGO[kind], ink: SOCIAL_INK[kind] }] : [];
  const profileLinks: ProfileLinkItem[] = [
    ...socialLink("x"),
    ...socialLink("instagram"),
    ...socialLink("linkedin"),
    ...(github ? [{ key: "github", label: github, href: `https://github.com/${github}`, Icon: GitHubLogo, ink: SOCIAL_INK.github }] : []),
    ...(profile.website ? [{ key: "website", label: host(profile.website), href: profile.website, Icon: Globe }] : []),
    ...profile.links.map((l, i) => ({ key: `link-${i}`, label: l.label || host(l.url), href: l.url, Icon: Link2 })),
  ];

  const figures = [
    { label: "Repositories analyzed", value: String(projects.length) },
    { label: "Source-linked findings", value: String(findings) },
    { label: "Languages", value: String(langs.length) },
    ...(mode === "owner" && simulations ? [{ label: "Evaluations completed", value: String(simulations.length) }] : []),
  ];

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
          <div className="min-w-0 sm:pt-0.5">
            <h1 className="text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">{profile.displayName || "Your name"}</h1>
            {profile.headline ? <p className="mt-1 max-w-[62ch] text-[15px] leading-[1.5] text-[var(--text-body)]">{profile.headline}</p> : null}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[var(--text-secondary)]">
              {profile.role ? <span>{profile.role}</span> : null}
              {profile.role && profile.location ? <span aria-hidden className="text-[var(--border-strong)]">·</span> : null}
              {profile.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
                  {profile.location}
                </span>
              ) : null}
              {profile.openTo ? <Status kind={open ? "success" : "neutral"}>{OPEN_TO_LABEL[profile.openTo]}</Status> : null}
            </p>
            {profileLinks.length ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Profiles and links">
                {profileLinks.map(({ key, label, href, Icon, ink }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] pl-1 pr-3 text-app-meta font-medium text-[var(--text-primary)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                      aria-label={key in SOCIAL_LABEL ? `${SOCIAL_LABEL[key as SocialKind]}: ${label}` : key === "github" ? `GitHub: ${label}` : undefined}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-panel)]"
                        style={ink ? { color: ink } : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <dl className="mt-6 grid grid-cols-2 border-y border-[var(--border-subtle)] sm:grid-cols-4">
        {figures.map((f, i) => (
          <div key={f.label} className={`px-1 py-3 sm:px-5 ${i > 0 ? "sm:border-l sm:border-[var(--border-subtle)]" : "sm:pl-0"}`}>
            <dt className="text-app-meta text-[var(--text-tertiary)]">{f.label}</dt>
            <dd className="mt-0.5 text-[18px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--text-primary)]">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-10">
          {profile.bio || emptyAbout ? (
            <section aria-labelledby="about-heading">
              <SectionTitle id="about-heading">About</SectionTitle>
              {profile.bio ? (
                <div className="mt-3 max-w-[68ch] space-y-3 text-[14px] leading-[1.65] text-[var(--text-body)]">
                  {profile.bio.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="mt-4">{emptyAbout}</div>
              )}
            </section>
          ) : null}

          {mode === "owner" || profile.howIBuild ? (
            <section aria-labelledby="how-i-build-heading">
              <SectionTitle
                id="how-i-build-heading"
                aside={mode === "owner" ? <HowIBuildEditor initial={profile.howIBuild} /> : null}
              >
                How I build
              </SectionTitle>
              {profile.howIBuild ? (
                <>
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                    {mode === "owner" ? (
                      profile.howIBuild.includeInShares ? (
                        <Status kind="neutral">Included in share links</Status>
                      ) : (
                        <Status kind="neutral">Private</Status>
                      )
                    ) : null}
                    <span>
                      {mode === "owner"
                        ? profile.howIBuild.includeInShares
                          ? "Your own statement, shown to recipients as yours. Fydell has not checked it."
                          : "Only you see this. Share links leave it out until you include it."
                        : "The engineer's own statement. Fydell has not checked it."}
                    </span>
                  </p>
                  <div className="mt-3 max-w-[68ch] space-y-3 text-[14px] leading-[1.65] text-[var(--text-body)]">
                    {profile.howIBuild.text.split(/\n{2,}/).map((para, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                  Optional. Describe your working style, how you test, and how you use AI tools. Private until you choose to include it in share links.
                </p>
              )}
            </section>
          ) : null}

          <section aria-labelledby="experience-heading">
            <SectionTitle
              id="experience-heading"
              aside={mode === "shared" ? <a href="#evidence" className={quietLink}>See the code</a> : null}
            >
              What the code shows
            </SectionTitle>
            {capabilityGroups ? (
              <CapabilityGroups groups={capabilityGroups} mode={mode} projectCount={projects.length} />
            ) : experience.length ? (
              <>
                <p className="mt-4 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                  What Fydell found across {projects.length} {projects.length === 1 ? "project" : "projects"}. Every line is backed by cited source lines, not by what the engineer says about the work.
                </p>
                <ul className="mt-5 space-y-4">
                  {experience.map((c) => (
                    <li key={c.statement} className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-3">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
                      <div>
                        <p className="text-[14px] leading-[1.55] text-[var(--text-primary)]">{c.statement}</p>
                        <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">
                          {plural(c.cited, "cited example")} · {c.repos.join(", ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {capabilities?.source === "rules" ? (
                  <p className="mt-5 text-[13px] text-[var(--text-tertiary)]">Grouped by rules from the source-linked findings.</p>
                ) : null}
              </>
            ) : (
              <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                {mode === "owner"
                  ? "Add a public repository and Fydell writes this section from what the code shows, with every line linked to its source."
                  : "Nothing was found in the shared repositories yet."}
              </p>
            )}
          </section>

          <section aria-labelledby="projects-heading">
            <SectionTitle
              id="projects-heading"
              aside={mode === "owner" ? <Link href="/app/candidate/work-record#showcase" className={quietLink}>Manage</Link> : null}
            >
              Projects
            </SectionTitle>
            {presentations && presentations.length ? (
              <PresentedProjects presentations={presentations} projects={projects} digests={projectDigests} mode={mode} />
            ) : ordered.length ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {ordered.map((p) => {
                  const top = topAreas(p);
                  const internal = mode === "owner" && p.id ? `/app/candidate/projects/${p.id}` : null;
                  const digest = p.id ? projectDigests[p.id] : undefined;
                  return (
                    <li key={p.repoFullName}>
                      <article className="flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
                        <ProjectBand
                          owner={p.sourceKind === "upload" ? null : p.repoFullName.split("/")[0]}
                          name={repoName(p.repoFullName)}
                          href={internal}
                          language={p.primaryLanguage}
                          linked={digest ? digest.personClaimsAllowed : null}
                        />
                        <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
                          <p className="mt-1 text-app-meta tabular-nums text-[var(--text-tertiary)]">
                            {p.sourceKind === "upload" ? "Uploaded by the engineer · " : ""}
                            {plural(p.evidence.length, "cited finding")}
                            {shortDate(p.analyzedAt) ? ` · Analyzed ${shortDate(p.analyzedAt)}` : ""}
                          </p>
                          <ProjectCardBody digest={digest} mode={mode} reportHref={internal} fallbackStatement={p.contributionStatement ?? ""} />
                          {!digest && top.length ? (
                            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                              {top.map((k) => (
                                <li key={k} className="inline-flex items-center gap-1.5">
                                  <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_TONE[k] ?? "var(--text-tertiary)" }} />
                                  {CATEGORY_LABEL[k] ?? k}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {!internal && p.htmlUrl ? (
                            <a href={p.htmlUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-3 text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline">
                              Source on GitHub <ArrowUpRight className="h-3 w-3" aria-hidden />
                            </a>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="py-6">
                <p className="text-[14px] font-medium text-[var(--text-primary)]">No projects yet</p>
                <p className="mt-1 max-w-[56ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                  {mode === "owner"
                    ? "Add a public GitHub repository. Fydell reads the code and links each finding to the lines it came from."
                    : "This engineer has not shared any projects in this link."}
                </p>
                {mode === "owner" ? (
                  <Link
                    href="/app/candidate/work-record#add-repository"
                    className="mt-3 inline-flex h-8 items-center rounded-[8px] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
                  >
                    Add a repository
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          {mode === "owner" && taskDemonstrations?.length ? (
            <section aria-labelledby="tasks-heading">
              <SectionTitle id="tasks-heading">Task demonstrations</SectionTitle>
              <p className="mt-3 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
                Work samples whose released reports you added to your Passport. What they show comes from the recorded runs in the report, and is kept apart from what your repositories show.
              </p>
              <TaskDemonstrations items={taskDemonstrations} />
            </section>
          ) : null}

          {mode === "owner" && simulations ? (
            <section aria-labelledby="simulations-heading">
              <SectionTitle id="simulations-heading" aside={<Link href="/app/candidate" className={quietLink}>All evaluations</Link>}>
                Simulations
              </SectionTitle>
              <p className="mt-4 text-[13px] text-[var(--text-tertiary)]">Only you see this section. Results belong to the company that invited you and are never shown on a shared profile.</p>
              {simulations.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                  {simulations.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                      <div className="min-w-0">
                        <Link href={s.href} className="text-[14px] font-medium text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                          {s.title}
                        </Link>
                        <p className="text-[13px] text-[var(--text-tertiary)]">
                          {[s.organization, s.kind, s.receipt ? `Receipt ${s.receipt}` : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-[var(--text-secondary)]">
                        <Status kind={s.status === "Being reviewed" ? "pending" : "success"}>{s.status}</Status>
                        {shortDate(s.completedAt) ? <span className="tabular-nums">{shortDate(s.completedAt)}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 max-w-[60ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                  When a hiring team invites you to a simulation and you submit it, it appears here with its receipt.
                </p>
              )}
            </section>
          ) : null}

          {activity.length ? (
            <section aria-labelledby="activity-heading">
              <SectionTitle id="activity-heading">Activity</SectionTitle>
              <ol className="mt-1">
                {activity.map((item) => (
                  <li key={item.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 border-b border-[var(--border-subtle)] py-3 last:border-b-0">
                    <span className="pt-px text-[13px] tabular-nums text-[var(--text-tertiary)]">{shortDate(item.occurredAt)}</span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[var(--text-primary)]">
                        {item.kind === "github-project" ? `Analyzed ${repoName(item.title)}` : item.title}
                      </p>
                      <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                        {item.kind === "github-project"
                          ? item.detail.replace(/ · [0-9a-f]{7}$/, "")
                          : item.kind === "editor-import"
                            ? "Editor history you supplied. Not independently observed."
                            : item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20">
          <section aria-labelledby="strengths-heading">
            <SideTitle id="strengths-heading">Findings by area</SideTitle>
            {areas.length ? (
              <>
                <ul className="mt-3 space-y-2">
                  {areas.map((a) => (
                    <li key={a.key} className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="inline-flex items-center gap-2 text-[var(--text-primary)]">
                        <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_TONE[a.key] ?? "var(--accent)" }} />
                        {CATEGORY_LABEL[a.key] ?? a.key}
                      </span>
                      <span className="tabular-nums text-[var(--text-secondary)]">{a.findings}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-tertiary)]">A count of cited findings in the projects, not a rating of the engineer.</p>
              </>
            ) : (
              <p className="mt-2 text-[14px] leading-[1.6] text-[var(--text-secondary)]">Areas appear once a repository has been analyzed.</p>
            )}
          </section>

          {roles.length ? (
            <section aria-labelledby="roles-heading">
              <SideTitle id="roles-heading">Role areas with cited examples</SideTitle>
              <ul className="mt-3 space-y-2.5">
                {roles.map((r) => (
                  <li key={r.family} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-[var(--text-primary)]">{ROLE_LABEL[r.family] ?? r.family}</span>
                    <span className="text-[13px] text-[var(--text-tertiary)]">{r.status === "supported" ? "Examples cover it" : "Gaps remain"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {langs.length ? (
            <section aria-labelledby="languages-heading">
              <SideTitle id="languages-heading">Languages</SideTitle>
              <p className="mt-2 text-[14px] leading-[1.7] text-[var(--text-primary)]">{langs.join(", ")}</p>
            </section>
          ) : null}

          <section aria-labelledby="how-heading">
            <SideTitle id="how-heading">How this profile is built</SideTitle>
            <dl className="mt-3 space-y-2.5 text-[13px] leading-[1.55]">
              <div>
                <dt className="font-medium text-[var(--text-primary)]">Written by {mode === "owner" ? "you" : "the engineer"}</dt>
                <dd className="text-[var(--text-secondary)]">
                  Photo, name, headline, About, How I build, links, and each project&apos;s description, image, contribution and outcomes. Projects with no analyzed source say so.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--text-primary)]">Read from the code</dt>
                <dd className="text-[var(--text-secondary)]">What each project&apos;s code shows, cited findings, areas and languages, each linked to source lines. A capability is linked to the engineer only where their commits touch the cited files, and commits are a signal, not proof of authorship.</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
