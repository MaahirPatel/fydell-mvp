import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import styles from "@/components/marketing/product/DecisionBriefExample.module.css";

export const metadata = {
  title: "Worked evidence report",
  description:
    "Read a complete Fydell decision brief and follow the event trail that produced it.",
};

/**
 * The engine stores direction and confidence as enums, and a hiring manager
 * should never be shown them that way. `INSUFFICIENT_EVIDENCE` shouted in a
 * column is our schema leaking into the one artifact the customer actually
 * reads. The underlying values stay unchanged so the page keeps matching the
 * real contract in `sim-engine/golden-path/contracts.ts`.
 */
const DIRECTION_LABEL = {
  STRENGTH: "Strength",
  CONCERN: "Concern",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
} as const;

const CONFIDENCE_LABEL = {
  HIGH: "High confidence",
  MODERATE: "Moderate confidence",
  LOW: "Low confidence",
} as const;

const claims: Array<{
  id: string;
  direction: keyof typeof DIRECTION_LABEL;
  confidence: keyof typeof CONFIDENCE_LABEL;
  artifacts: string;
  statement: string;
  support: Array<[string, string]>;
  counter: Array<[string, string]>;
  className?: string;
  versions?: string;
}> = [
  {
    id: "claim-adaptation-01",
    direction: "STRENGTH",
    confidence: "HIGH",
    artifacts: "rollout-plan-r2, defense-response-r1",
    className: "",
    statement:
      "Candidate 1 revised the invalidated endpoint choice after AUTH_001 while preserving useful enablement and data-flow decisions.",
    support: [
      ["evt-004", "FACT_RELEASED: AUTH_001 invalidated recommendation.endpoint_choice."],
      ["evt-005", "ARTIFACT_REVISION: endpoint changed and production sequencing revised."],
      ["evt-009", "DEFENSE_RESPONSE_SUBMITTED: explained what changed and what remained valid."],
    ],
    counter: [
      ["evt-002", "The preliminary recommendation selected the incompatible endpoint."],
    ],
  },
  {
    id: "claim-adaptation-02",
    direction: "CONCERN",
    confidence: "MODERATE",
    artifacts: "rollout-plan-r2, assumptions-r2",
    className: styles.claimConcern,
    statement:
      "Candidate 1 preserved the 200-user rollout size after the security constraint changed, but the size still depended on Acme's unverified adoption estimate.",
    support: [
      ["evt-005", "ARTIFACT_REVISION retained the 200-user cohort."],
      ["evt-009", "Defense response described the sponsor estimate as directional."],
    ],
    counter: [
      ["evt-006", "The revised artifact explicitly named the estimate as unverified."],
    ],
  },
  {
    id: "claim-adaptation-03",
    direction: "INSUFFICIENT_EVIDENCE",
    confidence: "LOW",
    artifacts: "none",
    className: styles.claimInsufficient,
    statement:
      "This run does not establish whether Candidate 1 would sustain the same adaptation quality across a multi-week implementation or a live customer workshop.",
    support: [],
    counter: [
      ["scope-001", "The observed work covers one bounded simulation and one oral defense."],
    ],
  },
] as const;

const questions = [
  "The revised plan keeps a 200-user cohort. What evidence would make you reduce or increase that size before production access?",
  "How would you explain the endpoint change to Acme without exposing internal engineering conflict or repeating the Friday promise?",
  "Describe a multi-week customer implementation where a late constraint changed your plan. What did you preserve, and what did you discard?",
];

const runSteps = [
  {
    event: "evt-001 · 14:04",
    title: "Work starts",
    body: "Candidate 1 receives the Acme rollout situation, API documentation, observed validation errors, and the Friday pressure. The hidden authentication incompatibility is not yet available.",
  },
  {
    event: "evt-002 · 14:22",
    title: "A preliminary recommendation commits",
    body: "The candidate selects an endpoint and proposes a broad launch after identity validation. PRELIMINARY_RECOMMENDATION_SUBMITTED makes the recommendation inspectable before the world changes.",
  },
  {
    event: "evt-004 · 16:08",
    title: "The fact changes",
    body: "FACT_RELEASED delivers AUTH_001: the selected endpoint is incompatible with the customer's authentication configuration. It specifically invalidates recommendation.endpoint_choice.",
  },
  {
    event: "evt-005 · 16:13",
    title: "The candidate revises",
    body: "ARTIFACT_REVISION changes the endpoint and separates sandbox enablement from production access. The candidate preserves valid data-flow work and keeps the adoption estimate marked as unverified.",
  },
  {
    event: "job-initial · Pass A",
    title: "Provisional observations form",
    body: "EXTRACT_EVIDENCE_INITIAL creates provisional claims with supporting and counter event IDs. GENERATE_DEFENSE produces questions aimed at the unresolved rollout size and customer communication.",
  },
  {
    event: "evt-009 · Defense",
    title: "The candidate answers",
    body: "DEFENSE_RESPONSE_SUBMITTED adds evidence without erasing the earlier recommendation. Candidate 1 explains how they would validate adoption, reduce scope when data is absent, and communicate the delay.",
  },
  {
    event: "job-final · Pass B",
    title: "Final claims retain limits",
    body: "EXTRACT_EVIDENCE_FINAL revises confidence using the oral defense. Contrary events remain attached. GENERATE_DECISION_BRIEF produces a recommendation and interview probes, not a numeric score.",
  },
  {
    event: "evt-012 · Review",
    title: "A human publishes",
    body: "The reviewer approves the strength, keeps the concern and insufficient-evidence claim visible, and publishes the brief. The event ledger records CLAIM_APPROVED and BRIEF_PUBLISHED.",
  },
];

export default function EvidenceReportPage() {
  return (
    <MarketingShell>
      <main className={styles.page}>
        <header className={styles.intro}>
          <h1>A decision brief you can read all the way through.</h1>
          <p>
            This worked example follows Candidate 1 through Northstar&apos;s
            Solutions Engineer run for the Acme rollout. Every claim shows the
            events underneath it, the evidence against it, and what the run did
            not establish.
          </p>
        </header>

        <section className={styles.reportSection} aria-labelledby="report-title">
          <div className={styles.reportWrap}>
            <article className={styles.reportFrame}>
              <header className={styles.reportBar}>
                <strong>Published decision brief</strong>
                <span>Northstar · Solutions Engineer · Candidate 1</span>
              </header>

              <div className={styles.reportLayout}>
                <aside className={styles.reportRail}>
                  <p className={styles.railTitle}>Candidate 1</p>
                  <p className={styles.railMeta}>
                    Acme rollout
                    <br />
                    Human reviewed
                  </p>
                  <nav className={styles.railNav} aria-label="Brief sections">
                    <span>Recommendation</span>
                    <span>Claims and evidence</span>
                    <span>Remaining uncertainty</span>
                    <span>Interview questions</span>
                  </nav>
                  <dl className={styles.versionList}>
                    <div>
                      <dt>scenarioVersion</dt>
                      <dd>northstar-pilot-1.0.0</dd>
                    </div>
                    <div>
                      <dt>engineVersion</dt>
                      <dd>golden-path-0.1.0</dd>
                    </div>
                    <div>
                      <dt>rubricVersion</dt>
                      <dd>se-adaptation-1.0.0</dd>
                    </div>
                    <div>
                      <dt>promptVersion</dt>
                      <dd>evidence-final-1.0.0</dd>
                    </div>
                    <div>
                      <dt>modelVersion</dt>
                      <dd>evidence-worker-2026-08</dd>
                    </div>
                  </dl>
                </aside>

                <div className={styles.report}>
                  <section className={styles.recommendation}>
                    <div className={styles.recommendationTop}>
                      <div>
                        <p className={styles.recommendationLabel}>Recommendation</p>
                        <h2 id="report-title">Advance to interview.</h2>
                      </div>
                    </div>
                    <p>
                      Candidate 1 responded to a critical authentication constraint
                      by replacing the invalid endpoint and preserving unaffected
                      implementation work. The revision was technically scoped and
                      candid about uncertainty. Interview the candidate to test
                      whether the same judgment holds in live customer communication
                      and over a longer implementation.
                    </p>
                  </section>

                  <section className={styles.reportBlock}>
                    <p className={styles.sectionLabel}>Claims and evidence</p>
                    {claims.map((claim) => (
                      <article
                        className={`${styles.claim} ${claim.className}`}
                        key={claim.id}
                      >
                        <div className={styles.claimIdentity}>
                          {claim.id}
                          <br />
                          Adaptation
                          <span className={styles.claimDirection}>
                            {DIRECTION_LABEL[claim.direction]}
                            <br />
                            {CONFIDENCE_LABEL[claim.confidence]}
                            <br />
                            Approved
                          </span>
                        </div>
                        <div>
                          <p className={styles.claimStatement}>{claim.statement}</p>
                          <div className={styles.claimEvidence}>
                            <div>
                              <h4>Supporting events</h4>
                              <ul>
                                {claim.support.length ? (
                                  claim.support.map(([id, text]) => (
                                    <li key={id}>
                                      <span className={styles.eventId}>{id}</span>
                                      {text}
                                    </li>
                                  ))
                                ) : (
                                  <li>No supporting event in this run.</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <h4>Counter events and limits</h4>
                              <ul>
                                {claim.counter.map(([id, text]) => (
                                  <li key={id}>
                                    <span className={styles.eventId}>{id}</span>
                                    {text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <p className={styles.claimVersions}>
                            artifacts {claim.artifacts} · rubric
                            se-adaptation-1.0.0 · prompt
                            evidence-final-1.0.0 · model evidence-worker-2026-08
                          </p>
                        </div>
                      </article>
                    ))}
                  </section>

                  <section className={styles.reportBlock}>
                    <p className={styles.sectionLabel}>Interview questions produced</p>
                    <ol className={styles.questions}>
                      {questions.map((question, index) => (
                        <li key={question}>
                          <span>0{index + 1}</span>
                          {question}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <footer className={`${styles.reportBlock} ${styles.reviewNote}`}>
                    <p>
                      Reviewer note: approve the adaptation strength only while the
                      retained cohort-size concern and the unobserved multi-week
                      behavior remain attached.
                    </p>
                    <strong>Approved for publication</strong>
                  </footer>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <header className={styles.processHead}>
            <h2 id="process-title">How the run produced this brief.</h2>
            <p>
              The brief is the end of an ordered trail. Work happens first, the
              world changes, the candidate responds, two analysis passes test the
              evidence, and a human decides what can publish.
            </p>
          </header>

          <div className={styles.runTrace}>
            {runSteps.map((step) => (
              <article className={styles.runStep} key={step.event}>
                <span className={styles.runEvent}>{step.event}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.closingSection}>
          <div className={styles.closing}>
            <h2>The claim is only as useful as its trail.</h2>
            <p>
              Fydell does not compress this into a score. The hiring team can agree
              with one claim, challenge another, and carry the remaining uncertainty
              into a better interview.
            </p>
            <div className={styles.actions}>
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/product" variant="soft">
                See the full product
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
