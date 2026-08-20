import {
  BarChart3,
  Check,
  FileText,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./homepage.module.css";

const navItems = [
  "Review evidence",
  "Shortlist",
  "Evidence",
  "Interview plan",
  "Role calibration",
];

const candidates = [
  { id: "C1", name: "Candidate 1", state: "Evidence reviewed" },
  { id: "C2", name: "Candidate 2", state: "Evidence reviewed" },
  { id: "C3", name: "Candidate 3", state: "Defense complete" },
  { id: "C4", name: "Candidate 4", state: "Interview scheduled" },
];

type TimelineEntry = {
  title: string;
  source: string;
  detail: string;
  time: string;
  tone: string;
  selected?: boolean;
};

const timeline: TimelineEntry[] = [
  {
    title: "Initial recommendation",
    source: "Structural discovery",
    detail:
      "Separated stated requirements from assumptions before recommending an architecture.",
    time: "10:21",
    tone: styles.heroDotObserved,
  },
  {
    title: "Constraint received",
    source: "Security review",
    detail:
      "Acme security team raised a six-week authentication review constraint.",
    time: "10:28",
    tone: styles.heroDotUncertain,
  },
  {
    title: "Plan revised",
    source: "Rollout plan",
    detail:
      "Revised the rollout plan to accommodate the security review window.",
    time: "10:34",
    tone: styles.heroDotGenerated,
    selected: true,
  },
  {
    title: "Oral defense completed",
    source: "Executive review",
    detail: "Explained tradeoffs in language an executive sponsor could use.",
    time: "11:02",
    tone: styles.heroDotSupport,
  },
  {
    title: "Human review",
    source: "Follow-up",
    detail: "Reviewer rated responses and flagged one assumption for follow-up.",
    time: "11:47",
    tone: styles.heroDotUncertain,
  },
];

const roleContext = [
  { label: "Role", value: "Solutions Engineer" },
  { label: "Recommendation", value: "Strong interview", marker: true },
  { label: "Reviewer", value: "K. Patel" },
  { label: "Unresolved assumption", value: "Data residency requirements" },
];

export default function HeroShortlistScene() {
  return (
    <figure className={styles.heroApp} data-motion-zone="shortlist">
      <nav className={styles.heroIconRail} aria-hidden>
        <span className={styles.heroIconRailMark}>
          <Search size={14} />
        </span>
        <span>
          <Plus size={14} />
        </span>
        <span>
          <Users size={14} />
        </span>
        <span>
          <BarChart3 size={14} />
        </span>
        <span>
          <Settings size={14} />
        </span>
      </nav>

      <div className={styles.heroNav}>
        <header className={styles.heroNavHeader}>
          <p>Employer</p>
          <h2>Solutions Engineer</h2>
          <span>Northstar</span>
        </header>
        <ul className={styles.heroNavList}>
          {navItems.map((item, index) => (
            <li
              key={item}
              className={cn(index === 0 && styles.heroNavItemActive)}
              aria-current={index === 0 ? "true" : undefined}
            >
              {index === 0 ? (
                <span className={styles.heroNavDot} aria-hidden />
              ) : null}
              {item}
            </li>
          ))}
        </ul>
      </div>

      <ol className={styles.heroCandidates} aria-label="Candidates">
        {candidates.map((candidate, index) => (
          <li
            key={candidate.id}
            data-motion-item="candidate"
            className={cn(index === 0 && styles.heroCandidateActive)}
            aria-current={index === 0 ? "true" : undefined}
          >
            <span className={styles.heroCandidateId}>{candidate.id}</span>
            <span>
              <strong>{candidate.name}</strong>
              {candidate.state}
            </span>
          </li>
        ))}
      </ol>

      <section className={styles.heroMain}>
        <header className={styles.heroMainHeader}>
          <h3>Review evidence</h3>
          <p>Northstar · Solutions Engineer</p>
        </header>

        <h4 className={styles.heroCandidateHeading}>Candidate 1</h4>

        <ol className={styles.heroTimeline}>
          {timeline.map((entry) => (
            <li
              key={entry.title}
              className={cn(entry.selected && styles.heroTimelineSelected)}
            >
              <span className={cn(styles.heroDot, entry.tone)} aria-hidden />
              <span className={styles.heroTimelineLabel}>
                <strong>{entry.title}</strong>
                {entry.source}
              </span>
              <p>{entry.detail}</p>
              <time dateTime={`2026-08-18T${entry.time}`}>{entry.time} AM</time>
            </li>
          ))}
        </ol>
      </section>

      <aside className={styles.heroContext} aria-label="Role context">
        <header className={styles.heroContextHeader}>
          <strong>Role context</strong>
          <span aria-hidden>···</span>
        </header>
        <dl className={styles.heroContextList}>
          {roleContext.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.marker ? (
                  <span className={styles.heroContextMarker} aria-hidden />
                ) : null}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <article className={styles.heroCard} data-motion-item="inspector">
        <header className={styles.heroCardHeader}>
          <strong>Plan revised</strong>
          <time dateTime="2026-08-18T10:34">10:34 AM</time>
          <X size={13} aria-hidden />
        </header>

        <div className={styles.heroCardBody}>
          <p className={styles.heroCardLabel}>Summary</p>
          <p className={styles.heroCardText}>
            Revised the rollout plan after the security team introduced a
            six-week authentication review constraint.
          </p>

          <p className={styles.heroCardLabel}>Source</p>
          <p className={styles.heroCardSource}>
            <FileText size={11} aria-hidden />
            acme_rollout_brief.docx
          </p>

          <p className={styles.heroCardLabel}>Changes</p>
          <div className={styles.heroCardDiff}>
            <p className={styles.heroCardDiffRemoved}>
              <span aria-hidden>−</span>Launch in four weeks
            </p>
            <p className={styles.heroCardDiffAdded}>
              <span aria-hidden>+</span>Launch in ten weeks, after security review
            </p>
          </div>

          <p className={styles.heroCardLabel}>Reviewer note</p>
          <p className={styles.heroCardText}>
            Handles the constraint without abandoning the original approach.
          </p>
        </div>

        <footer className={styles.heroCardFooter}>
          <span className={styles.heroCardButton}>
            <Check size={12} aria-hidden />
            Mark as reviewed
          </span>
        </footer>
      </article>
    </figure>
  );
}
