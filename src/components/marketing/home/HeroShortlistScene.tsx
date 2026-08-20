import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleCheck,
  FileDiff,
  MessageSquareQuote,
  TriangleAlert,
} from "lucide-react";
import ProductFrame, { CandidateShortlist, WorkspaceRail } from "./ProductFrame";
import { cn } from "@/lib/cn";
import styles from "./homepage.module.css";

const questions = [
  "What would you validate before presenting the migration plan to a security lead?",
  "Where does your recommendation depend most on Acme’s stated adoption numbers?",
];

type CausalStep = {
  time: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

/**
 * The inspector is the argument of the whole page in one column: a decision at
 * the bottom that you can walk backwards to the moment the facts changed.
 */
const causalChain: CausalStep[] = [
  {
    time: "16:08",
    label: "Changed constraint",
    detail: "Acme confirms the authentication security review itself takes six weeks.",
    icon: TriangleAlert,
    tone: styles.causalStepConstraint,
  },
  {
    time: "16:13",
    label: "rollout_plan.md revised",
    detail: "Sandbox-first sequencing replaces the single production cutover.",
    icon: FileDiff,
    tone: styles.causalStepArtifact,
  },
  {
    time: "16:31",
    label: "Defense answer",
    detail: "Sponsor adoption number kept directional until usage data is verified.",
    icon: MessageSquareQuote,
    tone: styles.causalStepDefense,
  },
  {
    time: "17:05",
    label: "Human review",
    detail: "Approved with limitation. The unresolved assumption stays attached.",
    icon: CircleCheck,
    tone: styles.causalStepReview,
  },
];

export default function HeroShortlistScene() {
  return (
    <ProductFrame
      title="Fydell workspace"
      context="Solutions Engineer · 4 candidates"
      className={styles.heroScene}
    >
      <div className={styles.shortlist} data-motion-zone="shortlist">
        <WorkspaceRail activeItem="Active roles" />

        <CandidateShortlist selectedId="candidate-1" motionItem="candidate" />

        <div className={styles.decisionStack}>
          <article className={styles.brief} data-motion-item="brief">
            <header className={styles.briefHeader}>
              <div className={styles.briefTopline}>
                <div>
                  <p className={styles.roleLabel}>Decision brief</p>
                  <h2 className={styles.briefName}>Candidate 1</h2>
                </div>
                <span className={styles.reviewMeta}>Reviewed 18 Aug</span>
              </div>
            </header>

            <div className={styles.briefBody}>
              <section className={styles.decisionRow}>
                <h3>Reviewer decision</h3>
                <div>
                  <strong>Advance to interview</strong>
                  <p>
                    Evidence supports a focused interview. The adoption assumption
                    remains unresolved.
                  </p>
                </div>
              </section>
              <section className={styles.briefSection}>
                <h3>Evidence</h3>
                <ul>
                  <li>
                    Separated stated requirements from assumptions before
                    recommending an architecture.
                  </li>
                  <li>
                    Revised the Acme rollout when a six-week authentication security
                    review became a launch constraint.
                  </li>
                  <li>
                    Explained the sequencing tradeoff in language the customer could
                    act on.
                  </li>
                </ul>
              </section>

              <section className={styles.briefSection}>
                <h3>Unresolved</h3>
                <p>
                  Rollout sizing still depends on Acme&rsquo;s self-reported weekly
                  active-user count.
                </p>
              </section>

              <section className={styles.briefSection}>
                <h3>Ask next</h3>
                <ol>
                  {questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ol>
              </section>
            </div>
          </article>

          <aside
            className={styles.evidenceInspector}
            aria-label="Evidence inspector"
            data-motion-item="inspector"
            data-focal-layer
          >
            <header className={styles.inspectorHeader}>
              <div>
                <p className={styles.roleLabel}>Evidence inspector</p>
                <h3 className={styles.inspectorTitle}>Adaptation</h3>
              </div>
              <span className={styles.inspectorScope}>Candidate 1 · 4 linked events</span>
            </header>

            <ol className={styles.causalChain}>
              {causalChain.map((step) => (
                <li key={step.time} className={cn(styles.causalStep, step.tone)}>
                  <span className={styles.causalStepIcon} aria-hidden>
                    <step.icon size={13} />
                  </span>
                  <time className={styles.causalStepTime} dateTime={`2026-08-18T${step.time}`}>
                    {step.time}
                  </time>
                  <span className={styles.causalStepBody}>
                    <span className={styles.causalStepLabel}>{step.label}</span>
                    <span className={styles.causalStepDetail}>{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className={styles.inspectorDiff} aria-label="Selected artifact revision">
              <header>
                <span>rollout_plan.md · revision 4</span>
                <time>16:13</time>
              </header>
              <p className={styles.inspectorDiffRemoved}>
                <span>−</span>
                Production access runs in parallel with security review.
              </p>
              <p className={styles.inspectorDiffAdded}>
                <span>+</span>
                Sandbox first; production begins after security sign-off.
              </p>
            </div>

            <div className={styles.causalOutcome}>
              <ArrowRight className={styles.causalOutcomeIcon} size={13} aria-hidden />
              <span className={styles.causalOutcomeLabel}>Advance to interview</span>
            </div>

            <footer className={styles.inspectorFooter}>
              <span className={styles.inspectorConfidence}>
                Confidence
                <strong>Moderate</strong>
              </span>
              <span className={styles.inspectorReviewer}>
                Reviewer
                <strong>MK</strong>
              </span>
            </footer>
          </aside>
        </div>
      </div>
    </ProductFrame>
  );
}
