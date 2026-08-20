import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Compass,
  FileDiff,
  FileText,
  Info,
  Link2,
  Lock,
  MessageSquareQuote,
  Mic,
  RefreshCw,
  Save,
  Share2,
  TriangleAlert,
  TrendingUp,
  UserCheck,
  X,
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
    behavior: "Understands the problem and identifies root causes and constraints.",
    requirement: "Required",
    weight: "30%",
    evidence: "Requirements separated from assumptions",
    status: "Calibrated",
  },
  {
    name: "Technical translation",
    behavior: "Turns requirements into a feasible, implementable solution.",
    requirement: "Required",
    weight: "20%",
    evidence: "Customer-facing explanation of a tradeoff",
    status: "Calibrated",
  },
  {
    name: "Adaptation",
    behavior:
      "Adapts approach when new information changes the problem, timeline, or stakeholders.",
    requirement: "Required",
    weight: "30%",
    evidence: "Revision traced to a changed constraint",
    status: "Editing",
  },
  {
    name: "Commercial judgment",
    behavior: "Balances customer value, effort, and commercial outcome.",
    requirement: "Useful",
    weight: "20%",
    evidence: "Adoption risk named with its limits",
    status: "Calibrated",
  },
];

const calibrationStages = [
  { name: "Discovery", detail: "Understand the problem and stakeholders", icon: Compass },
  { name: "Architecture", detail: "Design the right solution and approach", icon: Braces },
  { name: "Rollout", detail: "Deliver value and ensure adoption", icon: RefreshCw },
  { name: "Executive handoff", detail: "Transfer ownership and drive outcomes", icon: UserCheck },
];

const calibrationPaths: Record<string, string[]> = {
  "Discovery judgment": [
    "Stakeholder map complete",
    "Problem framed and validated",
    "Risks and assumptions validated",
    "",
  ],
  "Technical translation": [
    "Requirements clarified",
    "Solution approach socialized",
    "Solution proven in relevant context",
    "",
  ],
  Adaptation: [
    "Change detected",
    "Plan adapted and tradeoffs updated",
    "Stakeholders aligned on updated plan",
    "",
  ],
  "Commercial judgment": [
    "Value and success metrics defined",
    "Business case and ROI validated",
    "Adoption and value tracking in place",
    "",
  ],
};

const competencyIcons: Record<string, LucideIcon> = {
  "Discovery judgment": Compass,
  "Technical translation": Braces,
  Adaptation: RefreshCw,
  "Commercial judgment": TrendingUp,
};

const benchFiles = [
  { name: "Discovery notes", marker: null },
  { name: "Architecture brief", marker: null },
  { name: "Rollout plan", marker: "active" },
  { name: "Customer email", marker: null },
  { name: "Assumptions", marker: "uncertain" },
];

const benchRequirements = [
  {
    requirement: "Security review is mandatory before production access.",
    source: "security_brief.pdf",
    confidence: "High",
    impact: "Blocks production for six weeks",
  },
  {
    requirement: "Production access requires customer success approval.",
    source: "discovery_call.md",
    confidence: "Medium",
    impact: "Adds an approval step",
  },
  {
    requirement: "Adoption tracking depends on weekly active users.",
    source: "sponsor_estimate.xlsx",
    confidence: "Low",
    impact: "Affects the timeline estimate",
  },
];

export function CalibrationScene() {
  return (
    <figure className={styles.calScene} aria-label="Role calibration">
      <figcaption className={styles.calTitle}>
        <div className={styles.calTitleRow}>
          <h3>Role calibration</h3>
          <span className={styles.calTitleSlash} aria-hidden>
            /
          </span>
          <strong>Solutions Engineer</strong>
          <ChevronDown size={14} aria-hidden />
          <span className={styles.calShare}>
            <Share2 size={12} aria-hidden />
            Share
          </span>
          <span className={styles.calMore} aria-hidden>
            ⋮
          </span>
        </div>
        <p>Define what great looks like, connect evidence, and align on judgment.</p>
      </figcaption>

      <div className={styles.calBody}>
        <aside className={styles.calGuide}>
          <header>
            <strong>Calibration guide</strong>
            <span className={styles.calDraft}>Draft</span>
          </header>
          <p className={styles.calGuideIntro}>
            Competencies, observable behaviors, and the evidence that signals
            readiness at each stage.
          </p>
          <ul>
            {competencies.map((competency) => {
              const active = competency.name === "Adaptation";
              const Icon = competencyIcons[competency.name];
              return (
                <li
                  key={competency.name}
                  className={cn(active && styles.calGuideItemActive)}
                >
                  <div className={styles.calGuideRow}>
                    <Icon size={14} aria-hidden />
                    <strong>{competency.name}</strong>
                    <span className={styles.calGuideWeight}>{competency.weight}</span>
                    <ChevronRight size={13} aria-hidden />
                  </div>
                  <p
                    className={cn(
                      styles.calGuideRequirement,
                      competency.requirement === "Useful" && styles.calGuideOptional,
                    )}
                  >
                    {competency.requirement}
                  </p>
                  <p className={styles.calGuideBehavior}>{competency.behavior}</p>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={styles.calMap}>
          <header className={styles.calStageRow}>
            <span aria-hidden />
            {calibrationStages.map((stage) => (
              <div key={stage.name}>
                <p>
                  <stage.icon size={13} aria-hidden />
                  {stage.name}
                </p>
                <span>{stage.detail}</span>
              </div>
            ))}
          </header>

          <div className={styles.calRows}>
            {competencies.map((competency) => {
              const active = competency.name === "Adaptation";
              return (
                <div
                  key={competency.name}
                  className={cn(styles.calRow, active && styles.calRowActive)}
                >
                  <div className={styles.calRowLabel}>
                    <strong>{competency.name}</strong>
                    <span>{competency.weight}</span>
                  </div>
                  {calibrationPaths[competency.name].map((signal, stageIndex) => (
                    <div className={styles.calCell} key={stageIndex}>
                      <span
                        className={cn(
                          styles.calNode,
                          stageIndex < 3 && styles.calNodeFilled,
                        )}
                        aria-hidden
                      />
                      {signal ? (
                        <div className={styles.calSignal}>
                          <strong>{signal}</strong>
                          {active && stageIndex === 1 ? (
                            <span className={styles.calSignalSources}>
                              <FileText size={11} aria-hidden />
                              <MessageSquareQuote size={11} aria-hidden />
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <footer className={styles.calLegend}>
            <span>Evidence sources</span>
            <span>
              <MessageSquareQuote size={12} aria-hidden /> Interview
            </span>
            <span>
              <FileText size={12} aria-hidden /> Work sample
            </span>
            <span>
              <UserCheck size={12} aria-hidden /> Stakeholder feedback
            </span>
            <span>
              <Braces size={12} aria-hidden /> Project artifact
            </span>
          </footer>
        </section>

        <article className={styles.calBench} data-focal-layer>
          <header className={styles.calBenchHeader}>
            <strong>Candidate workbench</strong>
            <span>
              Candidate 1 · Acme rollout
              <ChevronDown size={12} aria-hidden />
            </span>
          </header>

          <div className={styles.calBenchBody}>
            <div className={styles.calBenchFiles}>
              <p className={styles.calBenchFilesTitle}>
                Acme technical discovery
                <ChevronDown size={11} aria-hidden />
              </p>
              <ul>
                {benchFiles.map((file) => (
                  <li
                    key={file.name}
                    className={cn(file.marker === "active" && styles.calBenchFileActive)}
                  >
                    <FileText size={11} aria-hidden />
                    {file.name}
                    {file.marker ? (
                      <span
                        className={cn(
                          styles.calBenchFileDot,
                          file.marker === "uncertain" && styles.calBenchFileDotUncertain,
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className={styles.calBenchThread}>
                <p className={styles.calBenchThreadTitle}>Customer thread</p>
                <p className={styles.calBenchMessageMeta}>
                  <span aria-hidden>SL</span>
                  Security lead, Acme · 10:44
                </p>
                <p className={styles.calBenchMessage}>
                  Please update the rollout plan to reflect this constraint and the
                  revised approach.
                </p>
                <div className={styles.calBenchComposer}>
                  <span>Write a reply…</span>
                  <span className={styles.calBenchSend}>Send</span>
                </div>
              </div>
            </div>

            <div className={styles.calBenchMain}>
              <p className={styles.calBenchLabel}>Current recommendation</p>
              <p className={styles.calBenchRecommendation}>
                <span aria-hidden>+</span>
                Sandbox now, production access after security sign-off
              </p>

              <table className={styles.calBenchTable}>
                <thead>
                  <tr>
                    <th scope="col">Requirement</th>
                    <th scope="col">Source</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Decision impact</th>
                  </tr>
                </thead>
                <tbody>
                  {benchRequirements.map((row) => (
                    <tr key={row.source}>
                      <td>{row.requirement}</td>
                      <td className={styles.calBenchMono}>{row.source}</td>
                      <td>{row.confidence}</td>
                      <td>{row.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.calBenchFooter}>
                <div>
                  <p className={styles.calBenchLabel}>Evidence</p>
                  <span className={styles.calBenchChip}>
                    <FileText size={11} aria-hidden />
                    security_brief.pdf
                    <em>page 4</em>
                  </span>
                </div>
                <div>
                  <p className={cn(styles.calBenchLabel, styles.calBenchLabelWarn)}>
                    Unverified
                  </p>
                  <span className={cn(styles.calBenchChip, styles.calBenchChipWarn)}>
                    <FileText size={11} aria-hidden />
                    sponsor_estimate.xlsx
                    <em>sheet: usage</em>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </figure>
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

      <div className={styles.adaptWorkspace}>
        <header className={styles.adaptFileHeader}>
          <span>
            <FileText size={13} aria-hidden />
            rollout_plan.md
          </span>
          <span>Revision 4 · saved 16:13</span>
        </header>

        <div className={styles.adaptDocument} aria-label="Revised rollout plan">
          <p className={styles.adaptDocumentSection}>## Rollout sequence</p>
          <p className={styles.adaptLineRemoved}>
            <span>10</span>
            Launch all 1,200 seats in one production cutover at week six.
          </p>
          <p className={styles.adaptLineRemoved}>
            <span>11</span>
            Authentication review runs in parallel with production access.
          </p>
          <p className={styles.adaptLineAdded}>
            <span>10</span>
            Weeks 1–6: sandbox tenant while the security review completes.
          </p>
          <p className={styles.adaptLineAdded}>
            <span>11</span>
            Week 7: controlled 200-user cohort after security sign-off.
          </p>
          <p className={styles.adaptLineAdded}>
            <span>12</span>
            Expand by business unit after the first support review.
          </p>
          <p className={styles.adaptDocumentSection}>## Open assumption</p>
          <p className={styles.adaptLineNeutral}>
            <span>18</span>
            Cohort size remains provisional until weekly active-user data is verified.
          </p>
        </div>

        <aside
          className={styles.adaptConstraintOverlay}
          data-motion-item="adapt-event"
          data-focal-layer
        >
          <header>
            <span>
              <TriangleAlert size={13} aria-hidden />
              Incoming constraint
            </span>
            <time>16:08</time>
          </header>
          <h3>Security review blocks production access</h3>
          <p>
            Acme confirms the authentication review takes six weeks and must finish
            before production data can be connected.
          </p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>Security lead, Acme</dd>
            </div>
            <div>
              <dt>Artifact changed</dt>
              <dd>rollout_plan.md · r4</dd>
            </div>
          </dl>
        </aside>
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

type EvidenceEvent = {
  time: string;
  title: string;
  detail: string;
  artifact: string;
  tone: string;
  icon?: LucideIcon;
};

const evidenceEvents: EvidenceEvent[] = [
  {
    time: "14:22",
    title: "Assumption recorded",
    detail: "Initial rollout sizing relied on a sponsor estimate.",
    artifact: "rollout_plan.md · line 18",
    tone: styles.insDotUncertain,
  },
  {
    time: "14:46",
    title: "New constraint",
    detail: "Six-week authentication security review.",
    artifact: "security_brief.pdf · p.4",
    tone: styles.insDotObserved,
  },
  {
    time: "16:13",
    title: "Plan revised",
    detail: "Adjusted rollout to sequence a sandbox-first approach.",
    artifact: "rollout_plan.md · line 42",
    tone: styles.insDotSupport,
  },
  {
    time: "17:01",
    title: "Defense answer",
    detail: "Explained tradeoffs and how the constraint was retained.",
    artifact: "oral defense · Q2",
    tone: styles.insDotGenerated,
    icon: TriangleAlert,
  },
  {
    time: "17:32",
    title: "Human review",
    detail: "Approved with notes; one assumption flagged for interview.",
    artifact: "K. Patel · review",
    tone: styles.insDotSupport,
  },
];

const supportingEvidence = [
  {
    title: "Plan revised to sequence a sandbox-first approach.",
    detail:
      "Adjusts sequencing so production access follows the security review.",
    artifact: "rollout_plan.md",
    time: "16:13",
  },
  {
    title: "Constraint received from the security team.",
    detail: "Security review is mandatory before production access.",
    artifact: "security_brief.pdf",
    time: "14:46",
  },
];

const counterEvidence = [
  {
    title: "Sponsor estimate uses a shorter timeline.",
    detail: "Estimate assumes no extended security review.",
    artifact: "sponsor_estimate.xlsx",
    time: "14:10",
  },
  {
    title: "Industry benchmark shows longer cycles.",
    detail: "Similar companies report six to eight week reviews.",
    artifact: "benchmark_2026.pdf",
    time: "14:55",
  },
];

const defenseTranscript = [
  {
    speaker: "Candidate",
    text: "I'd look for active-user data from teams similar to the sponsor and compare it to their license assignment.",
  },
  {
    speaker: "Interviewer",
    text: "And if that data isn't available?",
  },
  {
    speaker: "Candidate",
    text: "I'd size the first cohort smaller and treat the sponsor's number as directional, then validate with early usage.",
  },
];

export function EvidenceReviewScene() {
  return (
    <figure className={styles.insScene} aria-label="Evidence insights">
      <figcaption className={styles.insTitle}>
        <strong>Evidence insights</strong>
        <span aria-hidden>·</span>
        <span>Solutions Engineer</span>
        <Info size={12} aria-hidden />
      </figcaption>

      <div className={styles.insBody} data-motion-observe="evidence">
        <aside className={styles.insTimeline} aria-label="Evidence timeline">
          <p className={styles.insTimelineTitle}>Evidence timeline</p>
          <ol>
            {evidenceEvents.map((event) => (
              <li key={event.time}>
                <time dateTime={`2026-08-18T${event.time}`}>{event.time}</time>
                <span className={cn(styles.insDot, event.tone)} aria-hidden />
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                  <span className={styles.insMono}>{event.artifact}</span>
                </div>
              </li>
            ))}
          </ol>
          <a className={styles.insTimelineLink} href="/how-it-works">
            View full timeline
            <ArrowRight size={12} aria-hidden />
          </a>
        </aside>

        <section className={styles.insMain}>
          <header className={styles.insMainHeader}>
            <span className={styles.insCompetency}>
              <RefreshCw size={11} aria-hidden />
              Adaptation
            </span>
            <strong>Adapting the customer recommendation</strong>
            <span className={styles.insConfidence}>
              Evidence confidence
              <em className={styles.insConfidenceFrom}>Uncertain</em>
              <span aria-hidden>→</span>
              <em className={styles.insConfidenceTo}>Supported with limits</em>
            </span>
          </header>

          <div className={styles.insClaim}>
            <p className={styles.insLabel}>Claim</p>
            <p>
              The rollout plan was adapted to account for a six-week authentication
              security review, and the tradeoff was defended in the candidate&rsquo;s
              own words.
            </p>
          </div>

          <div className={styles.insLineageWrap}>
            <p className={styles.insLabel}>Evidence lineage</p>
            <div className={styles.insLineage}>
              <article className={cn(styles.insNode, styles.insNodeInitial)}>
                <strong>Initial plan</strong>
                <span className={styles.insMono}>rollout_plan.md · line 18</span>
                <p>Six-week timeline assumes no pre-launch security review.</p>
              </article>

              <article
                className={cn(styles.insNode, styles.insNodeSupport)}
                data-motion-item="evidence-node"
              >
                <span className={styles.insNodeTag}>Supporting</span>
                <strong>Revised plan</strong>
                <span className={styles.insMono}>rollout_plan.md · line 42</span>
                <p>Sandbox-first approach accommodates the six-week review.</p>
              </article>

              <article
                className={cn(styles.insNode, styles.insNodeDefense)}
                data-motion-item="evidence-node"
              >
                <span className={styles.insNodeTag}>Supporting</span>
                <strong>Defense answer</strong>
                <span className={styles.insMono}>oral defense · Q2</span>
                <p>Explained the tradeoff and why the constraint was retained.</p>
              </article>

              <article
                className={cn(styles.insNode, styles.insNodeCounter)}
                data-motion-item="evidence-node"
              >
                <span className={styles.insNodeTag}>Counterevidence</span>
                <strong>Shorter rollout</strong>
                <span className={styles.insMono}>sponsor_estimate.xlsx</span>
                <p>Sponsor estimate assumed no extended review.</p>
              </article>
            </div>
          </div>

          <div className={styles.insColumns}>
            <div>
              <p className={cn(styles.insLabel, styles.insLabelSupport)}>
                Supporting evidence
              </p>
              <ul className={styles.insList}>
                {supportingEvidence.map((item) => (
                  <li key={item.artifact}>
                    <span className={cn(styles.insDot, styles.insDotSupport)} aria-hidden />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span className={styles.insMono}>{item.artifact}</span>
                    </div>
                    <time>{item.time}</time>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className={cn(styles.insLabel, styles.insLabelCounter)}>
                Counterevidence
              </p>
              <ul className={styles.insList}>
                {counterEvidence.map((item) => (
                  <li key={item.artifact}>
                    <span className={cn(styles.insDot, styles.insDotCounter)} aria-hidden />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span className={styles.insMono}>{item.artifact}</span>
                    </div>
                    <time>{item.time}</time>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.insReview}>
              <p className={styles.insLabel}>Human review</p>
              <div className={styles.insReviewer}>
                <span aria-hidden>KP</span>
                <div>
                  <strong>K. Patel</strong>
                  Solutions Engineering lead
                </div>
                <span className={styles.insApproved}>
                  Approved
                  <CircleCheck size={11} aria-hidden />
                </span>
              </div>
              <p className={styles.insReviewNoteLabel}>Notes</p>
              <p className={styles.insReviewNote}>
                Tradeoffs explained clearly. Constraint retained and plan updated
                accordingly.
              </p>
              <p className={styles.insMono}>Reviewed 17:32</p>
              <a className={styles.insTimelineLink} href="/how-it-works">
                Open full evidence
                <ArrowRight size={12} aria-hidden />
              </a>
            </div>
          </div>
        </section>

        <article className={styles.insDefense} data-focal-layer>
          <header className={styles.insDefenseHeader}>
            <strong>Oral defense</strong>
            <span aria-hidden>·</span>
            <span>Question 2 of 3</span>
            <X size={13} aria-hidden />
          </header>

          <div className={styles.insDefenseBody}>
            <p className={styles.insLabel}>Artifact</p>
            <p className={styles.insDefenseArtifact}>
              <FileText size={11} aria-hidden />
              rollout_plan.md
              <em>line 14</em>
            </p>

            <p className={styles.insLabel}>Generated question</p>
            <p className={styles.insDefenseQuestion}>
              Your adoption assumption comes from the sponsor. How would you test it
              before using it to size the first production cohort?
            </p>

            <p className={styles.insLabel}>Live transcript</p>
            <ul className={styles.insDefenseTranscript}>
              {defenseTranscript.map((turn, index) => (
                <li key={index}>
                  <span
                    className={cn(
                      styles.insSpeaker,
                      turn.speaker === "Interviewer" && styles.insSpeakerInterviewer,
                    )}
                  >
                    {turn.speaker}
                  </span>
                  <p>{turn.text}</p>
                </li>
              ))}
            </ul>

            <div className={styles.insDefenseMeter}>
              <time dateTime="PT1M24S">01:24</time>
              <span className={styles.insWaveform} aria-hidden>
                {Array.from({ length: 34 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${4 + ((index * 7) % 5) * 2 + (index % 3) * 2}px`,
                    }}
                  />
                ))}
              </span>
              <span className={styles.insMono}>rollout_plan.md · line 14</span>
            </div>

            <div className={styles.insDefenseCompetency}>
              <p className={styles.insLabel}>Competency</p>
              <strong>Commercial judgment</strong>
            </div>
          </div>

          <footer className={styles.insDefenseFooter}>
            Evidence confidence
            <em className={styles.insConfidenceFrom}>Uncertain</em>
            <span aria-hidden>→</span>
            <em className={styles.insConfidenceTo}>Supported with limits</em>
          </footer>
        </article>
      </div>
    </figure>
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
