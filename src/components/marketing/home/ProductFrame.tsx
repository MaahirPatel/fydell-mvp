import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, FileText, Lock, RefreshCw, Timer } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { cn } from "@/lib/cn";
import styles from "./homepage.module.css";

/**
 * Every scene on the homepage is a slice of the same application, so the chrome
 * has to be the same object each time: one title, one context string, and a
 * short strip of state the product would genuinely know about itself. The strip
 * is deliberately spans rather than buttons — nothing here is wired, and a
 * control that cannot be pressed is worse than no control at all.
 */

export type FrameMeta = {
  label: string;
  icon?: LucideIcon;
};

const DEFAULT_FRAME_META: FrameMeta[] = [
  { label: "Encrypted", icon: Lock },
  { label: "Synced 17:06", icon: RefreshCw },
];

export default function ProductFrame({
  title,
  context,
  className = "",
  variant = "frame",
  meta = DEFAULT_FRAME_META,
  children,
}: {
  title: string;
  context: string;
  className?: string;
  variant?: "frame" | "open" | "band";
  meta?: FrameMeta[];
  children: ReactNode;
}) {
  return (
    <figure
      className={cn(
        styles.sceneFrame,
        styles[`scene${variant[0].toUpperCase()}${variant.slice(1)}`],
        className,
      )}
      aria-label={title}
    >
      <figcaption className={styles.sceneBar}>
        <span className={styles.sceneBarIdentity}>
          <strong>{title}</strong>
          <span className={styles.sceneBarContext}>{context}</span>
        </span>
        {meta.length > 0 ? (
          <span className={styles.sceneBarMeta}>
            {meta.map(({ label, icon: Icon }) => (
              <span className={styles.sceneBarMetaItem} key={label}>
                {Icon ? (
                  <Icon className={styles.sceneBarMetaIcon} size={12} aria-hidden />
                ) : null}
                {label}
              </span>
            ))}
          </span>
        ) : null}
      </figcaption>
      {children}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Shared workspace rail                                               */
/* ------------------------------------------------------------------ */

const RAIL_NAV = ["Home", "Active roles", "Candidates", "Outcomes"] as const;

export type RailStat = { label: string; value: string };

const DEFAULT_RAIL_STATS: RailStat[] = [
  { label: "Invited", value: "6" },
  { label: "In progress", value: "2" },
  { label: "Ready to review", value: "2" },
];

/** Times line up with the candidate rows so the rail reads as the same run. */
const RAIL_ACTIVITY = [
  { time: "17:05", label: "Candidate 1 brief ready" },
  { time: "16:42", label: "Candidate 2 defense complete" },
  { time: "15:58", label: "Candidate 3 work submitted" },
] as const;

/**
 * The same rail appears behind the hero and behind the interview brief, because
 * both moments happen in one workspace. `compact` drops the role counters so the
 * rail can sit behind foreground content without competing with it.
 */
export function WorkspaceRail({
  activeItem = "Active roles",
  roleLabel = "Open role",
  roleTitle = "Solutions Engineer",
  stats = DEFAULT_RAIL_STATS,
  compact = false,
  className = "",
}: {
  activeItem?: string;
  roleLabel?: string;
  roleTitle?: string;
  stats?: RailStat[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <aside className={cn(styles.roleRail, compact && styles.roleRailCompact, className)}>
      <div className={styles.workspaceBrand}>
        <FydellMark width={18} />
        <strong>fydell</strong>
      </div>
      <nav className={styles.roleNav} aria-label="Workspace">
        {RAIL_NAV.map((item) => (
          <span
            key={item}
            className={cn(item === activeItem && styles.roleNavActive)}
            aria-current={item === activeItem ? "true" : undefined}
          >
            {item}
          </span>
        ))}
      </nav>
      <div className={styles.roleSummary}>
        <p className={styles.roleLabel}>{roleLabel}</p>
        <h2 className={styles.roleTitle}>{roleTitle}</h2>
        {compact ? null : (
          <dl>
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {compact ? null : (
        <div className={styles.railActivity}>
          <p className={styles.roleLabel}>Activity</p>
          <ol>
            {RAIL_ACTIVITY.map((entry) => (
              <li key={entry.time}>
                <time dateTime={`2026-08-18T${entry.time}`}>{entry.time}</time>
                <span>{entry.label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className={styles.workspaceFooter}>
        <div className={styles.companyIdentity}>
          <span className={styles.companyMark}>N</span>
          <span>
            <strong>Northstar</strong>
            <small>Pilot workspace</small>
          </span>
        </div>
        <div className={styles.userIdentity}>
          <span className={styles.userAvatar}>MP</span>
          <span>
            <strong>Workspace owner</strong>
            <small>Owner</small>
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Shared candidate shortlist                                          */
/* ------------------------------------------------------------------ */

type CandidateTone = "review" | "analysis" | "progress";

export type WorkspaceCandidate = {
  id: string;
  initials: string;
  name: string;
  stage: string;
  completion: string;
  events: number;
  artifacts: number;
  state: string;
  tone: CandidateTone;
};

/**
 * Names are deliberately positional. A homepage should not imply that a real
 * person's evaluation is on display, and the evidence is the subject anyway.
 */
export const WORKSPACE_CANDIDATES: WorkspaceCandidate[] = [
  {
    id: "candidate-1",
    initials: "C1",
    name: "Candidate 1",
    stage: "Brief ready",
    completion: "Completed 17:05",
    events: 48,
    artifacts: 5,
    state: "Ready to review",
    tone: "review",
  },
  {
    id: "candidate-2",
    initials: "C2",
    name: "Candidate 2",
    stage: "Defense complete",
    completion: "Completed 16:42",
    events: 41,
    artifacts: 4,
    state: "Ready to review",
    tone: "review",
  },
  {
    id: "candidate-3",
    initials: "C3",
    name: "Candidate 3",
    stage: "Work submitted",
    completion: "Submitted 15:58",
    events: 36,
    artifacts: 4,
    state: "In analysis",
    tone: "analysis",
  },
  {
    id: "candidate-4",
    initials: "C4",
    name: "Candidate 4",
    stage: "Invitation accepted",
    completion: "Started 15:12",
    events: 12,
    artifacts: 1,
    state: "In progress",
    tone: "progress",
  },
];

const TONE_CLASS: Record<CandidateTone, string> = {
  review: styles.candidateStateReview,
  analysis: styles.candidateStateAnalysis,
  progress: styles.candidateStateProgress,
};

export function CandidateShortlist({
  candidates = WORKSPACE_CANDIDATES,
  selectedId = "candidate-1",
  heading = "Candidates",
  context = "Solutions Engineer",
  compact = false,
  motionItem,
  className = "",
}: {
  candidates?: WorkspaceCandidate[];
  selectedId?: string;
  heading?: string;
  context?: string;
  compact?: boolean;
  motionItem?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(styles.shortlistRail, compact && styles.shortlistRailCompact, className)}
      aria-label="Candidates"
    >
      <header className={styles.listHeader}>
        <p className={styles.roleLabel}>{heading}</p>
        <strong>{context}</strong>
        {compact ? null : (
          <span className={styles.listHeaderMeta}>Sorted by review readiness</span>
        )}
      </header>
      <ol className={styles.candidateList}>
        {candidates.map((candidate) => {
          const selected = candidate.id === selectedId;
          return (
            <li
              key={candidate.id}
              data-motion-item={motionItem}
              aria-current={selected ? "true" : undefined}
              className={cn(styles.candidateRow, selected && styles.candidateRowActive)}
            >
              <span className={styles.candidateSelectedMarker} aria-hidden />
              <span className={styles.avatar} aria-hidden>
                {candidate.initials}
              </span>
              <span className={styles.candidateIdentity}>
                <span className={styles.candidateName}>{candidate.name}</span>
                <span className={styles.candidateMeta}>{candidate.stage}</span>
                {compact ? null : (
                  <span className={styles.candidateMetrics}>
                    <span className={styles.candidateMetric}>
                      <Timer className={styles.candidateMetricIcon} size={11} aria-hidden />
                      {candidate.completion}
                    </span>
                    <span className={styles.candidateMetric}>
                      <Activity className={styles.candidateMetricIcon} size={11} aria-hidden />
                      {candidate.events} events
                    </span>
                    <span className={styles.candidateMetric}>
                      <FileText className={styles.candidateMetricIcon} size={11} aria-hidden />
                      {candidate.artifacts}{" "}
                      {candidate.artifacts === 1 ? "artifact" : "artifacts"}
                    </span>
                  </span>
                )}
              </span>
              <span className={cn(styles.candidateState, TONE_CLASS[candidate.tone])}>
                {candidate.state}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
