import ProductFrame from "./ProductFrame";
import styles from "./homepage.module.css";

export function WorkbenchScene() {
  return (
    <ProductFrame title="Candidate workbench" context="Candidate 1 · Northstar">
      <div className={styles.workbench}>
        <aside className={styles.workNav} aria-label="Workbench artifacts">
          <p className={styles.workNavTitle}>Workspace</p>
          <p className={`${styles.navItem} ${styles.navItemActive}`}>Discovery notes</p>
          <p className={styles.navItem}>Architecture brief</p>
          <p className={styles.navItem}>Rollout plan</p>
          <p className={styles.navItem}>Customer email</p>
          <p className={styles.navItem}>Assumptions</p>
        </aside>
        <section className={styles.workMain}>
          <h3>Acme technical discovery</h3>
          <p className={styles.workPrompt}>
            Recommend an implementation path for Acme, a 1,200-seat customer with a
            six-week launch target, SSO requirements, and a small platform team.
          </p>
          <div className={styles.workNote}>
            <p className={styles.workNoteLabel}>Current recommendation</p>
            <p>
              Begin with a controlled 200-user deployment, validate identity
              mapping, then expand by business unit after the first support review.
            </p>
          </div>
          <div className={styles.tableScroller}>
            <table className={styles.workTable}>
              <thead>
                <tr>
                  <th>requirement</th>
                  <th>source</th>
                  <th>confidence</th>
                  <th>decision impact</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SAML SSO</td>
                  <td>security_brief.pdf</td>
                  <td>confirmed</td>
                  <td>high</td>
                </tr>
                <tr>
                  <td>1,200 seats</td>
                  <td>discovery_call.md</td>
                  <td>confirmed</td>
                  <td>medium</td>
                </tr>
                <tr className={styles.riskRow}>
                  <td>weekly active users</td>
                  <td>sponsor estimate</td>
                  <td>unverified</td>
                  <td>high</td>
                </tr>
                <tr>
                  <td>six-week launch</td>
                  <td>implementation_plan.pdf</td>
                  <td>confirmed</td>
                  <td>high</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <aside className={styles.workEvidence}>
          <p className={styles.evidenceLabel}>Evidence note</p>
          <p className={styles.evidenceClaim}>
            Candidate 1 distinguishes a customer statement from a verified technical
            constraint before making the rollout recommendation.
          </p>
          <div className={styles.evidenceSource}>
            14:22 assumption_added
            <br />
            <mark>weekly_active_users: unverified</mark>
            <br />
            14:24 plan_revised
            <br />
            cohort_size: 200
          </div>
        </aside>
      </div>
    </ProductFrame>
  );
}

export function CalibrationScene() {
  const signals = [
    ["Discovery judgment", "Finds the real constraint before proposing", "Required"],
    ["Technical translation", "Explains architecture to mixed audiences", "Required"],
    ["Adaptation", "Revises when customer facts change", "Required"],
    ["Commercial judgment", "Connects technical choices to adoption risk", "Useful"],
  ];

  return (
    <ProductFrame title="Role calibration" context="Northstar · Solutions Engineer" variant="open">
      <div className={styles.calibration}>
        <section className={styles.calibrationRole}>
          <p className={styles.roleLabel}>Role definition</p>
          <h3>Solutions Engineer</h3>
          <p>
            Mid-market, technical discovery through implementation handoff. The
            strongest signal is not presentation polish; it is whether the candidate
            finds and handles a consequential unknown.
          </p>
          <div className={styles.calibrationMeta}>
            <div><span>Customer</span><strong>Acme</strong></div>
            <div><span>Motion</span><strong>New deployment</strong></div>
            <div><span>Primary buyer</span><strong>VP Operations</strong></div>
            <div><span>Technical lead</span><strong>Platform manager</strong></div>
          </div>
        </section>
        <section className={styles.signals}>
          <p className={styles.roleLabel}>What good looks like</p>
          {signals.map(([title, detail, weight], index) => (
            <div className={styles.signal} key={title}>
              <span className={styles.signalNumber}>0{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
              <span className={styles.signalWeight}>{weight}</span>
            </div>
          ))}
        </section>
      </div>
    </ProductFrame>
  );
}

export function AdaptScene() {
  return (
    <figure
      className={styles.adaptTimeline}
      aria-label="Changed-information timeline"
      data-motion-observe="adapt"
    >
      <figcaption><strong>Changed-information event</strong><span>Candidate 1 · Acme rollout</span></figcaption>
      <div className={styles.adaptEvent} data-motion-item="adapt-event">
        <time>14:22</time>
        <div><span>Initial recommendation</span><h3>Single launch in six weeks</h3><p>Candidate 1 proposes a broad rollout after identity validation.</p></div>
        <p>Assumes authentication security review can run in parallel.</p>
      </div>
      <div
        className={`${styles.adaptEvent} ${styles.adaptEventChanged}`}
        data-motion-item="adapt-event"
      >
        <time>16:08</time>
        <div><span>New information</span><h3>Security review blocks production access</h3><p>Acme confirms the authentication review itself takes six weeks.</p></div>
        <p>Material constraint · production data cannot be connected first.</p>
      </div>
      <div className={styles.adaptEvent} data-motion-item="adapt-event">
        <time>16:13</time>
        <div><span>Recommendation revised</span><h3>Sandbox now, production later</h3><p>Candidate 1 preserves enablement work and separates it from the blocked integration.</p></div>
        <ul><li>Removed parallel-review assumption</li><li>Kept the 200-user cohort provisional</li><li>Named the remaining adoption-data unknown</li></ul>
      </div>
    </figure>
  );
}

export function DefenseScene() {
  return (
    <ProductFrame title="Oral defense" context="Candidate 1 · generated from the work" variant="band">
      <div className={styles.defense}>
        <section className={styles.artifact}>
          <p className={styles.roleLabel}>Artifact line · rollout_plan.md</p>
          <div className={styles.artifactLine}>
            Phase one can support 200 users while the remaining business units
            prepare for production access. <mark>Adoption risk should remain low</mark>
            because the sponsor reports strong weekly usage.
          </div>
        </section>
        <section className={styles.defenseExchange}>
          <p className={styles.roleLabel}>Generated question</p>
          <p className={styles.question}>
            Your adoption assumption comes from the sponsor. How would you test it
            before using it to size the first production cohort?
          </p>
          <p className={styles.answer}>
            <strong>Candidate 1:</strong> I would ask for active-user data by team and
            compare it with license assignment. If that is unavailable, I would keep
            the first cohort smaller and treat the sponsor&rsquo;s number as directional.
          </p>
          <div className={styles.confidence}>
            <span>Evidence confidence · Commercial judgment</span>
            <strong>Uncertain → Supported with limits</strong>
          </div>
        </section>
      </div>
    </ProductFrame>
  );
}

export function EvidenceReviewScene() {
  const events = [
    ["14:22", "Assumption recorded"],
    ["16:08", "New constraint"],
    ["16:13", "Plan revised"],
    ["16:31", "Defense answer"],
    ["17:05", "Human review"],
  ];

  return (
    <ProductFrame title="Evidence review" context="Candidate 1 · human reviewed">
      <div className={styles.evidenceReview} data-motion-observe="evidence">
        <aside className={styles.timeline}>
          {events.map(([time, event], index) => (
            <div
              className={`${styles.event} ${index === 3 ? styles.eventActive : ""}`}
              key={time}
            >
              <strong>{time}</strong><br />{event}
            </div>
          ))}
        </aside>
        <section className={styles.claimReview}>
          <p className={styles.roleLabel}>Evidence claim</p>
          <h3 className={styles.claimTitle}>
            Candidate 1 adapts a customer recommendation when a material implementation
            constraint changes.
          </h3>
          <div
            className={styles.evidenceMap}
            aria-label="Claim connected to two supporting events and one counter event"
          >
            <svg viewBox="0 0 720 170" aria-hidden>
              <path data-motion-line d="M360 48 C300 82 184 87 118 124" />
              <path data-motion-line d="M360 48 C360 82 360 91 360 124" />
              <path data-motion-line d="M360 48 C422 82 536 87 602 124" />
            </svg>
            <div
              className={`${styles.evidenceMapNode} ${styles.evidenceMapClaim}`}
              data-motion-item="evidence-node"
            >
              <span>Final claim</span>
              <strong>Adaptation · Strength</strong>
            </div>
            <div
              className={`${styles.evidenceMapNode} ${styles.evidenceMapSupportOne}`}
              data-motion-item="evidence-node"
            >
              <span>Support · 16:08</span>
              <strong>Constraint received</strong>
            </div>
            <div
              className={`${styles.evidenceMapNode} ${styles.evidenceMapSupportTwo}`}
              data-motion-item="evidence-node"
            >
              <span>Support · 16:13</span>
              <strong>Plan revised</strong>
            </div>
            <div
              className={`${styles.evidenceMapNode} ${styles.evidenceMapCounter}`}
              data-motion-item="evidence-node"
            >
              <span>Counter · 14:22</span>
              <strong>Unverified sizing retained</strong>
            </div>
          </div>
          <div className={styles.evidenceColumns}>
            <div className={styles.evidenceColumn}>
              <h4>Supporting evidence</h4>
              <p>
                Revised the sequencing within five minutes, preserved useful
                enablement work, and explained why production access had to move.
              </p>
            </div>
            <div className={styles.evidenceColumn}>
              <h4>Counter evidence</h4>
              <p>
                Initial rollout sizing relied on a sponsor estimate Candidate 1 had
                marked as unverified but still used in the recommendation.
              </p>
            </div>
          </div>
          <div className={styles.approval}>
            <span>Reviewer note: claim is supported when the stated limitation remains attached.</span>
            <strong>Approved by human reviewer</strong>
          </div>
        </section>
      </div>
    </ProductFrame>
  );
}

export function InterviewBriefScene() {
  const questions = [
    "Tell me about a time customer urgency conflicted with a security constraint. What did you preserve, and what moved?",
    "How do you validate an executive sponsor’s adoption claim before committing an implementation team?",
    "Which fact in the Acme brief would most likely change your recommendation again?",
  ];

  return (
    <ProductFrame title="Interview brief" context="Candidate 1 · Solutions Engineer" variant="open">
      <div className={styles.interview}>
        <section className={styles.interviewSummary}>
          <p className={styles.roleLabel}>Recommendation</p>
          <h3>Strong interview</h3>
          <p>
            Candidate 1 shows structured discovery, clear customer communication, and
            useful adaptation. Probe how they validate adoption assumptions before
            expanding scope.
          </p>
          <p className={styles.readyLine}>Evidence reviewed</p>
        </section>
        <section className={styles.interviewQuestions}>
          <p className={styles.roleLabel}>Three questions worth asking</p>
          {questions.map((question, index) => (
            <div className={styles.interviewQuestion} key={question}>
              <span>0{index + 1}</span>
              <p>{question}</p>
            </div>
          ))}
        </section>
      </div>
    </ProductFrame>
  );
}

export function OutcomesScene() {
  const nodes = [
    ["01", "Hiring evidence", "Keep the evidence claims and their stated limits."],
    ["02", "Hiring decision", "Record what the team chose to probe and why."],
    ["03", "Observed outcome", "Later, add role outcomes the employer can support."],
    ["04", "Calibration review", "Examine which signals were useful; revise the role definition."],
  ];

  return (
    <ProductFrame title="Calibration loop" context="Northstar · no predictive claim" variant="open">
      <div className={styles.outcomePath}>
        {nodes.map(([number, title, body]) => (
          <section className={styles.outcomeNode} key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </ProductFrame>
  );
}
