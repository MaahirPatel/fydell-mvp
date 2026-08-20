import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Braces,
  Check,
  CircleCheck,
  Compass,
  FileText,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./homepage.module.css";

type MarkKind = "support" | "defense" | "observation" | "uncertain" | "counter";

type EvidenceMark = {
  kind: MarkKind;
  x: number;
  y: number;
};

type DistributionRow = {
  name: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  cells: EvidenceMark[][];
};

const candidates = ["Candidate 1", "Candidate 2", "Candidate 3", "Candidate 4"];

const distributionRows: DistributionRow[] = [
  {
    name: "Discovery judgment",
    description: "Surfaces the right problems and asks sharper questions.",
    icon: Compass,
    tone: styles.distributionTeal,
    cells: [
      [
        { kind: "support", x: 14, y: 42 },
        { kind: "support", x: 23, y: 24 },
        { kind: "defense", x: 41, y: 38 },
        { kind: "defense", x: 55, y: 20 },
        { kind: "observation", x: 68, y: 34 },
        { kind: "uncertain", x: 84, y: 46 },
      ],
      [
        { kind: "support", x: 18, y: 35 },
        { kind: "support", x: 27, y: 21 },
        { kind: "defense", x: 43, y: 27 },
        { kind: "defense", x: 58, y: 40 },
        { kind: "observation", x: 72, y: 31 },
        { kind: "uncertain", x: 88, y: 49 },
      ],
      [
        { kind: "support", x: 15, y: 43 },
        { kind: "support", x: 30, y: 27 },
        { kind: "defense", x: 48, y: 36 },
        { kind: "observation", x: 61, y: 22 },
        { kind: "observation", x: 70, y: 44 },
        { kind: "counter", x: 85, y: 35 },
      ],
      [
        { kind: "support", x: 19, y: 40 },
        { kind: "support", x: 30, y: 30 },
        { kind: "defense", x: 55, y: 37 },
        { kind: "observation", x: 72, y: 21 },
        { kind: "uncertain", x: 86, y: 44 },
      ],
    ],
  },
  {
    name: "Technical translation",
    description: "Turns constraints into clear, buildable plans.",
    icon: Braces,
    tone: styles.distributionBlue,
    cells: [
      [
        { kind: "support", x: 13, y: 24 },
        { kind: "support", x: 25, y: 42 },
        { kind: "defense", x: 44, y: 31 },
        { kind: "defense", x: 57, y: 20 },
        { kind: "observation", x: 69, y: 44 },
        { kind: "uncertain", x: 84, y: 34 },
      ],
      [
        { kind: "support", x: 16, y: 32 },
        { kind: "support", x: 29, y: 20 },
        { kind: "defense", x: 43, y: 45 },
        { kind: "defense", x: 58, y: 29 },
        { kind: "observation", x: 74, y: 39 },
        { kind: "counter", x: 87, y: 25 },
      ],
      [
        { kind: "support", x: 17, y: 44 },
        { kind: "support", x: 28, y: 26 },
        { kind: "defense", x: 45, y: 31 },
        { kind: "observation", x: 63, y: 41 },
        { kind: "observation", x: 75, y: 22 },
      ],
      [
        { kind: "support", x: 15, y: 40 },
        { kind: "support", x: 25, y: 25 },
        { kind: "support", x: 36, y: 44 },
        { kind: "defense", x: 55, y: 31 },
        { kind: "observation", x: 72, y: 42 },
        { kind: "uncertain", x: 84, y: 23 },
      ],
    ],
  },
  {
    name: "Adaptation",
    description: "Adjusts approach when constraints or context change.",
    icon: RefreshCw,
    tone: styles.distributionGreen,
    cells: [
      [
        { kind: "support", x: 12, y: 35 },
        { kind: "support", x: 23, y: 22 },
        { kind: "support", x: 32, y: 47 },
        { kind: "defense", x: 47, y: 31 },
        { kind: "defense", x: 59, y: 20 },
        { kind: "observation", x: 70, y: 41 },
        { kind: "counter", x: 82, y: 28 },
        { kind: "uncertain", x: 89, y: 46 },
      ],
      [
        { kind: "support", x: 17, y: 28 },
        { kind: "support", x: 29, y: 44 },
        { kind: "defense", x: 45, y: 23 },
        { kind: "defense", x: 57, y: 39 },
        { kind: "observation", x: 72, y: 31 },
        { kind: "uncertain", x: 86, y: 46 },
      ],
      [
        { kind: "support", x: 14, y: 40 },
        { kind: "support", x: 28, y: 24 },
        { kind: "defense", x: 45, y: 42 },
        { kind: "defense", x: 56, y: 29 },
        { kind: "observation", x: 68, y: 20 },
        { kind: "observation", x: 76, y: 43 },
      ],
      [
        { kind: "support", x: 17, y: 40 },
        { kind: "support", x: 27, y: 22 },
        { kind: "defense", x: 48, y: 31 },
        { kind: "observation", x: 67, y: 42 },
        { kind: "uncertain", x: 83, y: 25 },
        { kind: "counter", x: 89, y: 45 },
      ],
    ],
  },
  {
    name: "Commercial judgment",
    description: "Balances customer value, risk, and investment.",
    icon: TrendingUp,
    tone: styles.distributionPurple,
    cells: [
      [
        { kind: "support", x: 13, y: 41 },
        { kind: "support", x: 24, y: 24 },
        { kind: "defense", x: 42, y: 34 },
        { kind: "defense", x: 58, y: 20 },
        { kind: "observation", x: 71, y: 44 },
        { kind: "uncertain", x: 84, y: 30 },
        { kind: "counter", x: 89, y: 48 },
      ],
      [
        { kind: "support", x: 17, y: 31 },
        { kind: "support", x: 28, y: 46 },
        { kind: "defense", x: 45, y: 25 },
        { kind: "observation", x: 62, y: 41 },
        { kind: "counter", x: 78, y: 30 },
      ],
      [
        { kind: "support", x: 14, y: 42 },
        { kind: "support", x: 28, y: 25 },
        { kind: "defense", x: 45, y: 35 },
        { kind: "observation", x: 64, y: 22 },
        { kind: "uncertain", x: 78, y: 44 },
      ],
      [
        { kind: "support", x: 16, y: 39 },
        { kind: "support", x: 28, y: 24 },
        { kind: "defense", x: 49, y: 42 },
        { kind: "observation", x: 66, y: 27 },
        { kind: "uncertain", x: 81, y: 45 },
      ],
    ],
  },
];

const evidenceTimeline = [
  {
    time: "14:22",
    title: "Assumption recorded",
    detail: "Initial rollout sizing relied on a sponsor estimate.",
    icon: FileText,
  },
  {
    time: "16:08",
    title: "Constraint received",
    detail: "Security review is sequential and blocks production access.",
    icon: ShieldCheck,
  },
  {
    time: "16:13",
    title: "Plan revised",
    detail: "Rollout sequencing changes while useful work is preserved.",
    icon: RefreshCw,
  },
  {
    time: "17:05",
    title: "Defense answer",
    detail: "Candidate explains the tradeoff and keeps sizing provisional.",
    icon: MessageSquareQuote,
  },
];

const markClass: Record<MarkKind, string> = {
  support: styles.distributionMarkSupport,
  defense: styles.distributionMarkDefense,
  observation: styles.distributionMarkObservation,
  uncertain: styles.distributionMarkUncertain,
  counter: styles.distributionMarkCounter,
};

export default function HeroShortlistScene() {
  return (
    <figure className={styles.distributionScene} data-motion-zone="shortlist">
      <aside className={styles.distributionBrief} data-motion-item="inspector">
        <header className={styles.distributionBriefHeader}>
          <div>
            <p>Decision brief</p>
            <h2>Candidate 1</h2>
            <span>Solutions Engineer · review complete</span>
          </div>
          <CircleCheck size={17} aria-label="Human reviewed" />
        </header>

        <section className={styles.distributionBriefSection}>
          <h3>Strengths</h3>
          <ul>
            <li>
              <RefreshCw size={14} aria-hidden />
              <span>
                <strong>Adapts under pressure</strong>
                Revised the rollout when a six-week review became a launch constraint.
              </span>
            </li>
            <li>
              <Braces size={14} aria-hidden />
              <span>
                <strong>Translates constraints into plan changes</strong>
                Reordered dependencies while preserving work that could continue.
              </span>
            </li>
            <li>
              <Compass size={14} aria-hidden />
              <span>
                <strong>Explains tradeoffs clearly</strong>
                Named what changed and why the decision moved.
              </span>
            </li>
          </ul>
        </section>

        <section className={cn(styles.distributionBriefSection, styles.distributionLimit)}>
          <h3>Limitation</h3>
          <p>
            <TrendingUp size={14} aria-hidden />
            <span>
              <strong>Reliance on unverified estimates</strong>
              Initial rollout sizing relied on a sponsor estimate that was not verified.
            </span>
          </p>
        </section>

        <section className={styles.distributionQuestions}>
          <h3>Evidence-linked interview questions</h3>
          <ol>
            <li>
              <span>What changed when the constraint arrived?</span>
              <time>16:08</time>
            </li>
            <li>
              <span>How did you decide what to keep and what to move?</span>
              <time>16:13</time>
            </li>
            <li>
              <span>What would you verify before sizing a rollout?</span>
              <time>14:22</time>
            </li>
          </ol>
        </section>

        <footer className={styles.distributionBriefFooter}>
          <span className={styles.distributionReviewer}>MK</span>
          <span>
            <strong>Human reviewed</strong>
            Evidence and limitation checked
          </span>
          <Check size={14} aria-hidden />
        </footer>
      </aside>

      <section className={styles.distributionWorkspace}>
        <header className={styles.distributionHeader}>
          <div>
            <h3>Evidence distribution</h3>
            <p>Each mark is an evidence item. Select a mark to inspect its source.</p>
          </div>
          <span>Solutions Engineer</span>
        </header>

        <div className={styles.distributionMatrix}>
          <div className={styles.distributionCorner} aria-hidden />
          {candidates.map((candidate, index) => (
            <div className={styles.distributionCandidate} key={candidate}>
              <span>C{index + 1}</span>
              {candidate}
            </div>
          ))}

          {distributionRows.map((row, rowIndex) => (
            <div className={styles.distributionRowGroup} key={row.name}>
              <div className={cn(styles.distributionRowLabel, row.tone)}>
                <span className={styles.distributionRowIcon}>
                  <row.icon size={14} aria-hidden />
                </span>
                <div>
                  <strong>{row.name}</strong>
                  <p>{row.description}</p>
                </div>
              </div>
              {row.cells.map((marks, cellIndex) => (
                <div
                  className={cn(
                    styles.distributionPlot,
                    rowIndex === 2 && cellIndex === 0 && styles.distributionPlotActive,
                  )}
                  key={`${row.name}-${candidates[cellIndex]}`}
                  aria-label={`${row.name}, ${candidates[cellIndex]}`}
                >
                  {marks.map((mark, markIndex) => (
                    <span
                      className={cn(styles.distributionMark, markClass[mark.kind])}
                      key={`${mark.kind}-${markIndex}`}
                      style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    />
                  ))}
                  <span className={styles.distributionAxis} aria-hidden />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.distributionLegend} aria-label="Evidence legend">
          <span><i className={styles.distributionMarkSupport} />Supporting action</span>
          <span><i className={styles.distributionMarkDefense} />Defended claim</span>
          <span><i className={styles.distributionMarkObservation} />Observation</span>
          <span><i className={styles.distributionMarkUncertain} />Unresolved assumption</span>
          <span><i className={styles.distributionMarkCounter} />Counterevidence</span>
        </div>

        <section className={styles.distributionTimeline}>
          <header>
            <div>
              <strong>Adaptation</strong>
              <span>Candidate 1 evidence timeline</span>
            </div>
            <span>4 linked events</span>
          </header>
          <ol>
            {evidenceTimeline.map((entry) => (
              <li key={entry.time}>
                <time>{entry.time}</time>
                <span className={styles.distributionTimelineDot} aria-hidden />
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                </div>
                <entry.icon size={13} aria-hidden />
              </li>
            ))}
          </ol>
          <a href="/how-it-works" className={styles.distributionTimelineLink}>
            View how evidence connects
            <ArrowRight size={13} aria-hidden />
          </a>
        </section>
      </section>
    </figure>
  );
}
