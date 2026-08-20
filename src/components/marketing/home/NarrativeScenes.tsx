import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileDiff,
  FileText,
  Link2,
  Lock,
  MessageSquareQuote,
  Mic,
  RefreshCw,
  Save,
  Share2,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import ProductFrame, { CandidateShortlist, WorkspaceRail } from "./ProductFrame";
import { cn } from "@/lib/cn";
import styles from "./homepage.module.css";

/* ================================================================== */
/* 1.0 Evaluate — the candidate's artifact editor                      */
/* ================================================================== */

type DiffKind = "context" | "added" | "removed";

type DiffLine = {
  line: string;
  kind: DiffKind;
  text: string;
};

const DIFF_MARKER: Record<DiffKind, string> = {
  context: " ",
  added: "+",
  removed: "−",
};

const DIFF_CLASS: Record<DiffKind, string | undefined> = {
  context: undefined,
  added: styles.workDiffLineAdded,
  removed: styles.workDiffLineRemoved,
};

/**
 * Revision 4 of rollout_plan.md. The removed lines are the plan the candidate
 * wrote before the security review landed; the added lines are what replaced it.
 * Line 14 survives both revisions, which is why the oral defense can quote it.
 */
const rolloutDiff: DiffLine[] = [
  { line: "09", kind: "context", text: "## Rollout" },
  {
    line: "10",
    kind: "removed",
    text: "Launch all 1,200 seats in a single production cutover at week six.",
  },
  {
    line: "11",
    kind: "removed",
    text: "The authentication security review can run in parallel with production access.",
  },
  {
    line: "10",
    kind: "added",
    text: "Weeks 1–6 · sandbox tenant only, while the six-week security review completes.",
  },
  {
    line: "11",
    kind: "added",
    text: "Week 7 · controlled 200-user cohort in production, after review sign-off.",
  },
  {
    line: "12",
    kind: "added",
    text: "Then expand by business unit after the first support review.",
  },
  {
    line: "13",
    kind: "context",
    text: "Phase one can support 200 users while the remaining business units prepare for production access.",
  },
  {
    line: "14",
    kind: "context",
    text: "Adoption risk should remain low because the sponsor reports strong weekly usage.",
  },
  {
    line: "15",
    kind: "added",
    text: "Cohort size stays provisional until weekly active-user data is verified.",
  },
];

const workbenchStages = [
  { name: "Discovery", state: "complete" },
  { name: "Requirements", state: "complete" },
  { name: "Recommendation", state: "active" },
  { name: "Customer handoff", state: "pending" },
] as const;

const workbenchFiles = [
  { name: "discovery_notes.md", meta: "14:02", active: false },
  { name: "requirements.md", meta: "14:22", active: false },
  { name: "rollout_plan.md", meta: "r4 · 16:13", active: true },
  { name: "customer_email.md", meta: "draft", active: false },
  { name: "assumptions.md", meta: "14:22", active: false },
];

const acmeThread = [
  {
    author: "Platform manager, Acme",
    time: "14:02",
    body: "SAML SSO has to be there on day one, and the board expects launch inside six weeks.",
    flagged: false,
  },
  {
    author: "VP Operations, Acme",
    time: "14:18",
    body: "Usage is strong — most of the 1,200 seats are active weekly.",
    flagged: false,
  },
  {
    author: "Security lead, Acme",
    time: "16:08",
    body: "The authentication security review takes six weeks on its own. Production access cannot be granted before it closes.",
    flagged: true,
  },
];

const requirements = [
  {
    name: "SAML SSO",
    source: "security_brief.pdf",
    confidence: "confirmed",
    impact: "high",
  },
  {
    name: "1,200 seats",
    source: "discovery_call.md",
    confidence: "confirmed",
    impact: "medium",
  },
  {
    name: "weekly active users",
    source: "sponsor estimate",
    confidence: "unverified",
    impact: "high",
  },
  {
    name: "six-week launch",
    source: "implementation_plan.pdf",
    confidence: "confirmed",
    impact: "high",
  },
] as const;

export function WorkbenchScene() {
  return (
    <ProductFrame
      title="Candidate workbench"
      context="Candidate 1 · Northstar"
      meta={[
        { label: "Autosaved 16:13", icon: Save },
        { label: "Encrypted", icon: Lock },
      ]}
    >
      <div className={styles.workbench}>
        <aside className={styles.workNav} aria-label="Stages and files">
          <p className={styles.workNavTitle}>Stages</p>
          <ol className={styles.workStageList}>
            {workbenchStages.map((stage) => (
              <li
                key={stage.name}
                aria-current={stage.state === "active" ? "step" : undefined}
                className={cn(
                  styles.workStage,
                  stage.state === "complete" && styles.workStageComplete,
                  stage.state === "active" && styles.workStageActive,
                )}
              >
                <span className={styles.workStageDot} aria-hidden />
                {stage.name}
              </li>
            ))}
          </ol>

          <p className={styles.workNavTitle}>Files</p>
          <ul className={styles.workFileList}>
            {workbenchFiles.map((file) => (
              <li
                key={file.name}
                aria-current={file.active ? "true" : undefined}
                className={cn(
                  styles.navItem,
                  styles.workFileRow,
                  file.active && styles.navItemActive,
                )}
              >
                <FileText className={styles.workFileIcon} size={12} aria-hidden />
                <span className={styles.workFileName}>{file.name}</span>
                <span className={styles.workFileMeta}>{file.meta}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.workMain} aria-label="rollout_plan.md">
          <header className={styles.workFileBar}>
            <h3 className={styles.workFileTitle}>
              <FileDiff className={styles.workFileIcon} size={13} aria-hidden />
              rollout_plan.md
            </h3>
            <span className={styles.workFileMetaList}>
              <span className={styles.workFileMetaItem}>Markdown</span>
              <span className={styles.workFileMetaItem}>Revision 4</span>
              <span className={styles.workFileMetaItem}>
                <Check size={11} aria-hidden />
                Saved 16:13
              </span>
              <span className={styles.workFileMetaItem}>
                <RefreshCw size={11} aria-hidden />
                Synced
              </span>
            </span>
          </header>

          <div
            className={styles.workDiff}
            aria-label="Revision 4 replaced the single production cutover with a sandbox-first rollout"
          >
            {rolloutDiff.map((row, index) => (
              <div
                key={`${row.kind}-${row.line}-${index}`}
                className={cn(styles.workDiffLine, DIFF_CLASS[row.kind])}
              >
                <span className={styles.workDiffGutter} aria-hidden>
                  {row.line}
                </span>
                <span className={styles.workDiffMarker} aria-hidden>
                  {DIFF_MARKER[row.kind]}
                </span>
                <span className={styles.workDiffCode}>{row.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.workNote}>
            <p className={styles.workNoteLabel}>Current recommendation</p>
            <p>
              Begin with a controlled 200-user deployment, validate identity
              mapping, then expand by business unit after the first support review.
            </p>
          </div>

          <div className={styles.workCitations}>
            <p className={styles.workCitationsLabel}>Sources cited in this revision</p>
            <ul>
              <li className={styles.workCitation}>
                <Link2 className={styles.workCitationIcon} size={11} aria-hidden />
                security_brief.pdf · p.3 · authentication review scope
              </li>
              <li className={styles.workCitation}>
                <Link2 className={styles.workCitationIcon} size={11} aria-hidden />
                discovery_call.md · 14:02 · 1,200 seats, six-week launch target
              </li>
              <li className={styles.workCitation}>
                <Link2 className={styles.workCitationIcon} size={11} aria-hidden />
                assumptions.md · 14:22 · weekly_active_users marked unverified
              </li>
            </ul>
          </div>
        </section>

        <aside className={styles.workContext} aria-label="Customer context">
          <section className={styles.workContextSection}>
            <h4 className={styles.workContextTitle}>Engagement brief</h4>
            <p className={styles.workPrompt}>
              Recommend an implementation path for Acme, a 1,200-seat customer with a
              six-week launch target, SSO requirements, and a small platform team.
            </p>
          </section>

          <section className={styles.workContextSection}>
            <h4 className={styles.workContextTitle}>Acme thread</h4>
            <ol className={styles.workThread}>
              {acmeThread.map((message) => (
                <li
                  key={message.time}
                  className={cn(
                    styles.workThreadMessage,
                    message.flagged && styles.workThreadMessageFlagged,
                  )}
                >
                  <span className={styles.workThreadAuthor}>{message.author}</span>
                  <time className={styles.workThreadTime}>{message.time}</time>
                  <p className={styles.workThreadBody}>{message.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.workContextSection}>
            <h4 className={styles.workContextTitle}>Requirements</h4>
            <ul className={styles.reqList}>
              {requirements.map((requirement) => (
                <li
                  key={requirement.name}
                  className={cn(
                    styles.reqRow,
                    requirement.confidence === "unverified" && styles.reqRowRisk,
                  )}
                >
                  <span className={styles.reqName}>{requirement.name}</span>
                  <span className={styles.reqSource}>{requirement.source}</span>
                  <span className={styles.reqTags}>
                    <em>{requirement.confidence}</em>
                    <em>{requirement.impact} impact</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.workContextSection}>
            <h4 className={styles.workContextTitle}>Assumptions</h4>
            <ul className={styles.workAssumptions}>
              <li className={cn(styles.workAssumption, styles.workAssumptionRisk)}>
                <span className={styles.workAssumptionLabel}>weekly_active_users</span>
                <span className={styles.workAssumptionValue}>
                  sponsor estimate · unverified
                </span>
              </li>
              <li className={styles.workAssumption}>
                <span className={styles.workAssumptionLabel}>cohort_size</span>
                <span className={styles.workAssumptionValue}>200 · provisional</span>
              </li>
              <li className={styles.workAssumption}>
                <span className={styles.workAssumptionLabel}>identity_mapping</span>
                <span className={styles.workAssumptionValue}>
                  validated in sandbox · confirmed
                </span>
              </li>
            </ul>
          </section>

          <section className={cn(styles.workContextSection, styles.workEvidenceNote)}>
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
          </section>
        </aside>

        <div
          className={styles.workConstraint}
          aria-label="Incoming constraint"
          data-focal-layer
        >
          <header className={styles.workConstraintHeader}>
            <span className={styles.workConstraintLabel}>
              <TriangleAlert size={13} aria-hidden />
              Incoming constraint
            </span>
            <time className={styles.workConstraintTime}>16:08</time>
          </header>
          <p className={styles.workConstraintTitle}>
            The authentication security review takes six weeks
          </p>
          <p className={styles.workConstraintBody}>
            Acme&rsquo;s security lead confirms the review is sequential, not
            parallel. Production access cannot be granted until it closes.
          </p>
          <dl className={styles.workConstraintMeta}>
            <div>
              <dt>Source</dt>
              <dd>Security lead, Acme</dd>
            </div>
            <div>
              <dt>Impact</dt>
              <dd>Blocks production access</dd>
            </div>
            <div className={styles.workConstraintReaction}>
              <dt>Reaction time</dt>
              <dd>5m 08s</dd>
            </div>
          </dl>
        </div>
      </div>
    </ProductFrame>
  );
}

/* ================================================================== */
/* 2.0 Calibrate — competency matrix with one competency open          */
/* ================================================================== */

type Competency = {
  name: string;
  behavior: string;
  requirement: string;
  weight: string;
  evidence: string;
  status: string;
};

const competencies: Competency[] = [
  {
    name: "Discovery judgment",
    behavior: "Finds the real constraint before proposing",
    requirement: "Required",
    weight: "30%",
    evidence: "Requirements separated from assumptions",
    status: "Calibrated",
  },
  {
    name: "Technical translation",
    behavior: "Explains architecture to mixed audiences",
    requirement: "Required",
    weight: "25%",
    evidence: "Customer-facing explanation of a tradeoff",
    status: "Calibrated",
  },
  {
    name: "Adaptation",
    behavior: "Revises when customer facts change",
    requirement: "Required",
    weight: "25%",
    evidence: "Revision traced to a changed constraint",
    status: "Editing",
  },
  {
    name: "Commercial judgment",
    behavior: "Connects technical choices to adoption risk",
    requirement: "Useful",
    weight: "20%",
    evidence: "Adoption risk named with its limits",
    status: "Calibrated",
  },
];

const adaptationFields = [
  {
    label: "Observable behavior",
    value:
      "Revises a customer recommendation when a material implementation constraint changes, and states what the revision preserves.",
  },
  {
    label: "Evidence required",
    value:
      "A recorded change of constraint, a revised artifact traced to it, and an explanation the customer could act on.",
  },
  {
    label: "Simulation moment",
    value:
      "16:08 — Acme confirms the authentication security review itself takes six weeks.",
  },
  {
    label: "Interview follow-up",
    value: "Which fact in the Acme brief would most likely change your recommendation again?",
  },
];

export function CalibrationScene() {
  return (
    <ProductFrame
      title="Role calibration"
      context="Northstar · Solutions Engineer"
      variant="open"
      meta={[{ label: "Draft v3 · shared with hiring team", icon: UserCheck }]}
    >
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

        <section className={styles.competencyMatrix} aria-label="Competency matrix">
          <header className={styles.competencyMatrixHeader}>
            <p className={styles.roleLabel}>What good looks like</p>
            <span className={styles.competencyMatrixMeta}>
              4 competencies · weights total 100%
            </span>
          </header>
          <div className={styles.tableScroller}>
            <table className={styles.competencyTable}>
              <thead>
                <tr>
                  <th scope="col">competency</th>
                  <th scope="col">observable behavior</th>
                  <th scope="col">requirement</th>
                  <th scope="col">weight</th>
                  <th scope="col">evidence required</th>
                  <th scope="col">status</th>
                </tr>
              </thead>
              <tbody>
                {competencies.map((competency) => {
                  const open = competency.name === "Adaptation";
                  return (
                    <tr
                      key={competency.name}
                      aria-current={open ? "true" : undefined}
                      className={cn(
                        styles.competencyRow,
                        open && styles.competencyRowActive,
                      )}
                    >
                      <th scope="row" className={styles.competencyName}>
                        {competency.name}
                      </th>
                      <td className={styles.competencyBehavior}>{competency.behavior}</td>
                      <td className={styles.competencyRequirement}>
                        {competency.requirement}
                      </td>
                      <td className={styles.competencyWeight}>{competency.weight}</td>
                      <td className={styles.competencyEvidence}>{competency.evidence}</td>
                      <td className={styles.competencyStatus}>{competency.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside
          className={styles.competencyEditor}
          aria-label="Adaptation competency"
          data-focal-layer
        >
          <header className={styles.competencyEditorHeader}>
            <div>
              <p className={styles.roleLabel}>Editing competency</p>
              <h3 className={styles.competencyEditorTitle}>Adaptation</h3>
            </div>
            <span className={styles.competencyEditorTags}>
              <span className={cn(styles.competencyTag, styles.competencyTagRequired)}>
                Required
              </span>
              <span className={styles.competencyTag}>Weight 25%</span>
            </span>
          </header>

          <dl className={styles.competencyFields}>
            {adaptationFields.map((field) => (
              <div className={styles.competencyField} key={field.label}>
                <dt className={styles.competencyFieldLabel}>{field.label}</dt>
                <dd className={styles.competencyFieldValue}>{field.value}</dd>
              </div>
            ))}
          </dl>

          <footer className={styles.competencyEditorFooter}>
            <span className={styles.competencyAgreement}>
              Reviewer agreement
              <strong>2 of 2</strong>
            </span>
            <span className={styles.competencyApproval}>
              <CircleCheck size={12} aria-hidden />
              Approved by MK · 12 Aug
            </span>
          </footer>
        </aside>
      </div>
    </ProductFrame>
  );
}

/* ================================================================== */
/* 3.0 Adapt — one causal composition, not a timeline                  */
/* ================================================================== */

const adaptTrace = [
  { time: "14:22", label: "assumption_added", detail: "weekly_active_users: unverified" },
  { time: "16:08", label: "constraint_delivered", detail: "security_review: six weeks, sequential" },
  { time: "16:13", label: "artifact_revised", detail: "rollout_plan.md → revision 4" },
];

export function AdaptScene() {
  return (
    <figure
      className={styles.adaptStage}
      aria-label="Changed-information event"
      data-motion-observe="adapt"
    >
      <figcaption className={styles.adaptStageCaption}>
        <strong>Changed-information event</strong>
        <span>Candidate 1 · Acme rollout</span>
      </figcaption>

      <div className={styles.adaptBaseline} data-motion-item="adapt-event">
        <span className={styles.adaptBaselineLabel}>
          <time>14:22</time>
          Initial recommendation
        </span>
        <h3 className={styles.adaptBaselineTitle}>Single launch in six weeks</h3>
        <p className={styles.adaptBaselineBody}>
          Candidate 1 proposes a broad rollout after identity validation, assuming
          the authentication security review can run in parallel.
        </p>
      </div>

      <div className={styles.adaptConstraint} data-motion-item="adapt-event">
        <span className={styles.adaptConstraintLabel}>
          <TriangleAlert size={13} aria-hidden />
          New information
          <time>16:08</time>
        </span>
        <h3 className={styles.adaptConstraintTitle}>
          Security review blocks production access
        </h3>
        <p className={styles.adaptConstraintBody}>
          Acme confirms the authentication review itself takes six weeks. Material
          constraint · production data cannot be connected first.
        </p>
      </div>

      <div className={styles.adaptRevision} data-motion-item="adapt-event">
        <header className={styles.adaptRevisionHeader}>
          <span className={styles.adaptRevisionLabel}>
            <time>16:13</time>
            Recommendation revised
          </span>
          <h3 className={styles.adaptRevisionTitle}>Sandbox now, production later</h3>
        </header>

        <div className={styles.adaptDiff} aria-label="Rollout plan before and after">
          <div className={cn(styles.adaptDiffColumn, styles.adaptDiffBefore)}>
            <p className={styles.adaptDiffLabel}>Before</p>
            <p className={styles.adaptDiffLine}>
              All 1,200 seats in a single production cutover at week six.
            </p>
            <p className={styles.adaptDiffLine}>
              Security review runs in parallel with production access.
            </p>
          </div>
          <ArrowRight className={styles.adaptDiffArrow} size={14} aria-hidden />
          <div className={cn(styles.adaptDiffColumn, styles.adaptDiffAfter)}>
            <p className={styles.adaptDiffLabel}>After</p>
            <p className={styles.adaptDiffLine}>
              Weeks 1–6 sandbox only, while the review completes.
            </p>
            <p className={styles.adaptDiffLine}>
              Week 7 controlled 200-user cohort, after sign-off.
            </p>
          </div>
        </div>

        <p className={styles.adaptRevisionBody}>
          Candidate 1 preserves the enablement work and separates it from the blocked
          integration, removing the parallel-review assumption.
        </p>
      </div>

      <div className={styles.adaptReaction}>
        <span className={styles.adaptReactionLabel}>Reaction time</span>
        <strong className={styles.adaptReactionValue}>5m 08s</strong>
        <span className={styles.adaptReactionDetail}>constraint received → plan revised</span>
      </div>

      <div className={styles.adaptUnresolved}>
        <span className={styles.adaptUnresolvedLabel}>Still unresolved</span>
        <p>
          The 200-user cohort remains provisional. Rollout sizing still depends on
          Acme&rsquo;s self-reported weekly active-user count.
        </p>
      </div>

      <ol className={styles.adaptTrace} aria-label="Evidence trace">
        {adaptTrace.map((entry) => (
          <li className={styles.adaptTraceItem} key={entry.time}>
            <time className={styles.adaptTraceTime}>{entry.time}</time>
            <span className={styles.adaptTraceLabel}>{entry.label}</span>
            <span className={styles.adaptTraceDetail}>{entry.detail}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/* ================================================================== */
/* 4.0 Defend — a live oral defense in progress                        */
/* ================================================================== */

export function DefenseScene() {
  return (
    <ProductFrame
      title="Oral defense"
      context="Candidate 1 · generated from the work"
      variant="band"
      meta={[
        { label: "Questions from rollout_plan.md", icon: Mic },
        { label: "Rubric SE-1.4", icon: RefreshCw },
      ]}
    >
      <div className={styles.defense}>
        <header className={styles.defenseStatusBar}>
          <span className={styles.defenseRecording}>
            <span className={styles.defenseRecordingDot} aria-hidden />
            Recording
          </span>
          <span className={styles.defenseProgress}>Question 2 of 3</span>
          <span className={styles.defenseElapsed}>
            <time dateTime="PT1M24S">01:24</time> elapsed
          </span>
        </header>

        <section className={styles.artifact}>
          <p className={styles.roleLabel}>Question source · rollout_plan.md · line 14</p>
          <div className={styles.defenseSourceLines}>
            <p className={styles.defenseSourceLine}>
              <span className={styles.defenseSourceGutter} aria-hidden>
                13
              </span>
              Phase one can support 200 users while the remaining business units
              prepare for production access.
            </p>
            <p className={cn(styles.defenseSourceLine, styles.defenseSourceLineActive)}>
              <span className={styles.defenseSourceGutter} aria-hidden>
                14
              </span>
              <span className={styles.artifactLine}>
                <mark>Adoption risk should remain low</mark> because the sponsor
                reports strong weekly usage.
              </span>
            </p>
          </div>
        </section>

        <section className={styles.defenseExchange} aria-label="Live transcript">
          <ol className={styles.defenseTranscript}>
            <li className={cn(styles.defenseTurn, styles.defenseTurnInterviewer)}>
              <span className={styles.defenseTurnSpeaker}>Fydell</span>
              <time className={styles.defenseTurnTime}>00:41</time>
              <p className={cn(styles.defenseTurnBody, styles.question)}>
                Your adoption assumption comes from the sponsor. How would you test it
                before using it to size the first production cohort?
              </p>
            </li>
            <li className={cn(styles.defenseTurn, styles.defenseTurnCandidate)}>
              <span className={styles.defenseTurnSpeaker}>Candidate 1</span>
              <time className={styles.defenseTurnTime}>01:03</time>
              <p className={cn(styles.defenseTurnBody, styles.answer)}>
                I would ask for active-user data by team and compare it with license
                assignment. If that is unavailable, I would keep the first cohort
                smaller and treat the sponsor&rsquo;s number as directional.
              </p>
            </li>
            <li className={cn(styles.defenseTurn, styles.defenseTurnLive)}>
              <span className={styles.defenseTurnSpeaker}>Candidate 1</span>
              <time className={styles.defenseTurnTime}>01:24</time>
              <p className={styles.defenseTurnBody}>
                The number I would not move on is the sandbox window, because that one
                is set by the review
                <span className={styles.defenseCaret} aria-hidden />
              </p>
            </li>
          </ol>
          <p className={styles.defenseTranscribing}>Transcribing</p>
        </section>

        <aside className={styles.defenseLogic} aria-label="Follow-up logic">
          <p className={styles.defenseLogicTitle}>Follow-up logic</p>
          <ul className={styles.defenseLogicRules}>
            <li className={styles.defenseLogicRule}>
              <span className={styles.defenseLogicCondition}>
                If license assignment is offered as proof
              </span>
              <span className={styles.defenseLogicAction}>
                Ask what would distinguish an assigned seat from an active user.
              </span>
            </li>
            <li className={styles.defenseLogicRule}>
              <span className={styles.defenseLogicCondition}>
                If no verification path is named
              </span>
              <span className={styles.defenseLogicAction}>
                Question 3 shifts to what would change the recommendation again.
              </span>
            </li>
          </ul>
          <div className={styles.confidence}>
            <span>Evidence confidence · Commercial judgment</span>
            <strong>Uncertain → Supported with limits</strong>
          </div>
        </aside>
      </div>
    </ProductFrame>
  );
}

/* ================================================================== */
/* 5.0 Evidence — an explicit claim graph under human review           */
/* ================================================================== */

type GraphNode = {
  id: string;
  relation: string;
  sourceType: string;
  time: string;
  artifact: string;
  title: string;
  positionClass: string;
  edgeClass: string;
};

const graphNodes: GraphNode[] = [
  {
    id: "support",
    relation: "Support",
    sourceType: "World event",
    time: "16:08",
    artifact: "acme_security_review.md",
    title: "Constraint received",
    positionClass: styles.graphNodeSupport,
    edgeClass: styles.graphEdgeLabelSupport,
  },
  {
    id: "derived",
    relation: "Derived from",
    sourceType: "Artifact revision",
    time: "16:13",
    artifact: "rollout_plan.md · r4",
    title: "Plan revised",
    positionClass: styles.graphNodeDerived,
    edgeClass: styles.graphEdgeLabelDerived,
  },
  {
    id: "counter",
    relation: "Counter",
    sourceType: "Assumption record",
    time: "14:22",
    artifact: "assumptions.md",
    title: "Unverified sizing retained",
    positionClass: styles.graphNodeCounter,
    edgeClass: styles.graphEdgeLabelCounter,
  },
  {
    id: "clarify",
    relation: "Clarify",
    sourceType: "Defense answer",
    time: "16:31",
    artifact: "defense_transcript.txt",
    title: "Sponsor number kept directional",
    positionClass: styles.graphNodeClarify,
    edgeClass: styles.graphEdgeLabelClarify,
  },
  {
    id: "verified",
    relation: "Verified by",
    sourceType: "Human review",
    time: "17:05",
    artifact: "review_log · MK",
    title: "Reviewed against the rubric",
    positionClass: styles.graphNodeVerified,
    edgeClass: styles.graphEdgeLabelVerified,
  },
];

const graphEdgePaths = [
  "M480 210 C 386 172 262 118 192 86",
  "M480 210 C 574 172 698 118 768 86",
  "M480 210 C 386 248 262 302 192 334",
  "M480 210 C 574 248 698 302 768 334",
  "M480 210 C 480 276 480 316 480 366",
];

const reviewDecisions = [
  { label: "Approve", state: "Available" },
  { label: "Approve with limitation", state: "Selected" },
  { label: "Return for more evidence", state: "Available" },
  { label: "Reject claim", state: "Available" },
];

const reviewProvenance = [
  { label: "Prompt", value: "defense-probe v3.2" },
  { label: "Model", value: "fydell-eval 2026.02" },
  { label: "Rubric", value: "SE-1.4" },
];

const timelineEvents = [
  ["14:22", "Assumption recorded"],
  ["16:08", "New constraint"],
  ["16:13", "Plan revised"],
  ["16:31", "Defense answer"],
  ["17:05", "Human review"],
];

export function EvidenceReviewScene() {
  return (
    <ProductFrame
      title="Evidence review"
      context="Candidate 1 · human reviewed"
      meta={[{ label: "Reviewed 17:05 · MK", icon: UserCheck }]}
    >
      <div className={styles.evidenceReview} data-motion-observe="evidence">
        <aside className={styles.timeline} aria-label="Event trail">
          {timelineEvents.map(([time, event], index) => (
            <div
              className={cn(styles.event, index === 3 && styles.eventActive)}
              key={time}
            >
              <strong>{time}</strong>
              <br />
              {event}
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
            className={styles.evidenceGraph}
            aria-label="The claim is connected to a supporting world event, the revision it derives from, one counter assumption, a clarifying defense answer, and a human verification"
          >
            <svg
              className={styles.evidenceGraphCanvas}
              viewBox="0 0 960 420"
              preserveAspectRatio="none"
              aria-hidden
            >
              {graphEdgePaths.map((path) => (
                <path data-motion-line d={path} key={path} />
              ))}
            </svg>

            <div
              className={cn(styles.graphNode, styles.graphNodeClaim)}
              data-motion-item="evidence-node"
            >
              <span className={styles.graphNodeType}>Claim · Adaptation</span>
              <strong className={styles.graphNodeTitle}>
                Recommendation adapts to a material constraint
              </strong>
              <span className={styles.graphNodeArtifact}>
                Confidence moderate · limitation attached
              </span>
            </div>

            {graphNodes.map((node) => (
              <div
                key={node.id}
                className={cn(styles.graphNode, node.positionClass)}
                data-motion-item="evidence-node"
              >
                <span className={styles.graphNodeType}>
                  {node.sourceType}
                  <time className={styles.graphNodeTime}>{node.time}</time>
                </span>
                <strong className={styles.graphNodeTitle}>{node.title}</strong>
                <span className={styles.graphNodeArtifact}>
                  <FileText size={10} aria-hidden />
                  {node.artifact}
                </span>
              </div>
            ))}

            {graphNodes.map((node) => (
              <span
                key={`${node.id}-edge`}
                className={cn(styles.graphEdgeLabel, node.edgeClass)}
              >
                {node.relation}
              </span>
            ))}
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
        </section>

        <aside className={styles.reviewPanel} aria-label="Human review" data-focal-layer>
          <header className={styles.reviewPanelHeader}>
            <p className={styles.roleLabel}>Human review</p>
            <span className={styles.reviewPanelMeta}>MK · 17:05</span>
          </header>

          <ul className={styles.reviewDecisionList}>
            {reviewDecisions.map((decision) => {
              const selected = decision.state === "Selected";
              return (
                <li
                  key={decision.label}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    styles.reviewDecisionRow,
                    selected && styles.reviewDecisionRowSelected,
                  )}
                >
                  <span className={styles.reviewDecisionMarker} aria-hidden>
                    {selected ? <Check size={11} /> : null}
                  </span>
                  <span className={styles.reviewDecisionLabel}>{decision.label}</span>
                  <span className={styles.reviewDecisionState}>{decision.state}</span>
                </li>
              );
            })}
          </ul>

          <div className={styles.reviewNote}>
            <p className={styles.reviewNoteLabel}>Reviewer note</p>
            <p>
              Claim is supported when the stated limitation remains attached. Do not
              carry the adoption number into the interview as settled.
            </p>
          </div>

          <dl className={styles.reviewProvenance}>
            {reviewProvenance.map((item) => (
              <div className={styles.reviewProvenanceItem} key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </ProductFrame>
  );
}

/* ================================================================== */
/* 6.0 Interview — the plan, over the shortlist it came from           */
/* ================================================================== */

type PlannedQuestion = {
  question: string;
  evidence: string;
  matters: string;
  unresolved: string;
  strong: string;
};

const plannedQuestions: PlannedQuestion[] = [
  {
    question:
      "Tell me about a time customer urgency conflicted with a security constraint. What did you preserve, and what moved?",
    evidence: "rollout_plan.md · revision 4 · 16:13",
    matters:
      "The Acme revision is the strongest observed signal for Adaptation. A second example shows whether it repeats outside a prompted moment.",
    unresolved:
      "Whether the sequencing instinct holds when the constraint comes from an internal team rather than the customer.",
    strong:
      "Names what was preserved, what moved, and who was told — not just that the plan changed.",
  },
  {
    question:
      "How do you validate an executive sponsor’s adoption claim before committing an implementation team?",
    evidence: "assumptions.md · 14:22 · weekly_active_users unverified",
    matters:
      "Candidate 1 marked the number unverified and still used it to size the first cohort.",
    unresolved:
      "Rollout sizing still depends on Acme’s self-reported weekly active-user count.",
    strong:
      "Describes a concrete check — usage by team against license assignment — and what they would do when it is unavailable.",
  },
  {
    question:
      "Which fact in the Acme brief would most likely change your recommendation again?",
    evidence: "defense transcript · 16:31 · question 2 of 3",
    matters:
      "Tests whether the candidate can rank their own uncertainty instead of defending the plan they already wrote.",
    unresolved:
      "Whether the six-week review is the only sequencing blocker Acme has not disclosed.",
    strong:
      "Picks a fact with real decision impact and says how they would detect the change early.",
  },
];

export function InterviewBriefScene() {
  return (
    <ProductFrame
      title="Interview brief"
      context="Candidate 1 · Solutions Engineer"
      variant="open"
      meta={[{ label: "Review completed 18 Aug", icon: CircleCheck }]}
    >
      <div className={styles.interviewStage}>
        <div className={styles.interviewBackdrop} aria-hidden>
          <WorkspaceRail activeItem="Candidates" compact />
          <CandidateShortlist selectedId="candidate-1" compact context="Shortlist" />
        </div>

        <article className={styles.interviewPlan} data-focal-layer>
          <header className={styles.interviewPlanHeader}>
            <div>
              <p className={styles.roleLabel}>Interview plan</p>
              <h3 className={styles.interviewPlanTitle}>Candidate 1</h3>
            </div>
            <dl className={styles.interviewPlanMeta}>
              <div className={styles.interviewPlanMetaItem}>
                <dt>Interviewer</dt>
                <dd>MK</dd>
              </div>
              <div className={styles.interviewPlanMetaItem}>
                <dt>Estimated duration</dt>
                <dd>45 minutes</dd>
              </div>
              <div className={styles.interviewPlanMetaItem}>
                <dt>Round</dt>
                <dd>Panel 1 of 2</dd>
              </div>
            </dl>
          </header>

          <section className={styles.interviewSummary}>
            <p className={styles.roleLabel}>Reviewer decision</p>
            <h3>Advance to interview</h3>
            <p>
              Candidate 1 shows structured discovery, clear customer communication, and
              useful adaptation. Probe how they validate adoption assumptions before
              expanding scope.
            </p>
          </section>

          <ol className={styles.interviewQuestionList}>
            {plannedQuestions.map((entry, index) => (
              <li className={styles.interviewQuestionCard} key={entry.question}>
                <span className={styles.interviewQuestionIndex} aria-hidden>
                  0{index + 1}
                </span>
                <p className={styles.interviewQuestionText}>{entry.question}</p>
                <span className={styles.interviewEvidenceLink}>
                  <Link2 size={11} aria-hidden />
                  {entry.evidence}
                </span>
                <dl className={styles.interviewQuestionFields}>
                  <div className={styles.interviewQuestionField}>
                    <dt className={styles.interviewQuestionFieldLabel}>Why it matters</dt>
                    <dd className={styles.interviewQuestionFieldValue}>{entry.matters}</dd>
                  </div>
                  <div className={styles.interviewQuestionField}>
                    <dt className={styles.interviewQuestionFieldLabel}>
                      Unresolved assumption
                    </dt>
                    <dd className={styles.interviewQuestionFieldValue}>
                      {entry.unresolved}
                    </dd>
                  </div>
                  <div className={styles.interviewQuestionField}>
                    <dt className={styles.interviewQuestionFieldLabel}>
                      A strong answer
                    </dt>
                    <dd className={styles.interviewQuestionFieldValue}>{entry.strong}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>

          <section className={styles.interviewEvaluation}>
            <p className={styles.interviewEvaluationLabel}>
              Interviewer evaluation · completed after the session
            </p>
            <p className={styles.interviewEvaluationField}>
              Record what changed your view, and which assumption is now resolved.
            </p>
          </section>

          <footer className={styles.interviewPlanFooter}>
            <span className={styles.interviewShareMeta}>
              <Share2 size={11} aria-hidden />
              Shared with hiring panel · 18 Aug
            </span>
            <span className={styles.interviewShareMeta}>
              <FileText size={11} aria-hidden />
              Exported · brief_candidate-1.pdf
            </span>
          </footer>
        </article>
      </div>
    </ProductFrame>
  );
}

/* ================================================================== */
/* 7.0 Outcomes — the loop, with what each stage actually holds        */
/* ================================================================== */

type OutcomeStage = {
  step: string;
  title: string;
  body: string;
  holds: string;
  state: string;
  icon: LucideIcon;
};

const outcomeStages: OutcomeStage[] = [
  {
    step: "01",
    title: "Hiring evidence",
    body: "Keep the evidence claims and their stated limits.",
    holds: "5 claims · 2 carry limitations",
    state: "Recorded",
    icon: CircleCheck,
  },
  {
    step: "02",
    title: "Hiring decision",
    body: "Record what the team chose to probe and why.",
    holds: "Advance to interview · 18 Aug",
    state: "Recorded",
    icon: CircleCheck,
  },
  {
    step: "03",
    title: "Observed outcome",
    body: "Later, add role outcomes the employer can support.",
    holds: "Nothing recorded yet",
    state: "Awaiting outcome",
    icon: RefreshCw,
  },
  {
    step: "04",
    title: "Calibration review",
    body: "Examine which signals were useful; revise the role definition.",
    holds: "Feeds the next role definition",
    state: "Scheduled",
    icon: ArrowRight,
  },
];

export function OutcomesScene() {
  return (
    <ProductFrame
      title="Calibration loop"
      context="Northstar · no predictive claim"
      variant="open"
      meta={[{ label: "1 role · 1 cycle recorded", icon: RefreshCw }]}
    >
      <ol className={styles.outcomeLoop}>
        {outcomeStages.map((stage) => (
          <li className={styles.outcomeStage} key={stage.step}>
            <span className={styles.outcomeStageIndex} aria-hidden>
              {stage.step}
            </span>
            <div className={styles.outcomeStageBody}>
              <h3 className={styles.outcomeStageTitle}>{stage.title}</h3>
              <p>{stage.body}</p>
              <span className={styles.outcomeStageHolds}>{stage.holds}</span>
            </div>
            <span className={styles.outcomeStageState}>
              <stage.icon size={11} aria-hidden />
              {stage.state}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.outcomeLoopNote}>
        <MessageSquareQuote size={12} aria-hidden />
        The review returns to the role definition. Fydell does not claim validated
        prediction today; the loop preserves what was seen and what happened next.
      </p>
    </ProductFrame>
  );
}
