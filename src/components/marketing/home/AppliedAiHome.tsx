import {
  ArrowRight,
  Braces,
  Check,
  CircleDot,
  Eye,
  FileCheck2,
  Gauge,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { ButtonLink } from "@/components/marketing/ui";
import {
  APPLIED_AI_DISPLAY_ROLE,
  APPLIED_AI_PROOF_REQUIREMENTS,
  APPLIED_AI_ROLE_FAMILY,
  CANDIDATE_01_LABEL,
  createCandidate01PreWorkProfile,
  createFlagshipTargetedEpisode,
  deriveProofCoverage,
  CANDIDATE_01_PREWORK_AS_OF,
} from "@/lib/sim-engine/proof/coverage";
import {
  analyzeAppliedAiPassA,
  analyzeAppliedAiPassB,
} from "@/lib/sim-engine/proof/sandbox/applied-ai-analysis";
import { APPLIED_AI_ANALYSIS_FIXTURES } from "@/lib/sim-engine/proof/sandbox/applied-ai-analysis-fixtures";
import { APPLIED_AI_WORKFLOW_FIXTURE } from "@/lib/sim-engine/proof/sandbox/fixture";
import {
  APPLIED_AI_RECEIPT_FORMAT_VERSION,
  APPLIED_AI_TARGET_REQUIREMENTS,
} from "@/lib/sim-engine/proof/sandbox/review-outputs";
import { scriptedReviewLabel } from "@/lib/sim-engine/proof/sandbox/repositories";
import { createAppliedAiWorkspace } from "@/lib/sim-engine/proof/sandbox/applied-ai-workspace";
import styles from "./applied-ai-home.module.css";

const profile = createCandidate01PreWorkProfile();
const coverage = deriveProofCoverage(profile, CANDIDATE_01_PREWORK_AS_OF);
const episode = createFlagshipTargetedEpisode();
const baselineWorkspace = createAppliedAiWorkspace();
const strongFixture = APPLIED_AI_ANALYSIS_FIXTURES.find((fixture) => fixture.name === "A");

if (!strongFixture) {
  throw new Error("Applied AI fixture A is required for the public demonstration");
}

const passA = analyzeAppliedAiPassA(strongFixture.snapshot);
const passB = analyzeAppliedAiPassB(strongFixture.snapshot);
const scriptedReview = scriptedReviewLabel();
const targetIds = new Set<string>(episode.targetRequirementIds);
const supportedCount = APPLIED_AI_PROOF_REQUIREMENTS.filter(
  (requirement) => coverage.byRequirement[requirement.id].state !== "NOT_PROVEN",
).length;

const WORK_EVENTS = [
  {
    type: "EVAL_RUN",
    title: "Baseline captured",
    detail: "Synthetic evaluator snapshot linked to the starting workspace hash.",
    tone: "observed",
  },
  {
    type: "ARCHITECTURE_DECISION_COMMITTED",
    title: "Initial decision committed",
    detail: "The candidate records the system boundary before the changed fact arrives.",
    tone: "generated",
  },
  {
    type: "FACT_RELEASED",
    title: "LATENCY_001 released",
    detail: APPLIED_AI_WORKFLOW_FIXTURE.changedFact.body,
    tone: "changed",
  },
  {
    type: "CONFIG_REVISION",
    title: "Workflow revised",
    detail: "Model, call count, context, and retry controls change after the new constraint.",
    tone: "observed",
  },
  {
    type: "EVAL_RUN",
    title: "Post-fact evaluation captured",
    detail: "The same deterministic evaluator records the revised workspace result.",
    tone: "support",
  },
] as const;

const PROOF_NETWORK_FLOW = [
  "Role",
  "Proof requirements",
  "Existing evidence",
  "Proof gaps",
  "Targeted work",
  "Hiring decision",
] as const;

const EVENT_TYPES = new Set(WORK_EVENTS.map((event) => event.type));
const recordedEventIds = strongFixture.snapshot.events
  .filter((event) => EVENT_TYPES.has(String(event.event_type) as (typeof WORK_EVENTS)[number]["type"]))
  .map((event) => event.id);

function RequirementState({ requirementId }: { requirementId: string }) {
  if (targetIds.has(requirementId)) {
    return (
      <span className={styles.targetState}>
        <CircleDot size={14} aria-hidden />
        Verify in episode
      </span>
    );
  }
  return (
    <span className={styles.supportedState}>
      <Check size={14} aria-hidden />
      Existing proof
    </span>
  );
}

export default function AppliedAiHome() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy} data-hero-copy>
              <h1 id="home-title">The Proof of Work Network</h1>
              <p className={styles.heroLede}>
                Fydell shows what each candidate has already demonstrated,
                identifies what remains uncertain, and verifies the rest through
                realistic work—before you make the hire.
              </p>
              <div className={styles.actions}>
                <ButtonLink href="/sandbox/roles" variant="primary">
                  Explore live demo
                </ButtonLink>
                <ButtonLink href="/contact" variant="soft">
                  Hire with Fydell
                </ButtonLink>
              </div>
              <p className={styles.inviteNote}>
                Starting with engineers building production AI systems.
              </p>
            </div>

            <figure
              className={styles.heroInstrument}
              data-hero-stage
              data-product-stage
              aria-labelledby="hero-instrument-title"
            >
              <figcaption className={styles.instrumentBar}>
                <span>Proof coverage · fictional demo</span>
                <strong id="hero-instrument-title">{CANDIDATE_01_LABEL}</strong>
                <span>Role: {APPLIED_AI_DISPLAY_ROLE}</span>
              </figcaption>
              <div className={styles.heroInstrumentBody}>
                <div className={styles.coverageSummary}>
                  <p>Role requirements already supported</p>
                  <strong>
                    <span className="tabular-nums">{supportedCount}</span>
                    <small>of {APPLIED_AI_PROOF_REQUIREMENTS.length}</small>
                  </strong>
                  <div className={styles.coverageTrack} aria-hidden>
                    {APPLIED_AI_PROOF_REQUIREMENTS.map((requirement) => (
                      <span
                        key={requirement.id}
                        className={
                          coverage.byRequirement[requirement.id].state === "NOT_PROVEN"
                            ? styles.coverageEmpty
                            : styles.coverageFilled
                        }
                      />
                    ))}
                  </div>
                  <p className={styles.coverageQualifier}>
                    Existing proof reduces what this candidate still needs to demonstrate.
                  </p>
                </div>

                <ol className={styles.requirementOrbit} aria-label="Applied AI proof requirements">
                  {APPLIED_AI_PROOF_REQUIREMENTS.map((requirement) => (
                    <li
                      key={requirement.id}
                      className={targetIds.has(requirement.id) ? styles.orbitGap : undefined}
                    >
                      <span>{requirement.id.replace("PR-AI-", "")}</span>
                      <strong>{requirement.title}</strong>
                    </li>
                  ))}
                </ol>
              </div>
              <div className={styles.nextEpisode} data-focal-layer>
                <div>
                  <span>Next best step</span>
                  <strong>One targeted workflow-hardening episode</strong>
                  <p>{episode.targetRequirementIds.join(" · ")}</p>
                </div>
                <ArrowRight size={20} aria-hidden />
              </div>
            </figure>
          </div>
        </div>
      </section>

      <section className={styles.wedgeChapter} aria-labelledby="wedge-title">
        <div className={styles.container}>
          <div className={styles.wedgeComposition}>
            <div>
              <p className={styles.wedgeRole}>{APPLIED_AI_ROLE_FAMILY}</p>
              <h2 id="wedge-title">Starting where hiring uncertainty is exploding.</h2>
            </div>
            <div>
              <p>
                Startups need engineers who can ship production AI systems—not
                simply talk about agents, RAG, evals, or model APIs.
              </p>
              <p>
                The flagship demo uses an {APPLIED_AI_DISPLAY_ROLE} because the
                gap between a polished claim and production judgment is especially
                expensive here.
              </p>
              <a href="/contact">
                Hiring an AI engineer? Talk to us <ArrowRight size={16} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.networkChapter} aria-labelledby="network-title">
        <div className={styles.container}>
          <header className={styles.networkHeader}>
            <h2 id="network-title">Every role is a set of things that must be proven.</h2>
            <p>
              Tell Fydell what someone needs to be able to do. We show you what
              each candidate has already proven, what remains uncertain, and
              verify the rest through real work.
            </p>
          </header>
          <ol className={styles.networkFlow} aria-label="Fydell proof-of-work flow">
            {PROOF_NETWORK_FLOW.map((step) => (
              <li key={step}>
                <span>{step}</span>
                <ArrowRight size={17} aria-hidden />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className={styles.coverageChapter}
        data-product-chapter
        aria-labelledby="coverage-title"
      >
        <div className={styles.container}>
          <header className={styles.coverageHeader} data-chapter-head>
            <div>
              <h2 id="coverage-title" data-chapter-heading>
                Verify only what is missing.
              </h2>
              <p data-chapter-copy>
                The role proof spec has eight requirements. Candidate 01 is an
                explicit fictional fixture: six have source support, while four
                exact requirements remain targets because two are partial and two
                are not yet proven.
              </p>
            </div>
            <dl className={styles.coverageKey}>
              <div>
                <dt>Role family</dt>
                <dd>{APPLIED_AI_ROLE_FAMILY}</dd>
              </div>
              <div>
                <dt>Instrument</dt>
                <dd>{episode.instrumentVersion}</dd>
              </div>
            </dl>
          </header>

          <div className={styles.requirementLedger} data-product-stage>
            <div className={styles.ledgerHead} aria-hidden>
              <span>Requirement</span>
              <span>What must be demonstrated</span>
              <span>Coverage decision</span>
            </div>
            <ol>
              {APPLIED_AI_PROOF_REQUIREMENTS.map((requirement) => (
                <li key={requirement.id}>
                  <span className={styles.requirementId}>{requirement.id}</span>
                  <span className={styles.requirementTitle}>
                    <strong>{requirement.title}</strong>
                    <small>{requirement.description}</small>
                  </span>
                  <RequirementState requirementId={requirement.id} />
                </li>
              ))}
            </ol>
            <footer className={styles.ledgerFooter}>
              <ShieldCheck size={18} aria-hidden />
              <span>
                Target only {episode.targetRequirementIds.join(", ")}. Observe the
                other four requirements secondarily without pretending one episode
                proves everything.
              </span>
            </footer>
          </div>
        </div>
      </section>

      <section
        className={styles.workChapter}
        data-product-chapter
        aria-labelledby="work-title"
      >
        <div className={styles.container}>
          <div className={styles.workComposition}>
            <div className={styles.workbench} data-product-stage>
              <header className={styles.workbenchBar}>
                <span>Fictional sandbox demo</span>
                <strong>Harden an enterprise AI workflow</strong>
                <span>Structured controls only</span>
              </header>
              <div className={styles.workbenchMain}>
                <div className={styles.configPlane}>
                  <div className={styles.planeHeading}>
                    <Braces size={16} aria-hidden />
                    <span>Starting workspace</span>
                  </div>
                  <pre aria-label="Starting workflow configuration">
                    <code>{`routing: ${baselineWorkspace.config.routing}
model: ${baselineWorkspace.config.model}
modelCalls: ${baselineWorkspace.config.modelCalls}
contextTokens: ${baselineWorkspace.config.contextTokens}
retryMode: ${baselineWorkspace.config.retryMode}
maxRetries: ${baselineWorkspace.config.maxRetries}
semanticValidation: ${baselineWorkspace.config.semanticValidation}
idempotencyKey: ${baselineWorkspace.config.idempotencyKey}`}</code>
                  </pre>
                  <p>Proposal code is recorded but not executed by this sandbox.</p>
                </div>

                <div className={styles.factPlane} data-focal-layer>
                  <div className={styles.factHeading}>
                    <TriangleAlert size={17} aria-hidden />
                    <span>{APPLIED_AI_WORKFLOW_FIXTURE.changedFact.id}</span>
                  </div>
                  <h3>{APPLIED_AI_WORKFLOW_FIXTURE.changedFact.title}</h3>
                  <p>{APPLIED_AI_WORKFLOW_FIXTURE.changedFact.body}</p>
                  <dl>
                    <div>
                      <dt>Release condition</dt>
                      <dd>After architecture commitment</dd>
                    </div>
                    <div>
                      <dt>Runtime</dt>
                      <dd>Deterministic synthetic evaluator</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <ol className={styles.eventTrail} aria-label="Recorded episode trail">
                {WORK_EVENTS.map((event, index) => (
                  <li key={`${event.type}-${index}`}>
                    <span className={styles[event.tone]} aria-hidden />
                    <div>
                      <code>{event.type}</code>
                      <strong>{event.title}</strong>
                      <p>{event.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <header className={styles.workCopy} data-chapter-head>
              <h2 id="work-title" data-chapter-heading>
                Give the gap real work.
              </h2>
              <p data-chapter-copy>
                A consequential production constraint arrives after the candidate
                commits an architecture. The useful signal is what they revise,
                what they preserve, and whether the same evaluator supports the
                new claim.
              </p>
              <ul>
                <li>
                  <Eye size={18} aria-hidden />
                  <span>
                    <strong>Observe the sequence</strong>
                    Baseline, commitment, changed fact, revision, and re-evaluation stay ordered.
                  </span>
                </li>
                <li>
                  <Gauge size={18} aria-hidden />
                  <span>
                    <strong>Make the tradeoff measurable</strong>
                    LATENCY_001 cannot be satisfied by sacrificing critical quality or authorization.
                  </span>
                </li>
                <li>
                  <FileCheck2 size={18} aria-hidden />
                  <span>
                    <strong>Keep the limit attached</strong>
                    This fixture does not execute proposal code or observe production traffic.
                  </span>
                </li>
              </ul>
            </header>
          </div>
        </div>
      </section>

      <section
        className={styles.evidenceChapter}
        data-product-chapter
        aria-labelledby="evidence-title"
      >
        <div className={styles.container}>
          <header className={styles.evidenceHeader} data-chapter-head>
            <h2 id="evidence-title" data-chapter-heading>
              A claim is only as strong as its trail.
            </h2>
            <p data-chapter-copy>
              Candidate action becomes evaluator observation, then a review-required
              claim, then a defense question. The decision brief keeps source events,
              counterevidence, and limits attached.
            </p>
          </header>

          <div className={styles.evidenceFlow} data-product-stage>
            <ol className={styles.flowSteps}>
              <li>
                <Braces size={18} aria-hidden />
                <span><strong>Candidate action</strong>Typed workspace mutation</span>
              </li>
              <li>
                <Eye size={18} aria-hidden />
                <span><strong>Evaluator observation</strong>Before/after snapshot</span>
              </li>
              <li>
                <FileCheck2 size={18} aria-hidden />
                <span><strong>Reviewed claim</strong>Support and counterevidence</span>
              </li>
              <li>
                <MessageSquareText size={18} aria-hidden />
                <span><strong>Candidate defense</strong>Targeted production limit</span>
              </li>
            </ol>

            <div className={styles.claimMatrix}>
              {passA.claims.map((claim) => (
                <article key={claim.competency}>
                  <header>
                    <span>{claim.competency}</span>
                    <strong>{claim.direction}</strong>
                  </header>
                  <p>{claim.claim}</p>
                  <dl>
                    <div>
                      <dt>Supporting events</dt>
                      <dd>{claim.supporting_event_ids.length}</dd>
                    </div>
                    <div>
                      <dt>Counterevidence</dt>
                      <dd>{claim.counterevidence_event_ids.length}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className={styles.defenseStrip} data-focal-layer>
              <div>
                <span>Generated defense question</span>
                <strong>{passA.defensePrompt}</strong>
              </div>
              <div>
                <span>Fixture candidate response</span>
                <p>{APPLIED_AI_WORKFLOW_FIXTURE.fixtureDefenseAnswer}</p>
              </div>
            </div>

            <div className={styles.decisionBrief}>
              <div>
                <span>Reviewed decision brief</span>
                <strong>{passB.brief.recommendation}</strong>
                <p>{passB.brief.why}</p>
              </div>
              <div>
                <span>Interview plan</span>
                <p>{passB.interviewPlan.confirm[0] ?? passB.interviewPlan.investigate[0]}</p>
              </div>
              <small>
                {scriptedReview.label}. {scriptedReview.disclaimer} A human hiring
                review is still required outside this demo.
              </small>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.receiptChapter}
        data-product-chapter
        aria-labelledby="receipt-title"
      >
        <div className={styles.container}>
          <div className={styles.receiptComposition}>
            <div className={styles.receiptCopy} data-chapter-head>
              <p>{APPLIED_AI_ROLE_FAMILY}</p>
              <h2 id="receipt-title" data-chapter-heading>
                The work stays inspectable.
              </h2>
              <p data-chapter-copy>
                The candidate keeps a portable Work Receipt: what was targeted,
                what changed, which events support each claim, how review resolved,
                and what the episode still cannot establish.
              </p>
              <div className={styles.receiptActions}>
                <ButtonLink href="/sandbox/receipts" variant="primary">
                  Open the fictional receipt demo
                </ButtonLink>
                <ButtonLink href="/contact" variant="soft">
                  Discuss a private pilot
                </ButtonLink>
              </div>
              <small>
                Demo data only. A Work Receipt is not an independent credential or
                a tamper-proof attestation.
              </small>
            </div>

            <article className={styles.receiptPaper} data-product-stage data-focal-layer>
              <header>
                <div>
                  <ReceiptText size={21} aria-hidden />
                  <strong>Applied AI Work Receipt</strong>
                </div>
                <span>Candidate-owned · fictional demo</span>
              </header>
              <dl className={styles.receiptMeta}>
                <div>
                  <dt>Role</dt>
                  <dd>{APPLIED_AI_DISPLAY_ROLE}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{APPLIED_AI_RECEIPT_FORMAT_VERSION}</dd>
                </div>
                <div>
                  <dt>Changed fact</dt>
                  <dd>{APPLIED_AI_WORKFLOW_FIXTURE.changedFact.id}</dd>
                </div>
              </dl>
              <section>
                <h3>Targeted proof requirements</h3>
                <p>{APPLIED_AI_TARGET_REQUIREMENTS.join(" · ")}</p>
              </section>
              <section>
                <h3>Reviewed claims</h3>
                <ol>
                  {passA.claims.map((claim) => (
                    <li key={claim.competency}>
                      <span>{claim.competency}</span>
                      <strong>{claim.direction}</strong>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>Source event IDs</h3>
                <p className={styles.eventIds}>{recordedEventIds.join(" · ")}</p>
              </section>
              <section>
                <h3>Known limits</h3>
                <ul>
                  <li>Deterministic synthetic evaluator; no production traffic observed.</li>
                  <li>Proposal code recorded, not executed by the sandbox.</li>
                  <li>Review state and provenance are inspectable; no predictive claim is made.</li>
                </ul>
              </section>
              <footer>
                <ShieldCheck size={16} aria-hidden />
                <span>Proof, review state, and limitations travel together.</span>
              </footer>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
