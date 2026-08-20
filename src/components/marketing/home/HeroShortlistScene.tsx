import ProductFrame from "./ProductFrame";
import styles from "./homepage.module.css";

const candidates = [
  { initials: "C1", name: "Candidate 1", detail: "Evidence reviewed", state: "Strong interview" },
  { initials: "C2", name: "Candidate 2", detail: "Evidence reviewed", state: "Interview" },
  { initials: "C3", name: "Candidate 3", detail: "Defense complete", state: "Review" },
  { initials: "C4", name: "Candidate 4", detail: "Evidence reviewed", state: "Interview" },
];

const questions = [
  "What would you validate before presenting the migration plan to a security lead?",
  "Where does your recommendation depend most on Acme’s stated adoption numbers?",
  "What would make you reverse your phased-rollout recommendation?",
];

export default function HeroShortlistScene() {
  return (
    <ProductFrame
      title="Employer shortlist"
      context="Northstar · Solutions Engineer"
      className={styles.heroScene}
    >
      <div className={styles.shortlist} data-motion-zone="shortlist">
        <aside className={styles.roleRail}>
          <header className={styles.railHeader}>
            <p className={styles.roleLabel}>Open role</p>
            <h2 className={styles.roleTitle}>Solutions Engineer</h2>
            <p className={styles.readyLine}>4 candidates ready</p>
          </header>
          <nav className={styles.roleNav} aria-label="Role workspace">
            <span className={styles.roleNavActive}>Shortlist</span>
            <span>Evidence</span>
            <span>Interview plan</span>
            <span>Role calibration</span>
          </nav>
          <p className={styles.roleContext}>Customer context<br /><strong>Acme</strong></p>
        </aside>

        <section className={styles.shortlistRail} aria-label="Candidates">
          <header className={styles.listHeader}>
            <p className={styles.roleLabel}>Shortlist</p>
            <strong>Review evidence</strong>
          </header>
          <ol className={styles.candidateList}>
            {candidates.map((candidate, index) => (
              <li
                key={candidate.name}
                data-motion-item="candidate"
                className={`${styles.candidateRow} ${
                  index === 0 ? styles.candidateRowActive : ""
                }`}
              >
                <span className={styles.avatar} aria-hidden>
                  {candidate.initials}
                </span>
                <span>
                  <span className={styles.candidateName}>{candidate.name}</span>
                  <span className={styles.candidateMeta}>{candidate.detail}</span>
                </span>
                <span className={styles.candidateState}>{candidate.state}</span>
              </li>
            ))}
          </ol>
        </section>

        <article className={styles.brief} data-motion-item="brief">
          <header className={styles.briefHeader}>
            <div className={styles.briefTopline}>
              <div>
                <p className={styles.roleLabel}>Decision brief</p>
                <h2 className={styles.briefName}>Candidate 1</h2>
              </div>
              <span className={styles.verdict}>Strong interview</span>
            </div>
          </header>

          <div className={styles.briefBody}>
            <section className={styles.briefSection}>
              <h3>Why interview</h3>
              <ul>
                <li>
                  <strong>Structured discovery:</strong> separated stated requirements from
                  assumptions before recommending an architecture.
                </li>
                <li className={styles.highlightLine}>
                  <strong>Adapted under pressure:</strong> revised the Acme rollout when a
                  six-week authentication security review became a launch constraint.
                </li>
                <li>
                  <strong>Customer judgment:</strong> explained tradeoffs in language an
                  executive sponsor could use.
                </li>
              </ul>
            </section>

            <section className={styles.briefSection}>
              <h3>Uncertainty</h3>
              <p>
                Candidate 1 identified the adoption risk, but the estimate still depends on
                Acme&rsquo;s self-reported weekly active-user count.
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
      </div>
    </ProductFrame>
  );
}
