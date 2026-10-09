import Link from "next/link";
import { ArrowUpRight, Github, Globe, Instagram, Link2, Linkedin, MapPin, Twitter } from "lucide-react";
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

type Account = { provider: keyof typeof PROVIDER_LABELS; label: string };

const ROLE_LABEL: Record<RoleSuggestion["family"], string> = {
  backend: "Backend engineering",
  frontend: "Frontend engineering",
  full_stack: "Full-stack engineering",
  applied_ai: "Applied AI engineering",
  ml_engineering: "ML engineering",
};

const SOCIAL_ICON: Record<SocialKind, typeof Linkedin> = { linkedin: Linkedin, x: Twitter, instagram: Instagram };

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

function ProjectEntry({
  item,
  project,
  mode,
  featured,
}: {
  item: ProjectPresentation;
  project: PassportProject | undefined;
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
  return (
    <article
      className={featured ? "flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]" : "py-4"}
    >
      {image ? (
        <div className="aspect-[16/9] w-full shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-deep)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage URL; next/image would cache it past expiry */}
          <img src={image.url} alt={image.alt} width={1600} height={900} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className={featured ? "flex flex-1 flex-col p-4" : ""}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[14px] font-semibold tracking-[-0.006em] text-[var(--text-primary)]">
          {reportHref ? (
            <Link href={reportHref} className="hover:underline hover:underline-offset-4">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        {project ? <span className="text-[13px] tabular-nums text-[var(--text-tertiary)]">{plural(project.evidence.length, "cited finding")}</span> : null}
      </div>
      <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">
        {meta.join(" · ")}
        {mode === "owner" && item.visibility === "private" ? " · Private, never shared" : ""}
        {mode === "owner" && !item.confirmedAt ? " · Draft from the analysis, not confirmed" : ""}
      </p>
      {item.summary ? (
        <p className={`mt-2.5 max-w-[68ch] leading-[1.6] text-[var(--text-body)] ${featured && !image ? "text-[15px]" : "text-[14px]"}`}>{item.summary}</p>
      ) : null}
      {item.purpose ? <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">{item.purpose}</p> : null}
      {contribution ? (
        <p className="mt-2.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{mode === "owner" ? "Your part: " : "Engineer's part: "}</span>
          {contribution}
        </p>
      ) : null}
      {item.sourceKind === "manual" && item.outcomes ? (
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Outcomes, as stated: </span>
          {item.outcomes}
        </p>
      ) : null}
      {item.technologies.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
          {item.technologies.map((t) => (
            <li key={t} className="rounded-[6px] bg-[var(--surface-selected)] px-2 py-0.5 text-app-meta text-[var(--text-secondary)]">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      {item.links.length || reportHref ? (
        <p className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${featured ? "mt-auto pt-4" : "mt-3"}`}>
          {reportHref ? (
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

function PresentedProjects({
  presentations,
  projects,
  mode,
}: {
  presentations: ProjectPresentation[];
  projects: PassportProject[];
  mode: "owner" | "shared";
}) {
  const byRepo = new Map(projects.map((p) => [p.repoFullName.toLowerCase(), p]));
  const featured = presentations.filter((p) => p.featured);
  const rest = presentations.filter((p) => !p.featured);
  return (
    <div>
      {featured.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Featured projects">
          {featured.map((item) => (
            <li key={item.projectKey}>
              <ProjectEntry item={item} project={byRepo.get(item.projectKey.toLowerCase())} mode={mode} featured />
            </li>
          ))}
        </ul>
      ) : null}
      {rest.length ? (
        <ul className={`divide-y divide-[var(--border-subtle)] ${featured.length ? "mt-4" : ""}`}>
          {rest.map((item) => (
            <li key={item.projectKey}>
              <ProjectEntry item={item} project={byRepo.get(item.projectKey.toLowerCase())} mode={mode} featured={false} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
}: {
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
  const maxFindings = areas[0]?.findings ?? 0;
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

  const profileLinks: { key: string; label: string; href: string; Icon: typeof Linkedin }[] = [
    ...(profile.social.linkedin ? [{ key: "linkedin", label: socialDisplay("linkedin", profile.social.linkedin), href: profile.social.linkedin, Icon: SOCIAL_ICON.linkedin }] : []),
    ...(github ? [{ key: "github", label: github, href: `https://github.com/${github}`, Icon: Github }] : []),
    ...(profile.social.x ? [{ key: "x", label: socialDisplay("x", profile.social.x), href: profile.social.x, Icon: SOCIAL_ICON.x }] : []),
    ...(profile.social.instagram ? [{ key: "instagram", label: socialDisplay("instagram", profile.social.instagram), href: profile.social.instagram, Icon: SOCIAL_ICON.instagram }] : []),
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
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Profiles and links">
                {profileLinks.map(({ key, label, href, Icon }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 text-app-meta font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                      aria-label={key in SOCIAL_LABEL ? `${SOCIAL_LABEL[key as SocialKind]}: ${label}` : undefined}
                    >
                      <Icon className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />
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
              Experience from code
            </SectionTitle>
            {experience.length ? (
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
              <PresentedProjects presentations={presentations} projects={projects} mode={mode} />
            ) : ordered.length ? (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {ordered.map((p) => {
                  const top = topAreas(p);
                  const href = mode === "owner" && p.id ? `/app/candidate/projects/${p.id}` : p.htmlUrl;
                  const external = !(mode === "owner" && p.id);
                  return (
                    <li key={p.repoFullName} className="py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        {href ? (
                          <a
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--text-primary)] hover:underline hover:underline-offset-4"
                          >
                            {repoName(p.repoFullName)}
                            {external ? <ArrowUpRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden /> : null}
                          </a>
                        ) : (
                          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                            {repoName(p.repoFullName)}
                          </span>
                        )}
                        <span className="text-[13px] tabular-nums text-[var(--text-tertiary)]">
                          {plural(p.evidence.length, "finding")}
                          {shortDate(p.analyzedAt) ? ` · Analyzed ${shortDate(p.analyzedAt)}` : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">
                        {p.sourceKind === "upload" ? "Uploaded by the engineer, source not checked" : p.repoFullName.split("/")[0]}
                        {p.primaryLanguage ? ` · ${p.primaryLanguage}` : ""}
                      </p>
                      {p.contributionStatement ? (
                        <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">{p.contributionStatement}</p>
                      ) : null}
                      {top.length ? (
                        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                          {top.map((k) => (
                            <li key={k} className="inline-flex items-center gap-1.5">
                              <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_TONE[k] ?? "var(--text-tertiary)" }} />
                              {CATEGORY_LABEL[k] ?? k}
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
            <SideTitle id="strengths-heading">Seen in the code</SideTitle>
            {areas.length ? (
              <>
                <ul className="mt-3 space-y-3">
                  {areas.map((a) => (
                    <li key={a.key}>
                      <div className="flex items-baseline justify-between gap-3 text-[14px]">
                        <span className="text-[var(--text-primary)]">{CATEGORY_LABEL[a.key] ?? a.key}</span>
                        <span className="tabular-nums text-[var(--text-secondary)]">{a.findings}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-deep)]" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(8, (a.findings / maxFindings) * 100)}%`, background: CATEGORY_TONE[a.key] ?? "var(--accent)" }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-tertiary)]">Findings per area. A count of evidence, not a skill rating.</p>
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
                <dd className="text-[var(--text-secondary)]">Experience, cited findings, areas and languages, each linked to source lines. Authorship is the engineer&apos;s claim.</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
